import type { SessionIdentity, StoredSessionIdentity } from '@/lib/supabase/sessionGate';
import { sameIdentity } from './recovery';

export function quiesceAuthRuntime(ops: {
  endPersistence: () => void; setOwner: (id: null) => void; setReminderOwner: (id: null) => void; clearCache: () => void;
}): void {
  ops.endPersistence();
  ops.setOwner(null);
  ops.setReminderOwner(null);
  ops.clearCache();
}

export function alignVerifiedOwner(id: string | null, ops: {
  setOwner: (id: string | null) => void; setReminderOwner: (id: string | null) => void;
}): void {
  ops.setOwner(id);
  ops.setReminderOwner(id);
}

/** A queued operation must not act on a different signed-in account. */
export async function runForAccount<T>(
  gate: { runExclusive: <R>(kind: 'maintain', operation: () => Promise<R>) => Promise<R>;
    storedSessionIdentity: () => Promise<StoredSessionIdentity>; isRetired: (id: string) => boolean },
  actor: SessionIdentity | null,
  operation: () => Promise<T>,
): Promise<T> {
  return gate.runExclusive('maintain', async () => {
    const stored = await gate.storedSessionIdentity();
    if (!actor || gate.isRetired(actor.userId) || stored.kind !== 'present' || !sameIdentity(stored.identity, actor)) {
      throw new Error('Your session changed. Sign in again and try again.');
    }
    return operation();
  });
}

/**
 * Backoff for a read that could not be verified. The last value repeats, so an
 * offline device keeps trying rather than giving up until the next SDK event
 * (which can be an hour away).
 */
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000] as const;

/**
 * Auth events are hints. Only the newest successful storage-backed read applies.
 *
 * A pass that proves nothing (a failed read, a throw, or a session the gate
 * will not show) leaves the current state alone — but it also schedules its own
 * retry, because waiting for the next SDK event can take an hour and the UI
 * would otherwise keep showing an account the SDK no longer holds. Any newer
 * call cancels the pending retry, so only one pass is ever in flight.
 */
export function createSessionReconciler<S extends { user: { id: string } }>(ops: {
  readSession: () => Promise<{ session: S | null; error: unknown }>;
  readIdentity: () => Promise<StoredSessionIdentity>;
  isRetired: (id: string) => boolean;
  currentUser: () => string | null;
  apply: (session: S | null) => void;
  ready: (verifiedEmpty: boolean) => void;
  /** The stored value is unusable; the gate rejects writes against it. */
  removeCorrupt: () => Promise<unknown>;
  schedule?: (fn: () => void, ms: number) => () => void;
  retryDelaysMs?: readonly number[];
}) {
  const schedule = ops.schedule ?? ((fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  });
  const delays = ops.retryDelaysMs ?? RETRY_DELAYS_MS;
  let generation = 0;
  let mounted = true;
  let attempts = 0;
  let cancelRetry: (() => void) | null = null;
  const cancelPending = (): void => {
    if (!cancelRetry) return;
    const cancel = cancelRetry;
    cancelRetry = null;
    cancel();
  };
  const backoff = (): number => delays[Math.min(attempts, delays.length - 1)];
  const reconcile = (): void => {
    cancelPending();
    const request = ++generation;
    void Promise.resolve().then(async () => {
      let verifiedEmpty = false;
      // Unverified means nothing was learned: keep the current state and ask
      // again later instead of waiting for the next event.
      let unverified = false;
      try {
        const result = await ops.readSession();
        if (!mounted || request !== generation) return;
        if (result.error) {
          unverified = true;
        } else {
          const candidate = result.session;
          if (candidate && ops.isRetired(candidate.user.id)) {
            const current = ops.currentUser();
            if (current === candidate.user.id) ops.apply(null);
            return;
          }
          if (candidate === null) {
            const raw = await ops.readIdentity();
            if (!mounted || request !== generation) return;
            if (raw.kind === 'unreadable') {
              unverified = true;
            } else if (raw.kind === 'corrupt') {
              // The SDK reads this as no session and the gate refuses writes
              // against it, so nothing can ever use it: drop it and re-read.
              try {
                await ops.removeCorrupt();
                if (!mounted || request !== generation) return;
                reconcile();
                return;
              } catch {
                // A failed removal would loop; back off instead.
                unverified = true;
              }
            } else if (raw.kind === 'present') {
              if (!ops.isRetired(raw.identity.userId)) {
                // A live session the SDK will not hand over: not evidence of an
                // empty device, and not something to apply.
                unverified = true;
              } else {
                // A masked retired session is not evidence that an active B
                // signed out, so nothing is applied.
                verifiedEmpty = true;
                return;
              }
            } else {
              // Verified absent: the device really is signed out.
              verifiedEmpty = true;
            }
          }
          // Nothing is applied when the pass proved nothing: the current state
          // stands until a read can be believed.
          if (!unverified) ops.apply(candidate);
        }
      } catch {
        // A failed/unverified read preserves the current session.
        unverified = true;
      } finally {
        if (mounted && request === generation) {
          if (unverified) {
            // The delay is chosen before the counter moves, so the first retry
            // waits the first delay.
            const delay = backoff();
            attempts += 1;
            cancelRetry = schedule(() => { cancelRetry = null; reconcile(); }, delay);
          } else {
            attempts = 0;
          }
          ops.ready(verifiedEmpty);
        }
      }
    });
  };
  return {
    reconcile,
    retire: (userId: string): void => {
      generation += 1;
      if (ops.currentUser() === userId) {
        try { ops.apply(null); } catch { /* Never throw into the gate. */ }
      }
      // The invalidated read may have been the only event for a newer user.
      // Re-read so that user can still be admitted after A is quarantined.
      reconcile();
    },
    dispose: (): void => { mounted = false; generation += 1; cancelPending(); },
  };
}

import type { SessionIdentity, StoredSessionIdentity } from '@/lib/supabase/sessionGate';

export function sameIdentity(a: SessionIdentity | null, b: SessionIdentity | null): boolean {
  return !!a && !!b && a.userId === b.userId && a.sessionId === b.sessionId;
}

export type ExchangeResult =
  | { kind: 'success'; identity: SessionIdentity }
  | { kind: 'failed' | 'consumed' | 'signed-in' };

/**
 * What an executor reports back. `'signed-in'` is a refusal, not a failure of
 * the link: a live session occupies the device, so the code was left untouched.
 */
export type ExchangeOutcome = SessionIdentity | null | 'signed-in';

/** Shared by the root watcher and callback route. Successful codes are single-use. */
export function createExchangeCoordinator(execute: (code: string) => Promise<ExchangeOutcome>) {
  const pending = new Map<string, Promise<ExchangeResult>>();
  const completed = new Map<string, SessionIdentity>();
  const consumed = new Set<string>();
  return {
    exchange(code: string): Promise<ExchangeResult> {
      if (consumed.has(code)) return Promise.resolve({ kind: 'consumed' });
      const current = pending.get(code);
      if (current) return current;
      const work: Promise<ExchangeResult> = Promise.resolve().then(() => execute(code)).then((outcome) => {
        // Only a success is cached; a refusal is dropped with the failures so
        // the same link is reconsidered after the person signs out.
        if (outcome === 'signed-in') { pending.delete(code); return { kind: 'signed-in' }; }
        if (!outcome) { pending.delete(code); return { kind: 'failed' }; }
        completed.set(code, outcome);
        return { kind: 'success', identity: outcome };
      }, () => { pending.delete(code); return { kind: 'failed' }; });
      pending.set(code, work);
      return work;
    },
    claim(code: string, identity: SessionIdentity): boolean {
      if (consumed.has(code) || !sameIdentity(completed.get(code) ?? null, identity)) return false;
      consumed.add(code);
      completed.delete(code);
      pending.delete(code);
      return true;
    },
  };
}

export function callbackReadiness(
  result: ExchangeResult | null, current: SessionIdentity | null, isRetired: (id: string) => boolean,
): 'wait' | 'failed' | 'ready' {
  if (!result) return 'wait';
  if (result.kind !== 'success' || isRetired(result.identity.userId)) return 'failed';
  return sameIdentity(result.identity, current) ? 'ready' : 'wait';
}

/** Recheck raw storage inside the auth queue before one-time navigation. */
export async function finalizeAuthCallback(
  code: string, result: ExchangeResult | null, current: SessionIdentity | null, reset: boolean,
  ops: {
    isRetired: (id: string) => boolean; stillCurrent: () => boolean;
    runExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
    readIdentity: () => Promise<StoredSessionIdentity>;
    claim: (code: string, identity: SessionIdentity) => boolean;
    startRecovery: (identity: SessionIdentity) => boolean;
  },
): Promise<'wait' | 'failed' | 'ready'> {
  const readiness = callbackReadiness(result, current, ops.isRetired);
  if (readiness !== 'ready' || !result || result.kind !== 'success') return readiness;
  try {
    return await ops.runExclusive(async () => {
      const raw = await ops.readIdentity();
      if (!ops.stillCurrent()) return 'wait';
      if (raw.kind !== 'present' || !sameIdentity(raw.identity, result.identity) || ops.isRetired(result.identity.userId)) return 'failed';
      if (!ops.claim(code, result.identity)) return 'failed';
      if (reset && !ops.startRecovery(result.identity)) return 'failed';
      return 'ready';
    });
  } catch {
    return 'failed';
  }
}

let recovery: SessionIdentity | null = null;
const listeners = new Set<() => void>();
function emit(): void { listeners.forEach((listener) => { try { listener(); } catch { /* Do not disrupt auth. */ } }); }

export function getRecoveryIdentity(): SessionIdentity | null { return recovery; }
export function getServerRecoveryIdentity(): null { return null; }
export function subscribeRecovery(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function endPasswordRecovery(): void {
  if (!recovery) return;
  recovery = null;
  emit();
}
export function startPasswordRecovery(identity: SessionIdentity, isRetired: (id: string) => boolean): boolean {
  if (isRetired(identity.userId)) return false;
  recovery = { ...identity };
  emit();
  return true;
}
export function syncRecoveryIdentity(identity: SessionIdentity | null): void {
  if (recovery && !sameIdentity(recovery, identity)) endPasswordRecovery();
}
export function retireRecovery(userId: string): void {
  if (recovery?.userId === userId) endPasswordRecovery();
}
export function recoveryAuthorized(current: SessionIdentity | null, isRetired: (id: string) => boolean): boolean {
  return !!recovery && !isRetired(recovery.userId) && sameIdentity(recovery, current);
}

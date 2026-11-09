import type { SessionIdentity } from '@/lib/supabase/sessionGate';
import { runForAccount } from './sessionTransitions';

export const SIGN_OUT_FAILED_MESSAGE = 'Couldn’t sign out on this device. Try again.';

/**
 * Everything sign-out needs, injected so the decision logic stays testable and
 * free of React or the live client.
 */
export interface SignOutDeps {
  gate: Parameters<typeof runForAccount>[0] & {
    removeSessionIf: (match: { userId: string } | { corrupt: true }) => Promise<'removed' | 'unchanged' | 'unreadable'>;
  };
  isOnline: () => boolean;
  clearDeviceTraces: (userId: string) => Promise<void>;
  signOut: (options?: { scope: 'local' }) => Promise<{ error: unknown }>;
  reconcile: () => void;
}

/**
 * Ends the session on this device (AUTH-2). Calling the SDK alone is not
 * enough: with an expired access token and no connection it retries the refresh
 * for ~30 s and then leaves the stored session in place, so the person stays
 * signed in on a device they asked to sign out of. Here the stored session is
 * removed directly — after re-reading it so a session that changed underneath
 * is never touched — and the SDK is called afterwards only to finish its own
 * teardown (code verifier, SIGNED_OUT event), which cannot attempt a refresh
 * once nothing is stored. `reconcile` runs after the exclusive slot so the
 * provider clears the cache for the account that just left.
 *
 * The stored identity is read BEFORE the safety check because the reconciler
 * may not have caught up: if the device now holds nothing, a different account
 * or an unusable value, the button must not deadlock on "Your session changed"
 * when the person's only way out is to sign out.
 */
export async function signOutAccount(captured: SessionIdentity | null, deps: SignOutDeps): Promise<void> {
  if (captured) {
    const stored = await deps.gate.storedSessionIdentity();
    // Nothing of this account is left here; the UI just needs to catch up.
    if (stored.kind === 'absent') {
      deps.reconcile();
      return;
    }
    if (stored.kind === 'corrupt') {
      // Unusable to everyone: drop it so a later read can be believed.
      await deps.gate.removeSessionIf({ corrupt: true });
      deps.reconcile();
      return;
    }
    if (stored.kind === 'unreadable') throw new Error(SIGN_OUT_FAILED_MESSAGE);
    if (stored.identity.userId !== captured.userId) {
      // An A-initiated sign-out must never act on B. Let the provider reconcile
      // so the UI switches to the account actually stored — which clears A's
      // cache on the way.
      deps.reconcile();
      return;
    }
  }
  // The same account may have re-authenticated: sign out whatever session is
  // stored now, not the one the screen was rendered with.
  const actor = captured ? await currentActor(deps, captured) : null;
  await runForAccount(deps.gate, actor, async () => {
    const account = actor as SessionIdentity;
    await deps.clearDeviceTraces(account.userId);
    if (deps.isOnline()) {
      const { error } = await deps.signOut();
      // The SDK removed the session and emitted SIGNED_OUT.
      if (!error) return;
    }
    const current = await deps.gate.storedSessionIdentity();
    // Already gone on this device: nothing left to end.
    if (current.kind === 'absent') return;
    if (current.kind !== 'present' || current.identity.userId !== account.userId) {
      throw new Error(SIGN_OUT_FAILED_MESSAGE);
    }
    const removed = await deps.gate.removeSessionIf({ userId: account.userId });
    if (removed === 'unreadable') throw new Error(SIGN_OUT_FAILED_MESSAGE);
    try {
      await deps.signOut({ scope: 'local' });
    } catch {
      // Storage cleanup is best effort; the session is already gone.
    }
    const after = await deps.gate.storedSessionIdentity();
    if (after.kind === 'present' && after.identity.userId === account.userId) {
      throw new Error(SIGN_OUT_FAILED_MESSAGE);
    }
  });
  deps.reconcile();
}

/** The stored session for this account, which may be newer than the rendered one. */
async function currentActor(deps: SignOutDeps, captured: SessionIdentity): Promise<SessionIdentity | null> {
  const stored = await deps.gate.storedSessionIdentity();
  if (stored.kind === 'present' && stored.identity.userId === captured.userId) return stored.identity;
  return captured;
}
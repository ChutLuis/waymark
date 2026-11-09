import { sessionIdentityFromSession, type SessionIdentity, type StoredSessionIdentity } from '@/lib/supabase/sessionGate';

/** `'signed-in'` means a live session already occupies this device. */
export type ExchangeAttempt = SessionIdentity | null | 'signed-in';

/**
 * Exchanges a PKCE code, but never on top of a live session. The code is
 * opaque, so whose link it is cannot be known before exchanging it: with B's
 * code verifier left on the device by an earlier request, B's link would
 * otherwise replace A's session mid-use. Refusing while a non-retired session
 * is stored is therefore the only safe rule — a signed-in person resets their
 * password by signing out first, and the forgot-password screen is only
 * reachable signed out anyway.
 */
export async function exchangeOnThisDevice(
  code: string,
  deps: {
    gate: {
      runExclusive: <T>(kind: 'establish', operation: () => Promise<T>) => Promise<T>;
      storedSessionIdentity: () => Promise<StoredSessionIdentity>;
      isRetired: (id: string) => boolean;
    };
    exchangeCodeForSession: (code: string) => Promise<{ data: { session: unknown }; error: unknown }>;
    onEstablished: (identity: SessionIdentity) => void;
  },
): Promise<ExchangeAttempt> {
  return deps.gate.runExclusive('establish', async () => {
    const stored = await deps.gate.storedSessionIdentity();
    // A live session means this link is not for the device as it stands. The
    // verifier is left alone: signing out removes it.
    if (stored.kind === 'present' && !deps.gate.isRetired(stored.identity.userId)) return 'signed-in';
    // Unreadable storage proves nothing, so an exchange cannot be justified.
    if (stored.kind === 'unreadable') return null;
    const result = await deps.exchangeCodeForSession(code);
    if (result.error || !result.data.session) return null;
    const identity = sessionIdentityFromSession(result.data.session);
    if (!identity || deps.gate.isRetired(identity.userId)) return null;
    deps.onEstablished(identity);
    return identity;
  });
}
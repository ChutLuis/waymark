/**
 * Holds an invite code captured from a deep link (…/join?code=XXXX) while the
 * user is signed out, so it survives the bounce through /sign-in and can be
 * replayed once a session exists (INV-2 / B1). In-memory only: a cold start
 * re-reads the launch URL via Linking.getInitialURL, so surviving process
 * death isn't needed.
 */
let pendingCode: string | null = null;

export function setPendingInviteCode(code: string): void {
  pendingCode = code;
}

/** Returns the stashed code (if any) and clears it — replayed at most once. */
export function takePendingInviteCode(): string | null {
  const code = pendingCode;
  pendingCode = null;
  return code;
}

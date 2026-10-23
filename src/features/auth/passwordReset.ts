/**
 * Pure rules for the password-reset flow, kept out of hooks.ts so Vitest can
 * cover them without the Supabase client.
 */

/** Supabase lets an account ask for a reset link about once a minute. */
export const RESET_COOLDOWN_MS = 60_000;

export const OFFLINE_MESSAGE = "Couldn't reach Waymark. Check your connection and try again.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Whether to ask the server for another link. Inside the cooldown the server
 * refuses an existing account, and supabase-js then discards this device's
 * PKCE verifier, which kills the link already on its way. So a repeat inside
 * the window only shows the confirmation again.
 */
export function shouldSendReset(lastSentAt: number | undefined, now: number): boolean {
  return lastSentAt === undefined || now - lastSentAt >= RESET_COOLDOWN_MS;
}

/** The parts of a supabase-js auth error these rules read. */
export interface AuthErrorShape {
  code?: string;
  name?: string;
}

export interface PasswordUpdateFailure {
  message: string;
  /** The recovery session is gone; the person needs a new link. */
  expired: boolean;
}

const EXPIRED_CODES = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'user_not_found',
  'bad_jwt',
  'reauthentication_needed',
  'reauthentication_not_valid',
]);

/** Why a new password wasn't saved, in words for the reset screen. */
export function updatePasswordFailure(error: AuthErrorShape, offline: boolean): PasswordUpdateFailure {
  if (offline) return { message: OFFLINE_MESSAGE, expired: false };
  if (error.name === 'AuthSessionMissingError' || (error.code !== undefined && EXPIRED_CODES.has(error.code))) {
    return { message: 'Your reset link has expired. Request a new one.', expired: true };
  }
  if (error.code === 'same_password') {
    return { message: 'That’s the password you already have. Choose a new one.', expired: false };
  }
  if (error.code === 'weak_password') {
    return { message: 'That password is too easy to guess. Try a longer one.', expired: false };
  }
  return { message: 'Couldn’t save your new password. Try again.', expired: false };
}

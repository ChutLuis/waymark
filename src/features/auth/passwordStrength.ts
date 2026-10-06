/**
 * Password strength scoring for the sign-up meter.
 *
 * Levels: 0 (empty, no label), 1 WEAK … 4 STRONG. A password under the 8
 * character minimum is always the lowest level, whatever character types it
 * contains.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** One label per level, in a single style (see StrengthMeter). */
export const STRENGTH_LABELS = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG'] as const;

export function strengthOf(password: string): number {
  if (password.length === 0) return 0;
  // Below the minimum length, character variety earns nothing.
  if (password.length < MIN_PASSWORD_LENGTH) return 1;

  let score = 1;
  if (/\d/.test(password)) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  return Math.min(4, score);
}
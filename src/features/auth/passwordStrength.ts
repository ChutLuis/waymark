import { MIN_PASSWORD_LENGTH } from '@/lib/validation/schemas';

/**
 * Password strength scoring for the meter on sign-up and reset.
 *
 * Levels: 0 (empty, no label), 1 WEAK … 4 STRONG. A password under the 8
 * character minimum is always the lowest level, whatever character types it
 * contains.
 */
export { MIN_PASSWORD_LENGTH };

/** One label per level, in a single style (see StrengthMeter). */
export const STRENGTH_LABELS = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG'] as const;

/** What the meter says before anything is typed. */
export const LENGTH_HINT = `${MIN_PASSWORD_LENGTH}+ CHARACTERS`;

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

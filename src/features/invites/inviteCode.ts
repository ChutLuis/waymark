/**
 * Invite codes as typed or pasted, as pure functions, shared by the code
 * field and both code screens.
 */

/** The 8 characters of an invite code, grouped 4 + 4. */
export const INVITE_CODE_LENGTH = 8;

/**
 * A code inside a pasted invite: "…Enter invite code: VK4T 9QMD" in the shared
 * message, or "…join?code=VK4T9QMD" in a link. The last match wins, because
 * the message ends with its code and a trip's name comes earlier.
 */
const CODE_IN_TEXT = /\bcode\s*[:=]?\s*([a-z0-9]{4})[\s·-]?([a-z0-9]{4})\b/gi;

/**
 * The invite code in what was typed or pasted: the code inside a pasted invite
 * message or link, otherwise the letters and digits, uppercased and cut to
 * eight ("abcd efgh" → "ABCDEFGH"). The input must not cap its own length: a
 * native maxLength cuts "ABCD EFGH" to "ABCD EFG" before the space is dropped.
 */
export function sanitizeInviteCode(text: string): string {
  // NFKC folds full-width letters and digits (some keyboards type them) to ASCII.
  const normalised = text.normalize('NFKC');
  const shared = [...normalised.matchAll(CODE_IN_TEXT)].pop();
  if (shared) return `${shared[1]}${shared[2]}`.toUpperCase();
  return normalised.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH);
}

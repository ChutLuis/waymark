/**
 * The copy for a write that failed (leaving or deleting a trip, joining one),
 * as pure functions.
 */

import { isNetworkError, messageOf } from '@/lib/errors';

export const OFFLINE_MESSAGE = 'You’re offline — check your connection and try again.';

export { isNetworkError } from '@/lib/errors';

/**
 * SQLSTATEs the app's database functions raise with sentences written for
 * people: P0001 (plain `raise exception`), 22023 (invalid input, e.g.
 * create_trip's checks) and 42501 (a refusal such as the owner leaving).
 */
const PEOPLE_CODES = new Set(['P0001', '22023', '42501']);

/** Postgres's own wording for RLS and grant refusals, which is not for people. */
const SYSTEM_WORDING = /row-level security|permission denied|violates|relation "/i;

/**
 * A message a database function raised for people, as a sentence. Null for
 * anything else, whose text is not written for people.
 */
export function serverMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !PEOPLE_CODES.has(code)) return null;
  const text = messageOf(error).trim();
  if (!text || SYSTEM_WORDING.test(text)) return null;
  const sentence = `${text[0].toUpperCase()}${text.slice(1)}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/** What to show when a write fails: offline, the server's own words, or `fallback`. */
export function failureMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) return OFFLINE_MESSAGE;
  return serverMessage(error) ?? fallback;
}

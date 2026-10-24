/** Pure helpers for reading errors thrown by fetch and supabase-js. */

/** An error's message, whatever shape it came in. */
export function messageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return '';
  const { message } = error as { message?: unknown };
  return typeof message === 'string' ? message : '';
}

/** A request that never reached the server (React Native, Chrome, Firefox and Safari wordings). */
export function isNetworkError(error: unknown): boolean {
  return /network request failed|failed to fetch|networkerror|load failed/i.test(messageOf(error));
}

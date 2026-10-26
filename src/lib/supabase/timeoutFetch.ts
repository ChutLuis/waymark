/**
 * A fetch for supabase-js that gives up on a database or auth request that
 * gets no response, instead of waiting for the operating system (which can
 * take minutes). Queued writes run one at a time per trip, so one stalled
 * request would otherwise hold back every change queued behind it.
 *
 * Storage (photo uploads on a slow connection) and Edge Functions (account
 * deletion) can legitimately take longer and are left alone. Pure: no React
 * Native imports, so Vitest covers it directly.
 */

// Spelled out rather than `typeof fetch`: which global fetch type wins (DOM,
// Node or React Native, whose input has no URL) depends on how node_modules
// is laid out, and CI's differs from a local install.
type FetchInput = RequestInfo | URL;
export type Fetch = (input: FetchInput, init?: RequestInit) => Promise<Response>;

export const REQUEST_TIMEOUT_MS = 20_000;

/** PostgREST (tables and RPCs) and Auth. */
const TIMED_PATHS = ['/rest/v1/', '/auth/v1/'];

/**
 * Worded as a dropped connection, so `isNetworkError` (lib/errors.ts) treats
 * it as one: a queued write retries or waits for the connection, and a screen
 * shows its offline copy.
 */
export class RequestTimeoutError extends TypeError {
  constructor(ms: number) {
    super(`Network request failed: no response in ${ms / 1000} s`);
    this.name = 'RequestTimeoutError';
  }
}

function urlOf(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function withRequestTimeout(baseFetch: Fetch, ms: number = REQUEST_TIMEOUT_MS): Fetch {
  return (input, init) => {
    if (!TIMED_PATHS.some((path) => urlOf(input).includes(path))) return baseFetch(input, init);

    // The caller's own signal (supabase-js's abortSignal) still cancels.
    const controller = new AbortController();
    const outer = init?.signal ?? null;
    const forwardAbort = () => controller.abort(outer?.reason);
    if (outer?.aborted) controller.abort(outer.reason);
    else outer?.addEventListener('abort', forwardAbort, { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);

    return baseFetch(input, { ...init, signal: controller.signal })
      .catch((error: unknown) => {
        throw timedOut ? new RequestTimeoutError(ms) : error;
      })
      .finally(() => {
        clearTimeout(timer);
        outer?.removeEventListener('abort', forwardAbort);
      });
  };
}

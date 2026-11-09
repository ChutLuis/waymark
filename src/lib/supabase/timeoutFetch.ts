/**
 * A fetch for supabase-js that gives up on a database, auth or Storage
 * control request that gets no response, instead of waiting for the operating
 * system (which can take minutes). Queued writes run one at a time per trip,
 * and trip deletion takes the session gate once per round, so one stalled
 * request would otherwise hold back every change queued behind it.
 *
 * Bounded: PostgREST (tables and RPCs), Auth, and Storage listing and removal
 * (small control requests, including each round of cover cleanup during
 * deletion). Left alone: Storage uploads (a photo on a slow connection can
 * legitimately take a long time), downloads, signed URLs, and Edge Functions
 * (account deletion), none of which should be cut off. Pure: no React Native
 * imports, so Vitest covers it directly.
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
 * Storage control calls (storage-js `list()` and `remove()`), matched on the
 * request method as well as the path so uploads and downloads through the same
 * namespace stay untimed:
 * - list → POST /storage/v1/object/list/<bucket>
 * - remove → DELETE /storage/v1/object/<bucket>, body { prefixes }
 * An upload is a POST or PUT to /storage/v1/object/<bucket>/<path>, and a
 * download is a GET; neither matches. Signed URLs live under other paths.
 */
function isTimedStorageRequest(url: string, method: string): boolean {
  if (!url.includes('/storage/v1/')) return false;
  if (method === 'POST') return url.includes('/object/list/');
  if (method === 'DELETE') return url.split('?')[0].includes('/storage/v1/object/');
  return false;
}

function methodOf(input: FetchInput, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  // A Request carries its own method; `init` overrides it when both are given.
  if (typeof input !== 'string' && !(input instanceof URL)) return input.method.toUpperCase();
  return 'GET';
}

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
    const url = urlOf(input);
    if (!TIMED_PATHS.some((path) => url.includes(path)) && !isTimedStorageRequest(url, methodOf(input, init))) {
      return baseFetch(input, init);
    }

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

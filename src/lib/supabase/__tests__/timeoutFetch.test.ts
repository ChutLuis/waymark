import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isNetworkError } from '@/lib/errors';
import { RequestTimeoutError, withRequestTimeout } from '../timeoutFetch';

const BASE = 'https://project.supabase.co';

/** A fetch that never answers until its signal aborts, like a stalled request. */
function stalledFetch() {
  return vi.fn((_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    });
  });
}

describe('withRequestTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fails a database request with no response as a dropped connection', async () => {
    const timed = withRequestTimeout(stalledFetch() as unknown as typeof fetch, 20_000);
    const request = timed(`${BASE}/rest/v1/trips?select=*`);
    const settled = expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(20_000);
    await settled;
    await request.catch((error: unknown) => {
      expect(isNetworkError(error)).toBe(true);
    });
  });

  it('bounds RPCs and auth requests too', async () => {
    const base = stalledFetch();
    const timed = withRequestTimeout(base as unknown as typeof fetch, 1_000);
    const rpc = timed(new URL(`${BASE}/rest/v1/rpc/create_trip`), { method: 'POST' });
    const auth = timed(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST' });
    const both = Promise.allSettled([rpc, auth]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await both).map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });

  it('leaves storage uploads and Edge Functions without a limit', async () => {
    const base = stalledFetch();
    const timed = withRequestTimeout(base as unknown as typeof fetch, 1_000);
    let settled = false;
    void timed(`${BASE}/storage/v1/object/trip-covers/t/cover.jpg`, { method: 'POST' }).finally(() => {
      settled = true;
    });
    void timed(`${BASE}/functions/v1/delete-account`, { method: 'POST' }).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
    expect(base.mock.calls.every(([, init]) => init?.signal === undefined)).toBe(true);
  });

  it('passes a response through and stops the timer', async () => {
    const response = new Response('[]', { status: 200 });
    const base = vi.fn(async () => response);
    const timed = withRequestTimeout(base as unknown as typeof fetch, 1_000);
    await expect(timed(`${BASE}/rest/v1/trips`)).resolves.toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the caller's own abort, reported as the caller's", async () => {
    const timed = withRequestTimeout(stalledFetch() as unknown as typeof fetch, 20_000);
    const caller = new AbortController();
    const request = timed(`${BASE}/rest/v1/trips`, { signal: caller.signal });
    caller.abort();
    await expect(request).rejects.toThrow('Aborted');
    await expect(request).rejects.not.toBeInstanceOf(RequestTimeoutError);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isNetworkError } from '@/lib/errors';
import { RequestTimeoutError, withRequestTimeout, type Fetch } from '../timeoutFetch';

const BASE = 'https://project.supabase.co';

/** A fetch that never answers until its signal aborts, like a stalled request. */
function stalledFetch() {
  return vi.fn((_input: Parameters<Fetch>[0], init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
    });
  });
}

describe('withRequestTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fails a database request with no response as a dropped connection', async () => {
    const timed = withRequestTimeout(stalledFetch() as unknown as Fetch, 20_000);
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
    const timed = withRequestTimeout(base as unknown as Fetch, 1_000);
    const rpc = timed(new URL(`${BASE}/rest/v1/rpc/create_trip`), { method: 'POST' });
    const auth = timed(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST' });
    const both = Promise.allSettled([rpc, auth]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await both).map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });

  it('leaves storage uploads and Edge Functions without a limit', async () => {
    const base = stalledFetch();
    const timed = withRequestTimeout(base as unknown as Fetch, 1_000);
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

  it('bounds a Storage listing (POST /object/list/<bucket>)', async () => {
    const request = withRequestTimeout(stalledFetch() as unknown as Fetch, 1_000)(
      `${BASE}/storage/v1/object/list/trip-covers`,
      { method: 'POST' },
    );
    const settled = expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await settled;
  });

  it('bounds a Storage removal (DELETE /object/<bucket> with prefixes)', async () => {
    const request = withRequestTimeout(stalledFetch() as unknown as Fetch, 1_000)(
      `${BASE}/storage/v1/object/trip-covers`,
      { method: 'DELETE', body: JSON.stringify({ prefixes: ['t/a.jpg'] }) },
    );
    const settled = expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await settled;
  });

  it('leaves Storage uploads and downloads without a limit', async () => {
    const base = stalledFetch();
    const timed = withRequestTimeout(base as unknown as Fetch, 1_000);
    const requests = [
      // An upload to an object path, and a download of one.
      timed(`${BASE}/storage/v1/object/trip-covers/t/cover.jpg`, { method: 'POST' }),
      timed(`${BASE}/storage/v1/object/trip-covers/t/cover.jpg`, { method: 'PUT' }),
      timed(`${BASE}/storage/v1/object/trip-covers/t/cover.jpg`),
      timed(`${BASE}/storage/v1/object/authenticated/trip-covers/t/cover.jpg`),
      // A listing reached by GET, and a signed-URL call, are not control calls.
      timed(`${BASE}/storage/v1/object/list/trip-covers`),
      timed(`${BASE}/storage/v1/object/sign/trip-covers/t/cover.jpg`, { method: 'POST' }),
    ];
    const settled = Promise.allSettled(requests);
    let done = false;
    void settled.finally(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(done).toBe(false);
    expect(base.mock.calls.every(([, init]) => init?.signal === undefined)).toBe(true);
  });

  it('reads the method from a Request, and lets init override it', async () => {
    const base = stalledFetch();
    const timed = withRequestTimeout(base as unknown as Fetch, 1_000);
    const asRequest = timed(new Request(`${BASE}/storage/v1/object/trip-covers`, { method: 'DELETE' }));
    const settled = expect(asRequest).rejects.toBeInstanceOf(RequestTimeoutError);
    // The same Request with an init method of GET is a download: untimed.
    let downloadSettled = false;
    void timed(new Request(`${BASE}/storage/v1/object/trip-covers`, { method: 'DELETE' }), { method: 'GET' })
      .finally(() => { downloadSettled = true; });
    await vi.advanceTimersByTimeAsync(60_000);
    await settled;
    expect(downloadSettled).toBe(false);
    expect(base.mock.calls.map(([, init]) => init?.signal !== undefined)).toEqual([true, false]);
  });

  it('passes a response through and stops the timer', async () => {
    const response = new Response('[]', { status: 200 });
    const base = vi.fn(async () => response);
    const timed = withRequestTimeout(base as unknown as Fetch, 1_000);
    await expect(timed(`${BASE}/rest/v1/trips`)).resolves.toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the caller's own abort, reported as the caller's", async () => {
    const timed = withRequestTimeout(stalledFetch() as unknown as Fetch, 20_000);
    const caller = new AbortController();
    const request = timed(`${BASE}/rest/v1/trips`, { signal: caller.signal });
    caller.abort();
    await expect(request).rejects.toThrow('Aborted');
    await expect(request).rejects.not.toBeInstanceOf(RequestTimeoutError);
  });
});

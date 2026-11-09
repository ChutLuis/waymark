import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import {
  createSessionGate, defaultAuthStorageKey, isSessionGateError, sessionIdentityFromSession, SessionGateError, SessionWriteRejectedError,
  type AsyncKeyValueStorage,
} from '../sessionGate';

const KEY = 'session';
const jwt = (userId: string, sessionId: string, extra: Record<string, unknown> = {}) =>
  `e30.${Buffer.from(JSON.stringify({ sub: userId, session_id: sessionId, ...extra })).toString('base64url')}.`;
const session = (userId: string, sessionId: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ access_token: jwt(userId, sessionId, extra), user: { id: userId } });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function fixture(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(KEY, initial);
  const inner: AsyncKeyValueStorage = {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
  return { values, inner, gate: createSessionGate(inner, KEY) };
}

afterEach(() => vi.useRealTimers());

describe('session storage gate', () => {
  it('derives the pinned SDK default key', () => {
    expect(defaultAuthStorageKey('https://project.example.invalid/path')).toBe('sb-project-auth-token');
  });

  it('derives only validated coordination identity from an in-memory session', () => {
    expect(sessionIdentityFromSession({ access_token: jwt('A', 'A1', { text: '日本 🌍' }), user: { id: 'A' } }))
      .toEqual({ userId: 'A', sessionId: 'A1' });
    expect(sessionIdentityFromSession({ access_token: jwt('A', 'A1'), user: { id: 'B' } })).toBeNull();
    expect(sessionIdentityFromSession(null)).toBeNull();
  });

  it('serializes whole adapter writes with later reads and auxiliary operations', async () => {
    const { inner, gate } = fixture();
    const entered = deferred<void>();
    const release = deferred<void>();
    vi.mocked(inner.setItem).mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const write = gate.storage.setItem('other', 'value');
    await entered.promise;
    const read = gate.storage.getItem('other');
    const remove = gate.storage.removeItem('other');
    expect(inner.getItem).not.toHaveBeenCalled();
    expect(inner.removeItem).not.toHaveBeenCalled();
    release.resolve();
    await Promise.all([write, read, remove]);
    expect(vi.mocked(inner.setItem).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(inner.getItem).mock.invocationCallOrder[0]);
    expect(vi.mocked(inner.getItem).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(inner.removeItem).mock.invocationCallOrder[0]);
  });

  it('rejects invalid writes, mismatched users and malformed UTF-8 without writing', async () => {
    const { inner, gate } = fixture();
    const malformed = ['not-json', '{}', JSON.stringify({ access_token: 'a._w.', user: { id: 'A' } }),
      JSON.stringify({ access_token: 'a.A.', user: { id: 'A' } }),
      JSON.stringify({ access_token: jwt('A', 'S'), user: { id: 'B' } }),
      JSON.stringify({ access_token: jwt('A', ''), user: { id: 'A' } }),
      JSON.stringify({ access_token: jwt('A', 'S') })];
    for (const value of malformed) {
      await expect(gate.runExclusive('establish', () => gate.storage.setItem(KEY, value)))
        .rejects.toMatchObject({ name: 'AuthRetryableFetchError', reason: 'invalid' });
    }
    expect(inner.setItem).not.toHaveBeenCalled();
  });

  it('reads legacy identity and tolerates Unicode claims', async () => {
    const legacy = JSON.stringify({ access_token: jwt('A', 'S', { text: '日本 🌍' }) });
    const { gate } = fixture(legacy);
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'S' } });
    await gate.runExclusive('maintain', () => gate.storage.setItem(KEY, session('A', 'S', { text: '日本 🌍' })));
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'S' } });
  });

  it('rejects an unreadable current value and never writes it blindly', async () => {
    const { inner, gate } = fixture();
    vi.mocked(inner.getItem).mockRejectedValue(new Error('synthetic sensitive text'));
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'unreadable' });
    await expect(gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'S'))))
      .rejects.toMatchObject({ name: 'AuthRetryableFetchError', reason: 'unreadable' });
    expect(inner.setItem).not.toHaveBeenCalled();
  });

  it('permits same-session refresh and new established sessions, but never a known stale session', async () => {
    const { gate } = fixture();
    await expect(gate.runExclusive('maintain', () => gate.storage.setItem(KEY, session('A', 'A1'))))
      .rejects.toMatchObject({ reason: 'not-established' });
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1')));
    await gate.runExclusive('maintain', () => gate.storage.setItem(KEY, session('A', 'A1')));
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A2')));
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('B', 'B1')));
    await expect(gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1'))))
      .rejects.toMatchObject({ reason: 'stale' });
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A3')));
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'A3' } });
  });

  it('rejects a known session even after its stored value was removed', async () => {
    const { gate } = fixture(session('A', 'A1'));
    await gate.storage.getItem(KEY);
    await gate.storage.removeItem(KEY);
    await expect(gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1'))))
      .rejects.toMatchObject({ reason: 'stale' });
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
  });

  it('allows only a new established session to replace corrupt storage', async () => {
    const { gate } = fixture('invalid');
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'corrupt' });
    await expect(gate.runExclusive('maintain', () => gate.storage.setItem(KEY, session('A', 'A1'))))
      .rejects.toMatchObject({ reason: 'not-established' });
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1')));
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'A1' } });
  });

  it('retires synchronously, tolerates listener failures and masks the stored identity', async () => {
    const { gate } = fixture(session('A', 'A1'));
    const listener = vi.fn(() => { throw new Error('ignored'); });
    const unsubscribe = gate.onRetire(listener);
    gate.retire('A');
    gate.retire('A');
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(gate.isRetired('A')).toBe(true);
    expect(await gate.storage.getItem(KEY)).toBeNull();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'A1' } });
    await expect(gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A2'))))
      .rejects.toMatchObject({ reason: 'retired' });
  });

  it.each([false, true])('removes a write retired in flight and masks any residue (remove fails: %s)', async (removeFails) => {
    const { inner, values, gate } = fixture();
    const entered = deferred<void>();
    const release = deferred<void>();
    vi.mocked(inner.setItem).mockImplementationOnce(async (key, value) => {
      entered.resolve(); await release.promise; values.set(key, value);
    });
    if (removeFails) vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error('synthetic sensitive text'));
    const write = gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1')));
    await entered.promise;
    gate.retire('A');
    release.resolve();
    await expect(write).rejects.toMatchObject({ reason: removeFails ? 'retired-residue' : 'retired' });
    expect(await gate.storage.getItem(KEY)).toBeNull();
    expect((await gate.storedSessionIdentity()).kind).toBe(removeFails ? 'present' : 'absent');
  });

  it('cleans a partially written value when the inner write fails after retirement', async () => {
    const { inner, values, gate } = fixture();
    const entered = deferred<void>();
    const release = deferred<void>();
    vi.mocked(inner.setItem).mockImplementationOnce(async (key, value) => {
      entered.resolve();
      await release.promise;
      values.set(key, value);
      throw new Error('synthetic sensitive text');
    });
    const write = gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1')));
    await entered.promise;
    gate.retire('A');
    release.resolve();
    await expect(write).rejects.toMatchObject({ reason: 'retired' });
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
  });

  it('conditionally removes only the requested identity or corrupt data', async () => {
    const { inner, values, gate } = fixture(session('B', 'B1'));
    expect(await gate.removeSessionIf({ userId: 'A' })).toBe('unchanged');
    expect(inner.removeItem).not.toHaveBeenCalled();
    expect(await gate.removeSessionIf({ userId: 'B' })).toBe('removed');
    values.set(KEY, 'invalid');
    expect(await gate.removeSessionIf({ userId: 'A' })).toBe('unchanged');
    expect(await gate.removeSessionIf({ corrupt: true })).toBe('removed');
    vi.mocked(inner.getItem).mockRejectedValueOnce(new Error());
    expect(await gate.removeSessionIf({ corrupt: true })).toBe('unreadable');
  });

  it('uses constant error messages and reason-only diagnostics', async () => {
    const { inner, gate } = fixture();
    vi.mocked(inner.getItem).mockRejectedValue(new Error('synthetic sensitive text'));
    const error = await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1'))).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SessionWriteRejectedError);
    expect(JSON.stringify(error)).not.toContain('synthetic sensitive text');
    expect(String(error)).not.toContain('synthetic sensitive text');
    expect(isSessionGateError(error)).toBe(true);
    expect(isAuthError(error)).toBe(true);
    expect(isAuthRetryableFetchError(error)).toBe(true);
    expect(error).toMatchObject({ name: 'AuthRetryableFetchError', status: 0, reason: 'unreadable' });
    expect('cause' in (error as object)).toBe(false);
  });

  it('marks every controlled reason as a sanitized SDK-retryable gate error', () => {
    const errors = [
      ...(['invalid', 'retired', 'unreadable', 'stale', 'not-established', 'retired-residue'] as const)
        .map((reason) => new SessionWriteRejectedError(reason)),
      ...(['wait-timeout', 'storage-failure', 'busy'] as const).map((reason) => new SessionGateError(reason)),
    ];
    for (const error of errors) {
      expect(error).toBeInstanceOf(SessionGateError);
      expect(isSessionGateError(error)).toBe(true);
      expect(isAuthError(error)).toBe(true);
      expect(isAuthRetryableFetchError(error)).toBe(true);
      expect(error.name).toBe('AuthRetryableFetchError');
      expect(error.status).toBe(0);
      expect(error.toJSON()).toEqual({
        name: 'AuthRetryableFetchError', message: 'Could not safely access the session. Please try again.',
        status: 0, code: undefined,
      });
      expect('cause' in error).toBe(false);
    }
    expect(isSessionGateError(new Error())).toBe(false);
  });

  it('sanitizes direct native get, set and remove failures', async () => {
    const { inner, gate } = fixture();
    const secret = 'synthetic native failure';
    vi.mocked(inner.getItem).mockRejectedValueOnce(new Error(secret));
    vi.mocked(inner.setItem).mockRejectedValueOnce(new Error(secret));
    vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error(secret));
    for (const operation of [
      () => gate.storage.getItem('other'), () => gate.storage.setItem('other', 'value'),
      () => gate.storage.removeItem('other'),
    ]) {
      const error: unknown = await operation().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SessionGateError);
      expect(isAuthRetryableFetchError(error)).toBe(true);
      expect(error).toMatchObject({ reason: 'storage-failure', status: 0 });
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(String(error)).not.toContain(secret);
      expect('cause' in (error as object)).toBe(false);
    }
  });

  it('sanitizes session-key write and conditional-removal failures', async () => {
    const { inner, gate } = fixture(session('A', 'A1'));
    const nativeText = 'synthetic native failure';
    vi.mocked(inner.setItem).mockRejectedValueOnce(new Error(nativeText));
    vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error(nativeText));
    const operations = [
      () => gate.runExclusive('maintain', () => gate.storage.setItem(KEY, session('A', 'A1'))),
      () => gate.removeSessionIf({ userId: 'A' }),
    ];
    for (const operation of operations) {
      const error: unknown = await operation().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SessionGateError);
      expect(error).toMatchObject({ reason: 'storage-failure', status: 0 });
      expect(isAuthRetryableFetchError(error)).toBe(true);
      expect(JSON.stringify(error)).not.toContain(nativeText);
      expect(String(error)).not.toContain(nativeText);
    }
  });

  it('cancels a queued storage waiter without later executing it', async () => {
    vi.useFakeTimers();
    const { inner } = fixture();
    const gate = createSessionGate(inner, KEY, { storageWaitMs: 15_000 });
    const entered = deferred<void>();
    const release = deferred<void>();
    vi.mocked(inner.setItem).mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const active = gate.storage.setItem('other', 'value');
    await entered.promise;
    const waiting = gate.storage.getItem('other');
    const rejected = expect(waiting).rejects.toMatchObject({ name: 'AuthRetryableFetchError', reason: 'wait-timeout' });
    await vi.advanceTimersByTimeAsync(15_001);
    await rejected;
    release.resolve();
    await active;
    await gate.storage.removeItem('other');
    expect(inner.getItem).not.toHaveBeenCalled();
  });

  it('holds active exclusive work past 60 seconds; cancelled waiters never run', async () => {
    vi.useFakeTimers();
    const { inner } = fixture();
    const gate = createSessionGate(inner, KEY, { exclusiveWaitMs: 45_000 });
    const entered = deferred<void>();
    const release = deferred<void>();
    const active = gate.runExclusive('establish', async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    const cancelledFn = vi.fn(async () => {});
    const cancelled = gate.runExclusive('maintain', cancelledFn);
    const rejected = expect(cancelled).rejects.toMatchObject({ reason: 'busy', name: 'AuthRetryableFetchError' });
    await vi.advanceTimersByTimeAsync(60_000);
    await rejected;
    const laterFn = vi.fn(async () => {});
    const later = gate.runExclusive('maintain', laterFn);
    await vi.advanceTimersByTimeAsync(1);
    expect(cancelledFn).not.toHaveBeenCalled();
    expect(laterFn).not.toHaveBeenCalled();
    release.resolve();
    await Promise.all([active, later]);
    expect(cancelledFn).not.toHaveBeenCalled();
    expect(laterFn).toHaveBeenCalledOnce();
  });

  it('releases the exclusive queue after an operation rejects', async () => {
    const { gate } = fixture();
    const original = new Error('synthetic');
    await expect(gate.runExclusive('maintain', async () => { throw original; })).rejects.toBe(original);
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, session('A', 'A1')));
    expect((await gate.storedSessionIdentity()).kind).toBe('present');
  });
});

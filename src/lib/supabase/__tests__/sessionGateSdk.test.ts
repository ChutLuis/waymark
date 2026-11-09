import { AuthClient, isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionGate, isSessionGateError, type AsyncKeyValueStorage } from '../sessionGate';
import { finishAccountDeletion, type FinishDeletionOperations } from '@/features/auth/deleteAccount';

const KEY = 'synthetic-session';
const clients = new Set<InstanceType<typeof AuthClient>>();
afterEach(async () => {
  vi.useRealTimers();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.all([...clients].map((auth) => auth.dispose()));
  clients.clear();
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function makeSession(userId: string, sessionId: string, expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const claims = { sub: userId, session_id: sessionId, exp: expiresAt, note: '旅 🌍' };
  return {
    access_token: `e30.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`,
    refresh_token: `synthetic-refresh-${sessionId}`,
    expires_at: expiresAt,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: userId, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01' },
  };
}
function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
async function finish(auth: InstanceType<typeof AuthClient>) {
  // Give unhandled SDK rejections a turn to surface before disposal.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await auth.dispose();
}

function fixture(fetcher: typeof fetch, initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(KEY, initial);
  const inner: AsyncKeyValueStorage = {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
  const gate = createSessionGate(inner, KEY);
  const auth = new AuthClient({
    url: 'https://auth.invalid', storageKey: KEY, storage: gate.storage, fetch: fetcher,
    persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce',
  });
  clients.add(auth);
  return { values, inner, gate, auth };
}

function finishOperations(gate: ReturnType<typeof createSessionGate>, auth: InstanceType<typeof AuthClient>, active: boolean): FinishDeletionOperations {
  return {
    wasActive: () => active,
    retire: gate.retire,
    runExclusive: (fn) => gate.runExclusive('maintain', fn),
    readIdentity: gate.storedSessionIdentity,
    signOut: () => auth.signOut({ scope: 'local' }),
    removeSessionIf: (userId) => gate.removeSessionIf({ userId }),
    purgeReminders: async () => {}, removePersisted: async () => {},
    isBusy: (error) => isSessionGateError(error) && error.reason === 'busy',
    startNotice: () => {}, updateNotice: () => {},
  };
}

describe('session gate with the installed AuthClient', () => {
  it('restores an existing session without an establish window', async () => {
    const raw = JSON.stringify(makeSession('A', 'A1'));
    const { values, inner, gate, auth } = fixture(async () => { throw new Error('unexpected synthetic request'); }, raw);
    await auth.initialize();
    expect((await auth.getSession()).data.session?.user.id).toBe('A');
    expect(values.get(KEY)).toBe(raw);
    expect(inner.setItem).not.toHaveBeenCalled();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'A1' } });
    await finish(auth);
  });

  it('does not sign out B if B was established before A finalization', async () => {
    const { gate, auth } = fixture(async (input) => {
      if (String(input).includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    expect((await gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }))).error).toBeNull();
    const signOut = vi.spyOn(auth, 'signOut');
    const result = await finishAccountDeletion('A', 'confirmed', finishOperations(gate, auth, false));
    expect(result.deviceCleanup).toBe('other-account');
    expect(signOut).not.toHaveBeenCalled();
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    await finish(auth);
  });

  it('queues B while A cleanup is in progress and permits B afterward', async () => {
    const entered = deferred<void>(); const release = deferred<void>();
    let bRequests = 0;
    const { values, inner, gate, auth } = fixture(async (input) => {
      if (String(input).includes('grant_type=password')) { bRequests += 1; return response(makeSession('B', 'B1')); }
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.removeItem).mockImplementationOnce(async (key) => {
      entered.resolve(); await release.promise; values.delete(key);
    });
    const deletion = finishAccountDeletion('A', 'confirmed', finishOperations(gate, auth, true));
    await entered.promise;
    const b = gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }));
    await Promise.resolve();
    expect(bRequests).toBe(0);
    release.resolve();
    expect((await deletion).deviceCleanup).toBe('removed');
    expect((await b).error).toBeNull();
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    await finish(auth);
  });

  it('allows B to sign in after A cleanup has completed', async () => {
    const { gate, auth } = fixture(async (input) => {
      if (String(input).includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    expect((await finishAccountDeletion('A', 'confirmed', finishOperations(gate, auth, true))).deviceCleanup).toBe('removed');
    expect((await gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }))).error).toBeNull();
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    await finish(auth);
  });

  it('finishes a confirmed deletion after an SDK storage failure using conditional removal', async () => {
    const { inner, gate, auth } = fixture(async () => { throw new Error('unexpected synthetic request'); });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error('synthetic native failure'));
    const ops = finishOperations(gate, auth, true);
    const updateNotice = vi.fn(); ops.updateNotice = updateNotice;
    const result = await finishAccountDeletion('A', 'confirmed', ops);
    expect(result).toEqual({ outcome: 'confirmed', deviceCleanup: 'removed', deviceWarning: true });
    expect(updateNotice).toHaveBeenCalledWith('A', true);
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    expect((await auth.getSession()).data.session).toBeNull();
    await finish(auth);
  });

  it('serializes actual signup, reset verifier writes and PKCE exchange', async () => {
    const entered = deferred<void>(); const release = deferred<void>(); const requests: string[] = [];
    const { gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.endsWith('/signup')) { requests.push('signup'); return response({ user: { id: 'C' } }); }
      if (url.endsWith('/recover')) { requests.push('recover'); return response({}); }
      if (url.includes('grant_type=pkce')) { requests.push('pkce'); return response(makeSession('B', 'B1')); }
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    const held = gate.runExclusive('maintain', async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    const signup = gate.runExclusive('establish', () => auth.signUp({ email: 'c@example.invalid', password: 'synthetic' }));
    const reset = gate.runExclusive('maintain', () => auth.resetPasswordForEmail('b@example.invalid'));
    const exchange = gate.runExclusive('establish', () => auth.exchangeCodeForSession('synthetic-code'));
    await Promise.resolve();
    expect(requests).toEqual([]);
    release.resolve(); await held;
    expect((await signup).data.session).toBeNull();
    expect((await reset).error).toBeNull();
    expect((await exchange).data.session?.user.id).toBe('B');
    expect(requests).toEqual(['signup', 'recover', 'pkce']);
    await finish(auth);
  });

  it('holds cleanup past 60 seconds; a cancelled B never runs and a later B succeeds', async () => {
    const entered = deferred<void>(); const release = deferred<void>();
    let bRequests = 0;
    const { values, inner, gate, auth } = fixture(async (input) => {
      if (String(input).includes('grant_type=password')) { bRequests += 1; return response(makeSession('B', 'B1')); }
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.removeItem).mockImplementationOnce(async (key) => {
      entered.resolve(); await release.promise; values.delete(key);
    });
    vi.useFakeTimers();
    try {
      const deletion = finishAccountDeletion('A', 'confirmed', finishOperations(gate, auth, true));
      await entered.promise;
      const cancelled = gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }));
      const rejected = expect(cancelled).rejects.toMatchObject({ reason: 'busy' });
      await vi.advanceTimersByTimeAsync(60_000);
      await rejected;
      const later = gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }));
      await Promise.resolve();
      expect(bRequests).toBe(0);
      release.resolve();
      expect((await deletion).deviceCleanup).toBe('removed');
      expect((await later).error).toBeNull();
      expect(bRequests).toBe(1);
      expect((await auth.getSession()).data.session?.user.id).toBe('B');
    } finally {
      release.resolve();
      vi.useRealTimers();
      await finish(auth);
    }
  });

  it('orders a held initial A refresh write before B sign-in', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const initial = deferred<void>();
    const bRequest = deferred<void>();
    const bWriteQueued = deferred<void>();
    const { values, inner, gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) return response(makeSession('A', 'A1'));
      if (url.includes('grant_type=password')) { bRequest.resolve(); return response(makeSession('B', 'B1')); }
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    values.set(KEY, JSON.stringify(makeSession('A', 'A1', 1)));
    vi.mocked(inner.setItem).mockImplementationOnce(async (key, value) => {
      entered.resolve(); await release.promise; values.set(key, value);
    });
    const setItem = gate.storage.setItem;
    vi.spyOn(gate.storage, 'setItem').mockImplementation((key, value) => {
      if (key === KEY && value.includes('"id":"B"')) bWriteQueued.resolve();
      return setItem(key, value);
    });
    const subscription = auth.onAuthStateChange((event) => { if (event === 'INITIAL_SESSION') initial.resolve(); });
    await entered.promise;
    let bFinished = false;
    const b = gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }))
      .then((result) => { bFinished = true; return result; });
    await bRequest.promise;
    await bWriteQueued.promise;
    expect(bFinished).toBe(false);
    expect(inner.setItem).toHaveBeenCalledTimes(1);
    release.resolve();
    expect((await b).error).toBeNull();
    await initial.promise;
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    expect(inner.setItem).toHaveBeenCalledTimes(2);
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    subscription.data.subscription.unsubscribe();
    await finish(auth);
  });

  it('discards a held A refresh response after B signs in', async () => {
    const requested = deferred<void>();
    const release = deferred<void>();
    const initial = deferred<void>();
    const { values, gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) { requested.resolve(); await release.promise; return response(makeSession('A', 'A1')); }
      if (url.includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    values.set(KEY, JSON.stringify(makeSession('A', 'A1', 1)));
    const subscription = auth.onAuthStateChange((event) => { if (event === 'INITIAL_SESSION') initial.resolve(); });
    await requested.promise;
    expect((await gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }))).error).toBeNull();
    release.resolve();
    await initial.promise;
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    subscription.data.subscription.unsubscribe();
    await finish(auth);
  });

  it('rejects a known stale refresh that began with a null storage snapshot', async () => {
    const requested = deferred<void>();
    const release = deferred<void>();
    const { gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) { requested.resolve(); await release.promise; return response(makeSession('A', 'A1')); }
      if (url.includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    await gate.storage.removeItem(KEY);
    const stale = auth.refreshSession({ refresh_token: 'synthetic-refresh-A1' });
    await requested.promise;
    expect((await gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }))).error).toBeNull();
    release.resolve();
    const result = await stale;
    expect(result.error).toMatchObject({ reason: 'stale', name: 'AuthRetryableFetchError', status: 0 });
    expect(isSessionGateError(result.error)).toBe(true);
    expect(isAuthError(result.error)).toBe(true);
    expect(isAuthRetryableFetchError(result.error)).toBe(true);
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    await finish(auth);
  });

  it('removes a retired A write before allowing B to commit', async () => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const { values, inner, gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) return response(makeSession('A', 'A1'));
      if (url.includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.setItem).mockClear();
    vi.mocked(inner.setItem).mockImplementationOnce(async (key, value) => {
      entered.resolve(); await release.promise; values.set(key, value);
    });
    const refresh = auth.refreshSession({ refresh_token: 'synthetic-refresh-A1' });
    await entered.promise;
    gate.retire('A');
    const b = gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }));
    release.resolve();
    const result = await refresh;
    expect(result.error).toMatchObject({ reason: 'retired', name: 'AuthRetryableFetchError', status: 0 });
    expect(isSessionGateError(result.error)).toBe(true);
    expect(isAuthRetryableFetchError(result.error)).toBe(true);
    expect((await b).error).toBeNull();
    expect(vi.mocked(inner.removeItem).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(inner.setItem).mock.invocationCallOrder[1]);
    expect((await auth.getSession()).data.session?.user.id).toBe('B');
    await finish(auth);
  });

  it('handles signup, sessionless signup, PKCE exchange and update with public SDK methods', async () => {
    let signupSession = true;
    const { gate, auth } = fixture(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/signup')) return response(signupSession ? makeSession('A', 'A1') : { user: { id: 'C' } });
      if (url.includes('grant_type=pkce')) return response(makeSession('B', 'B1'));
      if (url.endsWith('/user') && init?.method === 'PUT') return response({ user: makeSession('B', 'B1').user });
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    const signedUp = await gate.runExclusive('establish', () => auth.signUp({ email: 'a@example.invalid', password: 'synthetic' }));
    expect(signedUp.data.session?.user.id).toBe('A');
    signupSession = false;
    const sessionless = await gate.runExclusive('establish', () => auth.signUp({ email: 'c@example.invalid', password: 'synthetic' }));
    expect(sessionless.data.session).toBeNull();
    expect((await auth.getSession()).data.session?.user.id).toBe('A');
    await gate.storage.setItem(`${KEY}-code-verifier`, JSON.stringify('synthetic-verifier'));
    const exchanged = await gate.runExclusive('establish', () => auth.exchangeCodeForSession('synthetic-code'));
    expect(exchanged.error).toBeNull();
    expect(exchanged.data.session?.user.id).toBe('B');
    const updated = await gate.runExclusive('maintain', () => auth.updateUser({ password: 'synthetic-new' }));
    expect(updated.error).toBeNull();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    await finish(auth);
  });

  it('does not remove an expired B when a null-snapshot A refresh is rejected, and B can refresh', async () => {
    const requested = deferred<void>();
    const release = deferred<void>();
    const initial = deferred<void>();
    const events: string[] = [];
    let bRefreshes = 0;
    const { values, inner, gate, auth } = fixture(async (input, init) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) {
        const request = JSON.parse(String(init?.body)) as { refresh_token: string };
        if (request.refresh_token === 'synthetic-refresh-A1') {
          requested.resolve(); await release.promise; return response(makeSession('A', 'A1'));
        }
        bRefreshes += 1;
        return response(makeSession('B', 'B1'));
      }
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    const subscription = auth.onAuthStateChange((event) => {
      events.push(event);
      if (event === 'INITIAL_SESSION') initial.resolve();
    });
    await initial.promise;
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    await gate.storage.removeItem(KEY);
    vi.mocked(inner.removeItem).mockClear();
    const stale = auth.refreshSession({ refresh_token: 'synthetic-refresh-A1' });
    await requested.promise;
    const bRaw = JSON.stringify(makeSession('B', 'B1', 1));
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, bRaw));
    release.resolve();
    const result = await stale;
    expect(result.error).toMatchObject({ reason: 'stale', status: 0 });
    expect(isSessionGateError(result.error)).toBe(true);
    expect(isAuthRetryableFetchError(result.error)).toBe(true);
    expect(values.get(KEY)).toBe(bRaw);
    expect(inner.removeItem).not.toHaveBeenCalledWith(KEY);
    expect(events).not.toContain('SIGNED_OUT');
    const refreshed = await auth.refreshSession({ refresh_token: 'synthetic-refresh-B1' });
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.user.id).toBe('B');
    expect(bRefreshes).toBeGreaterThan(0);
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    subscription.data.subscription.unsubscribe();
    await finish(auth);
  });

  it('fails closed when an uncoordinated sign-in tries to establish a session', async () => {
    const events: string[] = [];
    const initial = deferred<void>();
    const { values, gate, auth } = fixture(async (input) => {
      if (String(input).includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    const subscription = auth.onAuthStateChange((event) => {
      events.push(event);
      if (event === 'INITIAL_SESSION') initial.resolve();
    });
    await initial.promise;
    const result = await auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' });
    expect(result.error).toMatchObject({ reason: 'not-established', status: 0 });
    expect(isSessionGateError(result.error)).toBe(true);
    expect(isAuthRetryableFetchError(result.error)).toBe(true);
    expect(values.has(KEY)).toBe(false);
    expect(events).not.toContain('SIGNED_IN');
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    subscription.data.subscription.unsubscribe();
    await finish(auth);
  });

  it.each([false, true])('handles retired residue safely (establish B: %s)', async (establishB) => {
    const entered = deferred<void>();
    const release = deferred<void>();
    const { values, inner, gate, auth } = fixture(async (input) => {
      const url = String(input);
      if (url.includes('grant_type=refresh_token')) return response(makeSession('A', 'A1'));
      if (url.includes('grant_type=password')) return response(makeSession('B', 'B1'));
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.setItem).mockImplementationOnce(async (key, value) => {
      entered.resolve(); await release.promise; values.set(key, value);
    });
    vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error('synthetic native failure'));
    const refresh = auth.refreshSession({ refresh_token: 'synthetic-refresh-A1' });
    await entered.promise;
    gate.retire('A');
    release.resolve();
    const result = await refresh;
    expect(result.error).toMatchObject({ reason: 'retired-residue', status: 0 });
    expect(isSessionGateError(result.error)).toBe(true);
    expect(isAuthRetryableFetchError(result.error)).toBe(true);
    expect(JSON.stringify(result.error)).not.toContain('synthetic native failure');
    expect((await gate.storedSessionIdentity()).kind).toBe('present');
    expect((await auth.getSession()).data.session).toBeNull();
    if (establishB) {
      const b = await gate.runExclusive('establish', () => auth.signInWithPassword({ email: 'b@example.invalid', password: 'synthetic' }));
      expect(b.error).toBeNull();
      expect((await auth.getSession()).data.session?.user.id).toBe('B');
      expect(await gate.removeSessionIf({ userId: 'A' })).toBe('unchanged');
    } else {
      expect(await gate.removeSessionIf({ userId: 'A' })).toBe('removed');
      expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    }
    await finish(auth);
  });

  it('surfaces a native session removal failure from direct sign-out', async () => {
    const { inner, gate, auth } = fixture(async (input) => {
      if (String(input).includes('/logout')) return new Response(null, { status: 204 });
      throw new Error('unexpected synthetic request');
    });
    await auth.initialize();
    await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession('A', 'A1'))));
    vi.mocked(inner.removeItem).mockRejectedValueOnce(new Error('synthetic native failure'));
    const error: unknown = await auth.signOut({ scope: 'local' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ reason: 'storage-failure', status: 0 });
    expect(isSessionGateError(error)).toBe(true);
    expect(isAuthRetryableFetchError(error)).toBe(true);
    expect(JSON.stringify(error)).not.toContain('synthetic native failure');
    await finish(auth);
  });

  it.each(['read', 'write', 'queue'] as const)(
    'keeps unrelated B intact on a %s failure during A refresh',
    async (failure) => {
      const requested = deferred<void>();
      const releaseRefresh = deferred<void>();
      const initial = deferred<void>();
      const events: string[] = [];
      const { values, inner, gate, auth } = fixture(async (input) => {
        if (String(input).includes('grant_type=refresh_token')) {
          requested.resolve(); await releaseRefresh.promise; return response(makeSession('A', 'A1'));
        }
        throw new Error('unexpected synthetic request');
      });
      await auth.initialize();
      const subscription = auth.onAuthStateChange((event) => {
        events.push(event);
        if (event === 'INITIAL_SESSION') initial.resolve();
      });
      await initial.promise;
      // The A refresh takes its snapshot while the store is empty.
      const refresh = auth.refreshSession({ refresh_token: 'synthetic-refresh-A1' });
      await requested.promise;
      const bRaw = JSON.stringify(makeSession('B', 'B1'));
      await gate.runExclusive('establish', () => gate.storage.setItem(KEY, bRaw));
      vi.mocked(inner.removeItem).mockClear();
      const releaseHold = deferred<void>();
      let held: Promise<void> | undefined;
      try {
        if (failure === 'read') {
          vi.mocked(inner.getItem).mockRejectedValueOnce(new Error('synthetic native failure'));
        } else if (failure === 'write') {
          // A's unknown session reaches the inner write during an establish
          // window; a failing adapter must not overwrite the unrelated B.
          const entered = deferred<void>();
          held = gate.runExclusive('establish', async () => { entered.resolve(); await releaseHold.promise; });
          await entered.promise;
          vi.mocked(inner.setItem).mockRejectedValueOnce(new Error('synthetic native failure'));
        } else {
          vi.useFakeTimers();
          const entered = deferred<void>();
          vi.mocked(inner.setItem).mockImplementationOnce(async () => { entered.resolve(); await releaseHold.promise; });
          held = gate.storage.setItem('synthetic-auxiliary', 'value');
          await entered.promise;
        }
        releaseRefresh.resolve();
        if (failure === 'queue') await vi.advanceTimersByTimeAsync(15_001);
        const result = await refresh;
        expect(result.error).toMatchObject({ reason: failure === 'queue' ? 'wait-timeout' : 'storage-failure', status: 0 });
        expect(isSessionGateError(result.error)).toBe(true);
        expect(isAuthRetryableFetchError(result.error)).toBe(true);
        expect(JSON.stringify(result.error)).not.toContain('synthetic native failure');
        expect(values.get(KEY)).toBe(bRaw);
        expect(inner.removeItem).not.toHaveBeenCalledWith(KEY);
        expect(events).not.toContain('SIGNED_OUT');
      } finally {
        releaseRefresh.resolve();
        releaseHold.resolve();
        if (held) await held;
        vi.useRealTimers();
        subscription.data.subscription.unsubscribe();
        await finish(auth);
      }
    },
  );
});

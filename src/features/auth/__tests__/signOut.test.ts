import { AuthClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionGate, type AsyncKeyValueStorage, type SessionIdentity } from '@/lib/supabase/sessionGate';
import { SIGN_OUT_FAILED_MESSAGE, signOutAccount, type SignOutDeps } from '../signOut';

const KEY = 'synthetic-session';
const clients = new Set<InstanceType<typeof AuthClient>>();
afterEach(async () => {
  vi.useRealTimers();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await Promise.all([...clients].map((auth) => auth.dispose()));
  clients.clear();
});

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
/** An expired access token: the SDK must refresh before it can reach the server. */
const expiredAt = () => Math.floor(Date.now() / 1000) - 60;

function fixture(fetcher: typeof fetch) {
  const values = new Map<string, string>();
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

async function seed(gate: ReturnType<typeof createSessionGate>, userId: string, sessionId: string, expiresAt?: number) {
  await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession(userId, sessionId, expiresAt))));
}

function deps(
  gate: ReturnType<typeof createSessionGate>,
  auth: InstanceType<typeof AuthClient>,
  overrides: Partial<SignOutDeps> = {},
): SignOutDeps & { clearDeviceTraces: ReturnType<typeof vi.fn>; reconcile: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> } {
  const clearDeviceTraces = vi.fn(async () => {});
  const reconcile = vi.fn();
  const signOut = vi.fn((options?: { scope: 'local' }) => auth.signOut(options));
  return { gate, isOnline: () => true, clearDeviceTraces, reconcile, signOut, ...overrides } as never;
}

const actorA: SessionIdentity = { userId: 'A', sessionId: 'A1' };

describe('signing out on this device', () => {
  it('ends an expired, offline session without any request and tears the SDK down', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { values, gate, auth } = fixture(fetcher);
    await auth.initialize();
    // Subscribe before seeding: the SDK's INITIAL_SESSION read is detached from
    // sign-out, and with an expired session present it would refresh on its own.
    const events: string[] = [];
    auth.onAuthStateChange((event) => { events.push(event); });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await seed(gate, 'A', 'A1', expiredAt());
    await gate.storage.setItem(`${KEY}-code-verifier`, JSON.stringify('synthetic-verifier'));
    const operations = deps(gate, auth, { isOnline: () => false });

    await signOutAccount(actorA, operations);

    expect(fetcher).not.toHaveBeenCalled();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    expect(values.has(`${KEY}-code-verifier`)).toBe(false);
    expect(events).toContain('SIGNED_OUT');
    expect(operations.clearDeviceTraces).toHaveBeenCalledTimes(1);
    expect(operations.clearDeviceTraces).toHaveBeenCalledWith('A');
    expect(operations.reconcile).toHaveBeenCalled();
    await auth.dispose();
  });

  it('ends an expired session when the SDK cannot reach the server', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1', expiredAt());
    const events: string[] = [];
    auth.onAuthStateChange((event) => { events.push(event); });
    const operations = deps(gate, auth);

    const signingOut = signOutAccount(actorA, operations);
    // The SDK retries the refresh for ~30 s before giving up on it.
    await vi.advanceTimersByTimeAsync(31_000);
    await signingOut;

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    expect(events).toContain('SIGNED_OUT');
    expect(operations.reconcile).toHaveBeenCalled();
    await auth.dispose();
  });

  it('ends a valid session whose sign-out request fails', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    const operations = deps(gate, auth);

    await signOutAccount(actorA, operations);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    await auth.dispose();
  });

  it('ends a valid session the server confirms', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    const operations = deps(gate, auth);

    await signOutAccount(actorA, operations);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
  });

  it('leaves the session in place and does not ask for a cache clear on failure', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { inner, gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1', expiredAt());
    vi.mocked(inner.removeItem).mockRejectedValue(new Error('synthetic native failure'));
    const operations = deps(gate, auth, { isOnline: () => false });

    await expect(signOutAccount(actorA, operations)).rejects.toThrow();

    // C1: a stored session must never sit under a cleared cache.
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: actorA });
    expect(operations.reconcile).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('reports failure when the session cannot be read for removal', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1', expiredAt());
    const operations = deps(gate, auth, {
      isOnline: () => false,
      // Present for the reads, but not removable: refuse rather than lie.
      gate: { ...gate, removeSessionIf: async () => 'unreadable' as const },
    });

    await expect(signOutAccount(actorA, operations)).rejects.toThrow(SIGN_OUT_FAILED_MESSAGE);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: actorA });
    await auth.dispose();
  });

  it('does not touch another account’s session, and hands over to it', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    await seed(gate, 'B', 'B1');
    const operations = deps(gate, auth, { isOnline: () => false });

    // A's sign-out must never act on B: it resolves so the provider can switch
    // the UI to the account actually stored, which clears A's cache.
    await signOutAccount(actorA, operations);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    expect(operations.clearDeviceTraces).not.toHaveBeenCalled();
    expect(operations.signOut).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(operations.reconcile).toHaveBeenCalled();
    await auth.dispose();
  });

  it('resolves when nothing is stored and asks the provider to catch up', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    const operations = deps(gate, auth, { isOnline: () => false });

    // The reconciler had not caught up yet: the button must not deadlock.
    await signOutAccount(actorA, operations);

    expect(operations.reconcile).toHaveBeenCalled();
    expect(operations.clearDeviceTraces).not.toHaveBeenCalled();
    expect(operations.signOut).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('drops an unusable stored value so the next read can be believed', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { values, gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    values.set(KEY, 'not a synthetic session');
    const operations = deps(gate, auth, { isOnline: () => false });

    await signOutAccount(actorA, operations);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    expect(operations.reconcile).toHaveBeenCalled();
    expect(operations.signOut).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('signs out the account’s current session when it re-authenticated', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    // The screen was rendered for A1; A has since signed in again as A2.
    await seed(gate, 'A', 'A1');
    await seed(gate, 'A', 'A2');
    const operations = deps(gate, auth, { isOnline: () => false });

    await signOutAccount(actorA, operations);

    // A2 was signed out, because that is the session this device actually holds.
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    expect(operations.clearDeviceTraces).toHaveBeenCalledWith('A');
    expect(operations.reconcile).toHaveBeenCalled();
    await auth.dispose();
  });

  it('refuses when the stored value cannot be read', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { inner, gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    vi.mocked(inner.getItem).mockRejectedValue(new Error('synthetic native failure'));
    const operations = deps(gate, auth, { isOnline: () => false });

    await expect(signOutAccount(actorA, operations)).rejects.toThrow(SIGN_OUT_FAILED_MESSAGE);

    expect(operations.reconcile).not.toHaveBeenCalled();
    expect(operations.signOut).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('does not sign out a retired account', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('Network request failed'); });
    const { gate, auth } = fixture(fetcher);
    await auth.initialize();
    await seed(gate, 'A', 'A1');
    gate.retire('A');
    const operations = deps(gate, auth, { isOnline: () => false });

    await expect(signOutAccount(actorA, operations)).rejects.toThrow('Your session changed');

    expect(operations.signOut).not.toHaveBeenCalled();
    await auth.dispose();
  });
});
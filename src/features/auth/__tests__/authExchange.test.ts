import { AuthClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionGate, type AsyncKeyValueStorage, type SessionIdentity } from '@/lib/supabase/sessionGate';
import { exchangeOnThisDevice } from '../authExchange';

const KEY = 'synthetic-session';
const VERIFIER_KEY = `${KEY}-code-verifier`;
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
function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Counts only the PKCE exchange, so unrelated SDK traffic never confuses a test. */
function pkceFetcher(handler: () => Promise<Response>) {
  const exchanges = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes('grant_type=pkce')) return handler();
    throw new Error('unexpected synthetic request');
  });
  return exchanges;
}

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

async function seedSession(gate: ReturnType<typeof createSessionGate>, userId: string, sessionId: string) {
  await gate.runExclusive('establish', () => gate.storage.setItem(KEY, JSON.stringify(makeSession(userId, sessionId))));
}
async function seedVerifier(gate: ReturnType<typeof createSessionGate>, value = 'synthetic-verifier') {
  await gate.storage.setItem(VERIFIER_KEY, JSON.stringify(value));
}
function attempt(
  gate: ReturnType<typeof createSessionGate>,
  auth: InstanceType<typeof AuthClient>,
  onEstablished = vi.fn(),
) {
  return {
    onEstablished,
    run: () => exchangeOnThisDevice('synthetic-code', {
      gate, exchangeCodeForSession: (code) => auth.exchangeCodeForSession(code), onEstablished,
    }),
  };
}

describe('exchanging an auth link on this device', () => {
  it('refuses B’s link while A is signed in and leaves the code untouched', async () => {
    // Reproduces C2: B's verifier left here by an earlier request, then A signed
    // in. Exchanging would have replaced A's stored session with B's.
    const fetcher = pkceFetcher(async () => response(makeSession('B', 'B1')));
    const { values, gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedSession(gate, 'A', 'A1');
    await seedVerifier(gate);
    const { run, onEstablished } = attempt(gate, auth);

    expect(await run()).toBe('signed-in');

    expect(fetcher).not.toHaveBeenCalled();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'A', sessionId: 'A1' } });
    // The verifier survives, so signing out (which removes it) has the last word.
    expect(values.has(VERIFIER_KEY)).toBe(true);
    expect(onEstablished).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('exchanges a link when nothing is stored', async () => {
    const fetcher = pkceFetcher(async () => response(makeSession('B', 'B1')));
    const { gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedVerifier(gate);
    const { run, onEstablished } = attempt(gate, auth);

    const identity: SessionIdentity = { userId: 'B', sessionId: 'B1' };
    expect(await run()).toEqual(identity);

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity });
    expect(onEstablished).toHaveBeenCalledTimes(1);
    expect(onEstablished).toHaveBeenCalledWith(identity);
    await auth.dispose();
  });

  it('exchanges a link when the stored session is retired', async () => {
    const fetcher = pkceFetcher(async () => response(makeSession('B', 'B1')));
    const { gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedSession(gate, 'A', 'A1');
    await seedVerifier(gate);
    gate.retire('A');
    const { run } = attempt(gate, auth);

    expect(await run()).toEqual({ userId: 'B', sessionId: 'B1' });

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    await auth.dispose();
  });

  it('exchanges a link over a corrupt stored value', async () => {
    const fetcher = pkceFetcher(async () => response(makeSession('B', 'B1')));
    const { values, gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedVerifier(gate);
    values.set(KEY, 'not a synthetic session');
    const { run } = attempt(gate, auth);

    expect(await run()).toEqual({ userId: 'B', sessionId: 'B1' });

    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'present', identity: { userId: 'B', sessionId: 'B1' } });
    await auth.dispose();
  });

  it('does not exchange when the stored value cannot be read', async () => {
    const fetcher = pkceFetcher(async () => response(makeSession('B', 'B1')));
    const { inner, gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedSession(gate, 'A', 'A1');
    await seedVerifier(gate);
    // Unreadable, not absent: nothing proves it is safe to exchange.
    vi.mocked(inner.getItem).mockImplementation(async (key: string) => {
      if (key === KEY) throw new Error('synthetic native failure');
      return null;
    });
    const { run, onEstablished } = attempt(gate, auth);

    expect(await run()).toBeNull();

    expect(fetcher).not.toHaveBeenCalled();
    expect(onEstablished).not.toHaveBeenCalled();
    await auth.dispose();
  });

  it('returns null and spends the link when the exchange fails', async () => {
    // auth-js removes the PKCE code verifier in its catch block, for network
    // errors too, so a link whose exchange failed cannot be retried.
    const fetcher = pkceFetcher(async () => response({ error: 'synthetic_rejected' }, 400));
    const { values, gate, auth } = fixture(fetcher as unknown as typeof fetch);
    await auth.initialize();
    await seedVerifier(gate);
    const { run, onEstablished } = attempt(gate, auth);

    expect(await run()).toBeNull();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(values.has(VERIFIER_KEY)).toBe(false);
    expect(onEstablished).not.toHaveBeenCalled();
    expect(await gate.storedSessionIdentity()).toEqual({ kind: 'absent' });
    await auth.dispose();
  });
});
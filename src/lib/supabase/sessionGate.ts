import { AuthRetryableFetchError } from '@supabase/supabase-js';

/** Storage-only coordination. Decoded claims are never authentication evidence. */
export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SessionIdentity {
  userId: string;
  sessionId: string;
}

export type StoredSessionIdentity =
  | { kind: 'absent' }
  | { kind: 'present'; identity: SessionIdentity }
  | { kind: 'corrupt' }
  | { kind: 'unreadable' };

type WriteReason = 'invalid' | 'retired' | 'unreadable' | 'stale' | 'not-established' | 'retired-residue';
type GateReason = WriteReason | 'wait-timeout' | 'storage-failure' | 'busy';

/** SDK refresh treats this as retryable; inspect the local type before mapping
 * generic retryable auth errors to an offline message. Never include causes. */
export class SessionGateError extends AuthRetryableFetchError {
  constructor(readonly reason: GateReason) {
    super('Could not safely access the session. Please try again.', 0);
  }
}

export class SessionWriteRejectedError extends SessionGateError {}

export function isSessionGateError(error: unknown): error is SessionGateError {
  return error instanceof SessionGateError;
}

export function defaultAuthStorageKey(url: string): string {
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

/** Decode base64url bytes as UTF-8 without depending on atob or TextDecoder. */
function decodePayload(value: string): string {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let accumulator = 0;
  let bits = 0;
  let encoded = '';
  for (const character of value) {
    accumulator = (accumulator << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      encoded += `%${((accumulator >> bits) & 255).toString(16).padStart(2, '0')}`;
      accumulator &= (1 << bits) - 1;
    }
  }
  if (accumulator !== 0) throw new Error();
  return decodeURIComponent(encoded);
}

function parseIdentityRecord(stored: unknown, requireUser: boolean): SessionIdentity | null {
  try {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
    const record = stored as { access_token?: unknown; user?: unknown };
    if (typeof record.access_token !== 'string') return null;
    const parts = record.access_token.split('.');
    if (parts.length !== 3 || !parts[0]) return null;
    const claims: unknown = JSON.parse(decodePayload(parts[1]));
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return null;
    const { sub, session_id: sessionId } = claims as { sub?: unknown; session_id?: unknown };
    if (typeof sub !== 'string' || !sub.trim() || typeof sessionId !== 'string' || !sessionId.trim()) return null;
    if (requireUser || Object.prototype.hasOwnProperty.call(record, 'user')) {
      if (!record.user || typeof record.user !== 'object' || Array.isArray(record.user) ||
          (record.user as { id?: unknown }).id !== sub) return null;
    }
    return { userId: sub, sessionId };
  } catch {
    return null;
  }
}

/** Coordination metadata only; this does not authenticate the session. */
export function sessionIdentityFromSession(session: unknown): SessionIdentity | null {
  return parseIdentityRecord(session, true);
}

function parseIdentity(value: string, requireUser: boolean): SessionIdentity | null {
  try { return parseIdentityRecord(JSON.parse(value), requireUser); } catch { return null; }
}

/** FIFO with a deadline only while waiting. Started work retains its slot. */
function createQueue(waitMs: number, timeoutReason: 'wait-timeout' | 'busy') {
  let tail: Promise<void> = Promise.resolve();
  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    let started = false;
    let cancelled = false;
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const result = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    const timer = setTimeout(() => {
      if (started) return;
      cancelled = true;
      reject(new SessionGateError(timeoutReason));
    }, waitMs);
    const execution = tail.then(async () => {
      if (cancelled) return;
      started = true;
      clearTimeout(timer);
      try {
        resolve(await operation());
      } catch (error) {
        reject(error);
      }
    });
    tail = execution.then(() => {}, () => {});
    return result;
  };
}

export function createSessionGate(
  inner: AsyncKeyValueStorage,
  sessionKey: string,
  options: { storageWaitMs?: number; exclusiveWaitMs?: number } = {},
) {
  const storageQueue = createQueue(options.storageWaitMs ?? 15_000, 'wait-timeout');
  const exclusiveQueue = createQueue(options.exclusiveWaitMs ?? 45_000, 'busy');
  const known = new Set<string>();
  const retired = new Set<string>();
  const listeners = new Set<(userId: string) => void>();
  let mode: 'establish' | 'maintain' | null = null;

  async function readRaw(): Promise<StoredSessionIdentity> {
    let value: string | null;
    try { value = await inner.getItem(sessionKey); } catch { return { kind: 'unreadable' }; }
    if (value === null) return { kind: 'absent' };
    const identity = parseIdentity(value, false);
    if (!identity) return { kind: 'corrupt' };
    known.add(identity.sessionId);
    return { kind: 'present', identity };
  }

  const storage: AsyncKeyValueStorage = {
    getItem: (key) => storageQueue(async () => {
      let value: string | null;
      try { value = await inner.getItem(key); } catch { throw new SessionGateError('storage-failure'); }
      if (key !== sessionKey || value === null) return value;
      const identity = parseIdentity(value, false);
      if (identity) {
        known.add(identity.sessionId);
        if (retired.has(identity.userId)) return null;
      }
      return value;
    }),
    setItem: (key, value) => storageQueue(async () => {
      if (key !== sessionKey) {
        try { await inner.setItem(key, value); } catch { throw new SessionGateError('storage-failure'); }
        return;
      }
      const incoming = parseIdentity(value, true);
      if (!incoming) throw new SessionWriteRejectedError('invalid');
      if (retired.has(incoming.userId)) throw new SessionWriteRejectedError('retired');
      const current = await readRaw();
      if (current.kind === 'unreadable') throw new SessionWriteRejectedError('unreadable');
      const same = current.kind === 'present' && current.identity.userId === incoming.userId &&
        current.identity.sessionId === incoming.sessionId;
      if (!same) {
        if (known.has(incoming.sessionId)) throw new SessionWriteRejectedError('stale');
        if (mode !== 'establish') throw new SessionWriteRejectedError('not-established');
      }
      if (retired.has(incoming.userId)) throw new SessionWriteRejectedError('retired');
      let writeFailed = false;
      try { await inner.setItem(key, value); } catch { writeFailed = true; }
      if (!writeFailed) known.add(incoming.sessionId);
      if (retired.has(incoming.userId)) {
        try { await inner.removeItem(key); } catch { throw new SessionWriteRejectedError('retired-residue'); }
        throw new SessionWriteRejectedError('retired');
      }
      if (writeFailed) throw new SessionGateError('storage-failure');
    }),
    removeItem: (key) => storageQueue(async () => {
      try { await inner.removeItem(key); } catch { throw new SessionGateError('storage-failure'); }
    }),
  };

  return {
    storage,
    /** Never nest this operation; auth callbacks must not await it. */
    runExclusive: <T>(kind: 'establish' | 'maintain', operation: () => Promise<T>): Promise<T> =>
      exclusiveQueue(async () => {
        mode = kind;
        try { return await operation(); } finally { mode = null; }
      }),
    retire: (userId: string): void => {
      if (retired.has(userId)) return;
      retired.add(userId);
      for (const listener of listeners) {
        try { listener(userId); } catch { /* Retirement must not be interrupted. */ }
      }
    },
    isRetired: (userId: string): boolean => retired.has(userId),
    onRetire: (listener: (userId: string) => void): (() => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    storedSessionIdentity: (): Promise<StoredSessionIdentity> => storageQueue(readRaw),
    removeSessionIf: (match: { userId: string } | { corrupt: true }): Promise<'removed' | 'unchanged' | 'unreadable'> =>
      storageQueue(async () => {
        const current = await readRaw();
        if (current.kind === 'unreadable') return 'unreadable';
        const matches = 'userId' in match
          ? current.kind === 'present' && current.identity.userId === match.userId
          : current.kind === 'corrupt';
        if (!matches) return 'unchanged';
        try { await inner.removeItem(sessionKey); } catch { throw new SessionGateError('storage-failure'); }
        return 'removed';
      }),
  };
}

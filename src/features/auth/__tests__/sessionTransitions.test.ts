import { describe, expect, it, vi } from 'vitest';
import { createSessionGate, type AsyncKeyValueStorage } from '@/lib/supabase/sessionGate';
import { alignVerifiedOwner, createSessionReconciler, quiesceAuthRuntime, runForAccount } from '../sessionTransitions';
import { deleteTripWithCovers, type TripDeletionOperations } from '@/features/trips/deleteTrip';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const person = (id: string) => ({ user: { id } });

/**
 * Builds a reconciler with today's behaviour plus the retry/corrupt ops, so a
 * test only states what it actually exercises. `schedule` is injected to keep
 * timing deterministic.
 */
function reconcilerFor(
  overrides: Partial<Parameters<typeof createSessionReconciler<ReturnType<typeof person>>>[0]> = {},
  schedule?: (fn: () => void, ms: number) => () => void,
) {
  return createSessionReconciler<ReturnType<typeof person>>({
    readSession: async () => ({ session: null, error: null }),
    readIdentity: async () => ({ kind: 'absent' }),
    isRetired: () => false,
    currentUser: () => null,
    apply: vi.fn(),
    ready: vi.fn(),
    removeCorrupt: vi.fn(async () => {}),
    // Deterministic by default: a test that does not care about retries must
    // not leave real timers behind.
    schedule: schedule ?? (() => () => {}),
    ...overrides,
  });
}

describe('session reconciliation', () => {
  it('quiesces inherited owners before a read; failure preserves disk and verified null realigns owners', async () => {
    let owner: string | null = 'A'; let reminder: string | null = 'A';
    const calls: string[] = []; const purgeDisk = vi.fn();
    const setOwner = (id: string | null) => { owner = id; calls.push('owner'); };
    const setReminderOwner = (id: string | null) => { reminder = id; calls.push('reminder'); };
    quiesceAuthRuntime({ endPersistence: () => { calls.push('stop'); }, setOwner, setReminderOwner,
      clearCache: () => { calls.push('clear'); } });
    expect(calls).toEqual(['stop', 'owner', 'reminder', 'clear']);
    expect(owner).toBeNull(); expect(reminder).toBeNull();
    const read = vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ session: null, error: null });
    const reconciler = reconcilerFor({
      readSession: read,
      apply: (next) => alignVerifiedOwner(next?.user.id ?? null, { setOwner, setReminderOwner }),
      ready: (empty) => { if (empty) purgeDisk(); },
    });
    reconciler.reconcile(); await tick();
    expect(purgeDisk).not.toHaveBeenCalled();
    // Even when the provider's cached user is already null, a verified null
    // must reset any module owner that was set while the read was pending.
    owner = 'A'; reminder = 'A';
    reconciler.reconcile(); await tick();
    expect(owner).toBeNull(); expect(reminder).toBeNull();
    expect(purgeDisk).toHaveBeenCalledOnce();
    reconciler.dispose();
  });

  it('ignores a stale restore after a newer event', async () => {
    const old = deferred<{ session: ReturnType<typeof person> | null; error: unknown }>();
    const newer = deferred<{ session: ReturnType<typeof person> | null; error: unknown }>();
    const apply = vi.fn();
    const reconciler = reconcilerFor({
      readSession: vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(newer.promise),
      apply,
    });
    reconciler.reconcile(); await Promise.resolve();
    reconciler.reconcile(); await Promise.resolve();
    newer.resolve({ session: person('B'), error: null }); await tick();
    old.resolve({ session: person('A'), error: null }); await tick();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(person('B'));
    reconciler.dispose();
  });

  it('does not apply an asynchronous restore after provider disposal', async () => {
    const pending = deferred<{ session: ReturnType<typeof person> | null; error: unknown }>();
    const apply = vi.fn(); const ready = vi.fn();
    const reconciler = reconcilerFor({
      readSession: () => pending.promise, apply, ready,
    });
    reconciler.reconcile(); await Promise.resolve();
    reconciler.dispose();
    pending.resolve({ session: person('A'), error: null }); await tick();
    expect(apply).not.toHaveBeenCalled(); expect(ready).not.toHaveBeenCalled();
  });

  it('keeps B on failed/null hints and masked retired A, but accepts verified empty', async () => {
    const apply = vi.fn();
    let response: { session: ReturnType<typeof person> | null; error: unknown } = { session: null, error: new Error() };
    let raw: Awaited<ReturnType<ReturnType<typeof createSessionGate>['storedSessionIdentity']>> = { kind: 'unreadable' };
    const reconciler = reconcilerFor({
      readSession: async () => response, readIdentity: async () => raw,
      isRetired: (id) => id === 'A', currentUser: () => 'B', apply,
    });
    reconciler.reconcile(); await tick();
    response = { session: null, error: null };
    reconciler.reconcile(); await tick();
    raw = { kind: 'present', identity: { userId: 'A', sessionId: 'A1' } };
    reconciler.reconcile(); await tick();
    response = { session: person('A'), error: null };
    reconciler.reconcile(); await tick();
    reconciler.retire('A');
    expect(apply).not.toHaveBeenCalled();
    raw = { kind: 'absent' }; response = { session: null, error: null };
    reconciler.reconcile(); await tick();
    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(null);
    reconciler.dispose();
  });

  it('quarantines active A synchronously and ignores the earlier read', async () => {
    const pending = deferred<{ session: ReturnType<typeof person> | null; error: unknown }>();
    let current: string | null = 'A';
    const apply = vi.fn(() => { current = null; });
    const reconciler = reconcilerFor({
      readSession: () => pending.promise, isRetired: (id) => id === 'A', currentUser: () => current, apply,
    });
    reconciler.reconcile(); await Promise.resolve();
    reconciler.retire('A');
    expect(apply).toHaveBeenCalledWith(null);
    pending.resolve({ session: person('A'), error: null }); await tick();
    expect(apply).toHaveBeenCalledTimes(1);
    reconciler.dispose();
  });

  it('re-reads B if retirement invalidated B’s only pending event', async () => {
    const pending = deferred<{ session: ReturnType<typeof person> | null; error: unknown }>();
    let current: string | null = 'A';
    const apply = vi.fn((next: ReturnType<typeof person> | null) => { current = next?.user.id ?? null; });
    const reads = vi.fn().mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ session: person('B'), error: null });
    const reconciler = reconcilerFor({
      readSession: reads, isRetired: (id) => id === 'A', currentUser: () => current, apply,
    });
    reconciler.reconcile(); await Promise.resolve();
    reconciler.retire('A');
    await tick();
    pending.resolve({ session: person('B'), error: null }); await tick();
    expect(apply.mock.calls).toEqual([[null], [person('B')]]);
    reconciler.dispose();
  });
});

describe('unverified reads are retried', () => {
  /** Collects scheduled retries so a test can fire them by hand. */
  function scheduler() {
    const delays: number[] = [];
    let live: (() => void) | null = null;
    let cancelled = 0;
    return {
      delays, cancelled: () => cancelled,
      // Modelled on clearTimeout: a cancelled retry must never run.
      schedule: (fn: () => void, ms: number) => {
        delays.push(ms);
        live = fn;
        return () => {
          cancelled += 1;
          if (live === fn) live = null;
        };
      },
      fire: async () => { const next = live; live = null; if (next) next(); await tick(); await tick(); },
      pending: () => (live ? 1 : 0),
    };
  }

  it('retries an errored read after the first delay and applies what it finds', async () => {
    const clock = scheduler();
    const apply = vi.fn();
    let error: unknown = new Error('synthetic read failure');
    const reconciler = reconcilerFor({
      readSession: async () => error ? { session: null, error } : { session: person('B'), error: null },
      apply,
    }, clock.schedule);
    reconciler.reconcile(); await tick();
    expect(apply).not.toHaveBeenCalled();
    expect(clock.delays).toEqual([1000]);
    error = null;
    await clock.fire();
    expect(apply).toHaveBeenCalledWith(person('B'));
    // A pass that applies resets the backoff.
    expect(clock.delays).toEqual([1000]);
    reconciler.dispose();
  });

  it('follows the backoff and repeats the last delay', async () => {
    const clock = scheduler();
    const reconciler = reconcilerFor({
      readSession: async () => ({ session: null, error: new Error('synthetic read failure') }),
    }, clock.schedule);
    reconciler.reconcile(); await tick();
    for (let attempt = 0; attempt < 7; attempt += 1) await clock.fire();
    expect(clock.delays).toEqual([1000, 2000, 5000, 10000, 30000, 30000, 30000, 30000]);
    reconciler.dispose();
  });

  it('a newer reconcile cancels the pending retry', async () => {
    const clock = scheduler();
    let calls = 0;
    const reconciler = reconcilerFor({
      readSession: async () => { calls += 1; return { session: null, error: new Error('synthetic read failure') }; },
    }, clock.schedule);
    reconciler.reconcile(); await tick();
    expect(clock.pending()).toBe(1);
    const cancelledAfterFirst = clock.cancelled();
    reconciler.reconcile(); await tick();
    // The replacement pass cancelled the first timer and scheduled its own, so
    // only one retry can ever be outstanding and the old one never fires.
    expect(clock.cancelled()).toBe(cancelledAfterFirst + 1);
    expect(clock.pending()).toBe(1);
    expect(calls).toBe(2);
    reconciler.dispose();
  });

  it('dispose cancels the pending retry and stops the loop', async () => {
    const clock = scheduler();
    const reads = vi.fn(async () => ({ session: null, error: new Error('synthetic read failure') }));
    const reconciler = reconcilerFor({ readSession: reads }, clock.schedule);
    reconciler.reconcile(); await tick();
    expect(clock.pending()).toBe(1);
    const before = reads.mock.calls.length;
    reconciler.dispose();
    // Any retry that was queued is cancelled, so firing it does nothing.
    await clock.fire();
    expect(reads.mock.calls.length).toBe(before);
    expect(clock.delays).toEqual([1000]);
  });

  it('drops a corrupt stored value and applies the empty result of a fresh pass', async () => {
    const clock = scheduler();
    const apply = vi.fn(); const ready = vi.fn();
    let raw: Awaited<ReturnType<ReturnType<typeof createSessionGate>['storedSessionIdentity']>> = { kind: 'corrupt' };
    const removeCorrupt = vi.fn(async () => { raw = { kind: 'absent' }; return 'removed' as const; });
    const reconciler = reconcilerFor({
      readSession: async () => ({ session: null, error: null }),
      readIdentity: async () => raw, apply, ready, removeCorrupt,
    }, clock.schedule);
    reconciler.reconcile(); await tick(); await tick();
    expect(removeCorrupt).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(null);
    expect(ready).toHaveBeenLastCalledWith(true);
    // The removal led straight to a fresh pass, not to a retry timer.
    expect(clock.pending()).toBe(0);
    reconciler.dispose();
  });

  it('backs off instead of looping when the corrupt value cannot be dropped', async () => {
    const clock = scheduler();
    const apply = vi.fn();
    const removeCorrupt = vi.fn(async () => { throw new Error('synthetic native failure'); });
    const reads = vi.fn(async () => ({ session: null, error: null }));
    const reconciler = reconcilerFor({
      readSession: reads, readIdentity: async () => ({ kind: 'corrupt' }), apply, removeCorrupt,
    }, clock.schedule);
    reconciler.reconcile(); await tick();
    expect(removeCorrupt).toHaveBeenCalledOnce();
    expect(reads).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
    expect(clock.delays).toEqual([1000]);
    reconciler.dispose();
  });

  it('does not retry a retired session the SDK is masking', async () => {
    const clock = scheduler();
    const apply = vi.fn(); const ready = vi.fn();
    const reconciler = reconcilerFor({
      readSession: async () => ({ session: null, error: null }),
      readIdentity: async () => ({ kind: 'present', identity: { userId: 'A', sessionId: 'A1' } }),
      isRetired: (id) => id === 'A', currentUser: () => 'A', apply, ready,
    }, clock.schedule);
    reconciler.reconcile(); await tick();
    expect(apply).not.toHaveBeenCalled();
    expect(ready).toHaveBeenCalledWith(true);
    expect(clock.delays).toEqual([]);
    reconciler.dispose();
  });
});

describe('account-bound operation', () => {
  it('does not update B when A was queued behind B sign-in', async () => {
    const values = new Map<string, string>();
    const storage: AsyncKeyValueStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const gate = createSessionGate(storage, 's');
    const token = (id: string) => `e30.${Buffer.from(JSON.stringify({ sub: id, session_id: `${id}1` })).toString('base64url')}.`;
    const write = (id: string) => gate.storage.setItem('s', JSON.stringify({ access_token: token(id), user: { id } }));
    await gate.runExclusive('establish', () => write('A'));
    const entered = deferred<void>(); const release = deferred<void>();
    const signingIn = gate.runExclusive('establish', async () => { entered.resolve(); await release.promise; await write('B'); });
    await entered.promise;
    const update = vi.fn(async () => {});
    const queued = runForAccount(gate, { userId: 'A', sessionId: 'A1' }, update);
    release.resolve(); await signingIn;
    await expect(queued).rejects.toThrow('session changed');
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects rendered A password, sign-out and trip actions after SDK storage becomes B', async () => {
    const values = new Map<string, string>();
    const storage: AsyncKeyValueStorage = {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    };
    const gate = createSessionGate(storage, 's');
    const write = (id: string, sid: string) => gate.storage.setItem('s', JSON.stringify({
      access_token: `e30.${Buffer.from(JSON.stringify({ sub: id, session_id: sid })).toString('base64url')}.`, user: { id },
    }));
    await gate.runExclusive('establish', () => write('A', 'A1'));
    const renderedA = { userId: 'A', sessionId: 'A1' };
    await gate.runExclusive('establish', () => write('B', 'B1'));
    const password = vi.fn(async () => {}); const signOut = vi.fn(async () => {});
    const tripOps: TripDeletionOperations = {
      isCurrent: () => true, owner: vi.fn(async () => ({ data: { role: 'owner' }, error: null })),
      list: vi.fn(async () => ({ data: [], error: null })), remove: vi.fn(async () => ({ data: [], error: null })),
      deleteRow: vi.fn(async () => ({ data: [{ id: 'trip' }], error: null })),
    };
    await expect(runForAccount(gate, renderedA, password)).rejects.toThrow('session changed');
    await expect(runForAccount(gate, renderedA, signOut)).rejects.toThrow('session changed');
    await expect(runForAccount(gate, renderedA, () => deleteTripWithCovers('trip', tripOps))).rejects.toThrow('session changed');
    expect(password).not.toHaveBeenCalled(); expect(signOut).not.toHaveBeenCalled();
    expect(tripOps.owner).not.toHaveBeenCalled(); expect(tripOps.remove).not.toHaveBeenCalled();
    expect(tripOps.deleteRow).not.toHaveBeenCalled();
  });

  it('rejects an older session of the same user after reauthentication', async () => {
    const values = new Map<string, string>();
    const gate = createSessionGate({ getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } }, 's');
    const write = (sid: string) => gate.storage.setItem('s', JSON.stringify({
      access_token: `e30.${Buffer.from(JSON.stringify({ sub: 'A', session_id: sid })).toString('base64url')}.`, user: { id: 'A' },
    }));
    await gate.runExclusive('establish', () => write('A1'));
    await gate.runExclusive('establish', () => write('A2'));
    const update = vi.fn(async () => {});
    await expect(runForAccount(gate, { userId: 'A', sessionId: 'A1' }, update)).rejects.toThrow('session changed');
    expect(update).not.toHaveBeenCalled();
    await runForAccount(gate, { userId: 'A', sessionId: 'A2' }, update);
    expect(update).toHaveBeenCalledOnce();
  });
});

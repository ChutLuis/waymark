import { afterEach, describe, expect, it, vi } from 'vitest';
import { callbackReadiness, createExchangeCoordinator, endPasswordRecovery, finalizeAuthCallback, getRecoveryIdentity,
  recoveryAuthorized, retireRecovery, startPasswordRecovery, syncRecoveryIdentity } from '../recovery';

const a = { userId: 'A', sessionId: 'A1' };
const b = { userId: 'B', sessionId: 'B1' };
const aNew = { userId: 'A', sessionId: 'A2' };
const notRetired = () => false;
afterEach(endPasswordRecovery);

describe('callback exchange identity', () => {
  it('waits for its own exchange and matching reconciled UID and SID', () => {
    expect(callbackReadiness(null, b, notRetired)).toBe('wait');
    const result = { kind: 'success' as const, identity: a };
    expect(callbackReadiness(result, b, notRetired)).toBe('wait');
    expect(callbackReadiness(result, aNew, notRetired)).toBe('wait');
    expect(callbackReadiness(result, a, notRetired)).toBe('ready');
    expect(callbackReadiness(result, a, (id) => id === 'A')).toBe('failed');
    expect(callbackReadiness({ kind: 'failed' }, b, notRetired)).toBe('failed');
    expect(callbackReadiness({ kind: 'signed-in' }, a, notRetired)).toBe('failed');
  });

  it('shares cold and warm exchange work and allows exactly one claim', async () => {
    let resolve!: (value: typeof a | null) => void;
    const execute = vi.fn(() => new Promise<typeof a | null>((done) => { resolve = done; }));
    const coordinator = createExchangeCoordinator(execute);
    const warm = coordinator.exchange('synthetic-code');
    const cold = coordinator.exchange('synthetic-code');
    await Promise.resolve();
    expect(execute).toHaveBeenCalledOnce();
    resolve(a);
    expect(await warm).toEqual({ kind: 'success', identity: a });
    expect(await cold).toEqual({ kind: 'success', identity: a });
    expect(coordinator.claim('synthetic-code', b)).toBe(false);
    expect(coordinator.claim('synthetic-code', a)).toBe(true);
    expect(coordinator.claim('synthetic-code', a)).toBe(false);
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'consumed' });
  });

  it('allows a failed exchange to be attempted again', async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce(a);
    const coordinator = createExchangeCoordinator(execute);
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'failed' });
    // Only the coordinator's own cache is in question here: a failure is not
    // cached, so a second call reaches the executor again. The SDK is what
    // discards the PKCE code verifier on any exchange failure, so in the app a
    // link whose exchange failed is spent regardless of this.
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'success', identity: a });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('reports a refusal to exchange over a live session and does not cache it', async () => {
    const execute = vi.fn().mockResolvedValue('signed-in');
    const coordinator = createExchangeCoordinator(execute);
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'signed-in' });
    // Dropped like a failure, so the same link is reconsidered once the person
    // signs out rather than being stuck on a cached refusal.
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'signed-in' });
    expect(execute).toHaveBeenCalledTimes(2);
    // Never claimed: nothing was established, so no recovery flow may start.
    expect(coordinator.claim('synthetic-code', a)).toBe(false);
  });

  it('treats a refusal as not ready for the callback screen', () => {
    expect(callbackReadiness({ kind: 'signed-in' }, a, notRetired)).toBe('failed');
    expect(callbackReadiness({ kind: 'signed-in' }, null, notRetired)).toBe('failed');
  });

  it('only claims and activates once after the matching exchange and stored session', async () => {
    const coordinator = createExchangeCoordinator(async () => a);
    const result = await coordinator.exchange('synthetic-code');
    const activate = vi.fn(() => true);
    const ops = {
      isRetired: notRetired, stillCurrent: () => true,
      runExclusive: async <T>(fn: () => Promise<T>) => fn(),
      readIdentity: async () => ({ kind: 'present' as const, identity: a }),
      claim: coordinator.claim, startRecovery: activate,
    };
    expect(await finalizeAuthCallback('synthetic-code', null, b, true, ops)).toBe('wait');
    expect(await finalizeAuthCallback('synthetic-code', result, b, true, ops)).toBe('wait');
    expect(activate).not.toHaveBeenCalled();
    expect(await finalizeAuthCallback('synthetic-code', result, a, true, ops)).toBe('ready');
    expect(activate).toHaveBeenCalledOnce();
    expect(await finalizeAuthCallback('synthetic-code', result, a, true, ops)).toBe('failed');
    expect(activate).toHaveBeenCalledOnce();
  });

  it('does not claim a stale or cancelled callback, including confirmation', async () => {
    const coordinator = createExchangeCoordinator(async () => a);
    const result = await coordinator.exchange('synthetic-code');
    const activate = vi.fn(() => true);
    const ops = {
      isRetired: notRetired, stillCurrent: () => true,
      runExclusive: async <T>(fn: () => Promise<T>) => fn(),
      readIdentity: async () => ({ kind: 'present' as const, identity: b }),
      claim: coordinator.claim, startRecovery: activate,
    };
    expect(await finalizeAuthCallback('synthetic-code', result, b, false, ops)).toBe('wait');
    expect(await finalizeAuthCallback('synthetic-code', result, a, false, ops)).toBe('failed');
    const cancelled = { ...ops, stillCurrent: () => false, readIdentity: async () => ({ kind: 'present' as const, identity: a }) };
    expect(await finalizeAuthCallback('synthetic-code', result, a, true, cancelled)).toBe('wait');
    expect(activate).not.toHaveBeenCalled();
    expect(coordinator.claim('synthetic-code', a)).toBe(true);
  });
});

describe('recovery session binding', () => {
  it('authorizes only the exchanged identity and clears on B or a new A session', () => {
    expect(startPasswordRecovery(a, notRetired)).toBe(true);
    expect(recoveryAuthorized(a, notRetired)).toBe(true);
    expect(recoveryAuthorized(b, notRetired)).toBe(false);
    expect(recoveryAuthorized(aNew, notRetired)).toBe(false);
    syncRecoveryIdentity(aNew);
    expect(getRecoveryIdentity()).toBeNull();
    expect(startPasswordRecovery(a, notRetired)).toBe(true);
    syncRecoveryIdentity(b);
    expect(getRecoveryIdentity()).toBeNull();
  });

  it('retirement and abandonment cannot be undone by a consumed exchange', async () => {
    const coordinator = createExchangeCoordinator(async () => a);
    const result = await coordinator.exchange('synthetic-code');
    expect(result.kind).toBe('success');
    expect(coordinator.claim('synthetic-code', a)).toBe(true);
    expect(startPasswordRecovery(a, notRetired)).toBe(true);
    retireRecovery('A');
    expect(recoveryAuthorized(a, notRetired)).toBe(false);
    expect(startPasswordRecovery(a, (id) => id === 'A')).toBe(false);
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'consumed' });
    expect(coordinator.claim('synthetic-code', a)).toBe(false);
  });

  it('cannot reopen a recovery abandoned after the callback was claimed', async () => {
    const coordinator = createExchangeCoordinator(async () => a);
    await coordinator.exchange('synthetic-code');
    expect(coordinator.claim('synthetic-code', a)).toBe(true);
    expect(startPasswordRecovery(a, notRetired)).toBe(true);
    endPasswordRecovery();
    expect(getRecoveryIdentity()).toBeNull();
    expect(await coordinator.exchange('synthetic-code')).toEqual({ kind: 'consumed' });
  });
});

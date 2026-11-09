import { describe, expect, it, vi } from 'vitest';
import { classifyAccountDeletion, finishAccountDeletion, type AccountDeletionOperations, type FinishDeletionOperations } from '../deleteAccount';

function setup(data: unknown = { ok: true }, error: unknown = null) {
  const ops: AccountDeletionOperations = {
    isCurrent: vi.fn(() => true),
    invoke: vi.fn(async () => ({ data, error })),
    httpStatus: vi.fn(() => null),
    errorBody: vi.fn(async () => ({})),
    getUser: vi.fn(async () => ({ userId: 'A', userNotFound: false })),
  };
  return ops;
}

describe('classifyAccountDeletion', () => {
  it('uses the captured credential and accepts only a confirmed success response', async () => {
    const ops = setup();
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('confirmed');
    expect(ops.invoke).toHaveBeenCalledWith('synthetic-A');
    for (const payload of [null, {}, { ok: false }, { ok: 'true' }, [], 'ok']) {
      expect(await classifyAccountDeletion('A', 'synthetic-A', setup(payload))).toBe('uncertain');
    }
  });

  it('distinguishes known partial from unreadable, fetch and relay errors', async () => {
    const partial = setup(null, new Error());
    vi.mocked(partial.httpStatus).mockReturnValue(500);
    vi.mocked(partial.errorBody).mockResolvedValue({ stage: 'after_prepare' });
    expect(await classifyAccountDeletion('A', 'synthetic-A', partial)).toBe('partial');
    vi.mocked(partial.errorBody).mockRejectedValue(new Error());
    expect(await classifyAccountDeletion('A', 'synthetic-A', partial)).toBe('uncertain');
    for (const error of [new Error('fetch'), new Error('relay')]) {
      expect(await classifyAccountDeletion('A', 'synthetic-A', setup(null, error))).toBe('uncertain');
    }
    const thrown = setup();
    vi.mocked(thrown.invoke).mockRejectedValue(new Error('network'));
    expect(await classifyAccountDeletion('A', 'synthetic-A', thrown)).toBe('uncertain');
  });

  it('distinguishes valid-user 401, missing user and unknown auth failures', async () => {
    const ops = setup(null, new Error());
    vi.mocked(ops.httpStatus).mockReturnValue(401);
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('unauthorized');
    vi.mocked(ops.getUser).mockResolvedValue({ userId: null, userNotFound: true });
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('absent');
    vi.mocked(ops.getUser).mockResolvedValue({ userId: null, userNotFound: false });
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('uncertain');
    vi.mocked(ops.getUser).mockRejectedValue(new Error());
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('uncertain');
  });

  it('never checks the new account when the initiator is no longer current', async () => {
    const ops = setup(null, new Error());
    vi.mocked(ops.httpStatus).mockReturnValue(401);
    vi.mocked(ops.isCurrent).mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('uncertain');
    expect(ops.getUser).not.toHaveBeenCalled();
  });

  it('retains a verified bound-account absence even if the SDK ended the session', async () => {
    const ops = setup(null, new Error());
    vi.mocked(ops.httpStatus).mockReturnValue(401);
    vi.mocked(ops.isCurrent).mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    vi.mocked(ops.getUser).mockResolvedValue({ userId: null, userNotFound: true });
    expect(await classifyAccountDeletion('A', 'synthetic-A', ops)).toBe('absent');
  });

  it('keeps the initiating authorization if an account switch occurs during invocation', async () => {
    let finish!: (value: { data: unknown; error: unknown }) => void;
    let current = true;
    const pending = new Promise<{ data: unknown; error: unknown }>((resolve) => { finish = resolve; });
    const ops = setup();
    vi.mocked(ops.isCurrent).mockImplementation(() => current);
    vi.mocked(ops.invoke).mockReturnValue(pending);
    vi.mocked(ops.httpStatus).mockReturnValue(401);
    const result = classifyAccountDeletion('A', 'synthetic-A', ops);
    current = false;
    finish({ data: null, error: new Error() });
    expect(await result).toBe('uncertain');
    expect(ops.invoke).toHaveBeenCalledWith('synthetic-A');
    expect(ops.getUser).not.toHaveBeenCalled();
  });
});

function finishSetup() {
  const calls: string[] = [];
  const ops: FinishDeletionOperations = {
    wasActive: vi.fn(() => true),
    retire: vi.fn(() => { calls.push('retire'); }),
    runExclusive: async (fn) => { calls.push('queue'); return fn(); },
    readIdentity: vi.fn(async () => ({ kind: 'absent' as const })),
    signOut: vi.fn(async () => ({ error: null })),
    removeSessionIf: vi.fn(async () => 'removed' as const),
    purgeReminders: vi.fn(async () => { calls.push('reminders'); }),
    removePersisted: vi.fn(async () => { calls.push('persist'); }),
    isBusy: vi.fn(() => false),
    startNotice: vi.fn(() => { calls.push('notice'); }),
    updateNotice: vi.fn(() => { calls.push('notice-update'); }),
  };
  return { ops, calls };
}

describe('finishAccountDeletion', () => {
  it('retires and queues cleanup before reminders and repeats persisted cleanup', async () => {
    const { ops, calls } = finishSetup();
    const result = await finishAccountDeletion('A', 'confirmed', ops);
    expect(result).toEqual({ outcome: 'confirmed', deviceCleanup: 'not-present', deviceWarning: false });
    expect(calls.indexOf('retire')).toBeLessThan(calls.indexOf('queue'));
    expect(calls.indexOf('queue')).toBeLessThan(calls.indexOf('reminders'));
    expect(ops.removePersisted).toHaveBeenCalledTimes(2);
    expect(ops.signOut).not.toHaveBeenCalled();
  });

  it.each(['other-account', 'corrupt', 'unreadable'] as const)('does not sign out an %s identity', async (kind) => {
    const { ops } = finishSetup();
    vi.mocked(ops.readIdentity).mockResolvedValue(kind === 'other-account'
      ? { kind: 'present', identity: { userId: 'B' } } : { kind });
    const result = await finishAccountDeletion('A', 'absent', ops);
    expect(result.outcome).toBe('absent');
    expect(result.deviceCleanup).toBe(kind === 'other-account' ? kind : 'unverified');
    expect(ops.signOut).not.toHaveBeenCalled();
    expect(ops.removeSessionIf).not.toHaveBeenCalled();
  });

  it.each(['return-error', 'throw'] as const)('falls back after sign-out %s without failing the terminal result', async (mode) => {
    const { ops } = finishSetup();
    vi.mocked(ops.readIdentity)
      .mockResolvedValueOnce({ kind: 'present', identity: { userId: 'A' } })
      .mockResolvedValueOnce({ kind: 'present', identity: { userId: 'A' } })
      .mockResolvedValueOnce({ kind: 'absent' });
    if (mode === 'throw') vi.mocked(ops.signOut).mockRejectedValue(new Error());
    else vi.mocked(ops.signOut).mockResolvedValue({ error: new Error() });
    expect(await finishAccountDeletion('A', 'confirmed', ops)).toEqual({ outcome: 'confirmed', deviceCleanup: 'removed', deviceWarning: true });
    expect(ops.removeSessionIf).toHaveBeenCalledWith('A');
    expect(ops.updateNotice).toHaveBeenCalledWith('A', true);
  });

  it('continues independent device cleanup after failures and a busy queue', async () => {
    const { ops } = finishSetup();
    ops.runExclusive = vi.fn(async () => { throw new Error('busy'); });
    vi.mocked(ops.isBusy).mockReturnValue(true);
    vi.mocked(ops.purgeReminders).mockRejectedValue(new Error());
    vi.mocked(ops.removePersisted).mockRejectedValueOnce(new Error());
    expect(await finishAccountDeletion('A', 'confirmed', ops)).toEqual({ outcome: 'confirmed', deviceCleanup: 'busy', deviceWarning: true });
    expect(ops.purgeReminders).toHaveBeenCalledOnce();
    expect(ops.removePersisted).toHaveBeenCalledTimes(2);
  });

  it('does not show an old account notice when another account is active', async () => {
    const { ops } = finishSetup();
    vi.mocked(ops.wasActive).mockReturnValue(false);
    await finishAccountDeletion('A', 'confirmed', ops);
    expect(ops.retire).toHaveBeenCalledWith('A');
    expect(ops.startNotice).not.toHaveBeenCalled();
    expect(ops.updateNotice).not.toHaveBeenCalled();
  });
});

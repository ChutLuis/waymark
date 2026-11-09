export type AccountDeletionOutcome = 'confirmed' | 'absent' | 'partial' | 'unauthorized' | 'uncertain';

export interface AccountDeletionOperations {
  isCurrent: () => boolean;
  invoke: (accessToken: string) => Promise<{ data: unknown; error: unknown }>;
  httpStatus: (error: unknown) => number | null;
  errorBody: (error: unknown) => Promise<unknown>;
  getUser: () => Promise<{ userId: string | null; userNotFound: boolean }>;
}

/** Classify the server outcome without treating an ambiguous response as success. */
export async function classifyAccountDeletion(
  ownerId: string,
  accessToken: string,
  ops: AccountDeletionOperations,
): Promise<AccountDeletionOutcome> {
  if (!ownerId || !accessToken || !ops.isCurrent()) return 'unauthorized';
  try {
    const { data, error } = await ops.invoke(accessToken);
    if (!error) {
      return data !== null && typeof data === 'object' && !Array.isArray(data) &&
        (data as { ok?: unknown }).ok === true ? 'confirmed' : 'uncertain';
    }
    const status = ops.httpStatus(error);
    if (status !== null) {
      const body = await ops.errorBody(error).catch(() => null);
      if (body && typeof body === 'object' && (body as { stage?: unknown }).stage === 'after_prepare') {
        return 'partial';
      }
    }
    if (status === 401 && ops.isCurrent()) {
      const user = await ops.getUser();
      if (user.userNotFound) return 'absent';
      if (!ops.isCurrent()) return 'uncertain';
      if (user.userId === ownerId) return 'unauthorized';
    }
    return 'uncertain';
  } catch {
    return 'uncertain';
  }
}

export type DeviceCleanup = 'removed' | 'not-present' | 'other-account' | 'unverified' | 'failed' | 'busy';
export interface DeletionResult {
  outcome: 'confirmed' | 'absent';
  deviceCleanup: DeviceCleanup;
  deviceWarning: boolean;
}

type Identity = { kind: 'absent' | 'corrupt' | 'unreadable' } | { kind: 'present'; identity: { userId: string } };
export interface FinishDeletionOperations {
  wasActive: (userId: string) => boolean;
  retire: (userId: string) => void;
  runExclusive: <T>(fn: () => Promise<T>) => Promise<T>;
  readIdentity: () => Promise<Identity>;
  signOut: () => Promise<{ error: unknown }>;
  removeSessionIf: (userId: string) => Promise<'removed' | 'unchanged' | 'unreadable'>;
  purgeReminders: (userId: string) => Promise<void>;
  removePersisted: (userId: string) => Promise<void>;
  isBusy: (error: unknown) => boolean;
  startNotice: (userId: string, outcome: DeletionResult['outcome']) => void;
  updateNotice: (userId: string, warning: boolean) => void;
}

/** Terminal server outcomes never become server failures due to device cleanup. */
export async function finishAccountDeletion(
  userId: string,
  outcome: DeletionResult['outcome'],
  ops: FinishDeletionOperations,
): Promise<DeletionResult> {
  let warning = false;
  let active = false;
  const failureStatus = (error: unknown): DeviceCleanup => {
    try { return ops.isBusy(error) ? 'busy' : 'failed'; } catch { return 'failed'; }
  };
  try { active = ops.wasActive(userId); } catch { warning = true; }
  if (active) {
    try { ops.startNotice(userId, outcome); } catch { warning = true; }
  }
  try { ops.retire(userId); } catch { warning = true; }

  // Queue immediately after retirement, before waiting for reminder cleanup.
  let cleanup: Promise<{ status: DeviceCleanup; warning: boolean }>;
  try {
    cleanup = ops.runExclusive(async () => {
      const current = await ops.readIdentity();
      if (current.kind === 'absent') return { status: 'not-present', warning: false };
      if (current.kind !== 'present') return { status: 'unverified', warning: true };
      if (current.identity.userId !== userId) return { status: 'other-account', warning: false };
      let failed = false;
      try { failed = !!(await ops.signOut()).error; } catch { failed = true; }
      let after = await ops.readIdentity();
      if (after.kind === 'present' && after.identity.userId === userId) {
        const removed = await ops.removeSessionIf(userId);
        if (removed === 'unreadable') return { status: 'unverified', warning: true };
        after = await ops.readIdentity();
      }
      if (after.kind === 'absent') return { status: 'removed', warning: failed };
      if (after.kind === 'present' && after.identity.userId !== userId) return { status: 'other-account', warning: failed };
      if (after.kind === 'corrupt' || after.kind === 'unreadable') return { status: 'unverified', warning: true };
      return { status: 'failed', warning: true };
    });
  } catch (error) {
    cleanup = Promise.resolve({ status: failureStatus(error), warning: true });
  }
  const attempt = async (fn: () => Promise<void>): Promise<void> => {
    try { await fn(); } catch { warning = true; }
  };
  const reminders = attempt(() => ops.purgeReminders(userId));
  const firstPersist = attempt(() => ops.removePersisted(userId));
  let local: { status: DeviceCleanup; warning: boolean };
  try { local = await cleanup; } catch (error) {
    local = { status: failureStatus(error), warning: true };
  }
  await Promise.all([reminders, firstPersist]);
  await attempt(() => ops.removePersisted(userId));
  warning ||= local.warning;
  if (active) {
    try { ops.updateNotice(userId, warning); } catch { warning = true; }
  }
  return { outcome, deviceCleanup: local.status, deviceWarning: warning };
}

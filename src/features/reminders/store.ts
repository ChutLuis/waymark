/**
 * Device-local reminder registry (v1 keeps reminders on the scheduling
 * device only — docs/ARCHITECTURE.md §8), kept per account. Backed by
 * AsyncStorage so reminders survive an app reload; the in-memory map holds the
 * signed-in person's entries and is the hot path.
 *
 * AuthContext points the store at whoever is signed in and purges a person's
 * reminders when their session ends; the rules live in registry.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import {
  cancelLocalReminders,
  dismissNotifications,
  getPresentedNotifications,
  getScheduledNotifications,
} from '@/lib/notifications';
import {
  LEGACY_REGISTRY_KEY,
  adoptLegacyReminders,
  allReminders,
  isRegistryKey,
  parseRegistry,
  registryKey,
  remindersOf,
  remindersToReconcile,
  serializeRegistry,
  staleRegistryEntries,
  type Reminder,
} from './registry';

export type { Reminder, ReminderOffset } from './registry';

let activeUser: string | null = null;
const reminders = new Map<string, Reminder>();
let hydratedFor: string | null = null;
let hydration: Promise<void> | null = null;
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

/**
 * Runs reminder changes one at a time, so a switch-off, a sign-out purge or a
 * reconcile can't interleave with scheduling. A queued task must not call
 * another queued task (it would wait on itself).
 */
let queue: Promise<unknown> = Promise.resolve();

export function withReminderLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/** Points the registry at the signed-in account (null when signed out). */
export function setReminderUser(userId: string | null): void {
  if (userId === activeUser) return;
  activeUser = userId;
  reminders.clear();
  hydratedFor = null;
  hydration = null;
  emit();
}

export function getReminderUser(): string | null {
  return activeUser;
}

async function loadRegistry(userId: string): Promise<Reminder[]> {
  const [own, legacyRaw] = await Promise.all([
    AsyncStorage.getItem(registryKey(userId)).then(parseRegistry),
    AsyncStorage.getItem(LEGACY_REGISTRY_KEY),
  ]);
  if (legacyRaw === null) return own;
  // The device-wide registry from before reminders were per account was set
  // by whoever was signed in; this account takes it over, and the reconcile
  // pass cancels any reminder for a trip it can't open.
  const merged = adoptLegacyReminders(own, parseRegistry(legacyRaw), (await getScheduledNotifications()) ?? []);
  await AsyncStorage.setItem(registryKey(userId), serializeRegistry(merged));
  await AsyncStorage.removeItem(LEGACY_REGISTRY_KEY);
  return merged;
}

export function hydrateReminders(): Promise<void> {
  const userId = activeUser;
  if (userId === null) return Promise.resolve();
  hydration ??= loadRegistry(userId)
    .catch((): Reminder[] => [])
    .then((loaded) => {
      // Signed out or switched account while reading: not this registry's turn.
      if (activeUser !== userId) return;
      for (const reminder of loaded) reminders.set(reminder.itemId, reminder);
      hydratedFor = userId;
      emit();
    });
  return hydration;
}

export function isRemindersHydrated(): boolean {
  return activeUser !== null && hydratedFor === activeUser;
}

function persist(): void {
  // Only a fully read registry is written back; a partial one would clobber
  // entries that haven't loaded yet.
  if (activeUser === null || hydratedFor !== activeUser) return;
  AsyncStorage.setItem(registryKey(activeUser), serializeRegistry(reminders.values())).catch(() => {
    // The reminder still fires this session; it just won't survive a reload.
  });
}

export function getReminder(itemId: string): Reminder | null {
  return reminders.get(itemId) ?? null;
}

export function setStoredReminder(reminder: Reminder): void {
  if (activeUser === null) return;
  reminders.set(reminder.itemId, reminder);
  persist();
  emit();
}

export function removeStoredReminder(itemId: string): void {
  if (reminders.delete(itemId)) {
    persist();
    emit();
  }
}

function forgetActiveRegistry(userId: string): void {
  if (activeUser !== userId) return;
  reminders.clear();
  emit();
}

const purges = new Map<string, Promise<void>>();

/**
 * Cancels every reminder `userId` set on this device, takes any of theirs out
 * of the notification tray, and deletes their registry. For a session ending
 * any way: sign-out, account deletion, revocation, another account signing in.
 * Never rejects.
 */
export function purgeUserReminders(userId: string): Promise<void> {
  const running = purges.get(userId);
  if (running) return running;
  const purge = withReminderLock(async () => {
    const registry =
      activeUser === userId && hydratedFor === userId
        ? [...reminders.values()]
        : parseRegistry(await AsyncStorage.getItem(registryKey(userId)).catch(() => null));
    const ids = new Set(remindersOf((await getScheduledNotifications()) ?? [], userId));
    for (const reminder of registry) if (reminder.notificationId) ids.add(reminder.notificationId);
    await cancelLocalReminders([...ids]);
    await dismissNotifications(remindersOf(await getPresentedNotifications(), userId));
    await AsyncStorage.multiRemove([registryKey(userId), LEGACY_REGISTRY_KEY]);
    forgetActiveRegistry(userId);
  })
    .catch(() => {})
    .finally(() => purges.delete(userId));
  purges.set(userId, purge);
  return purge;
}

/**
 * For a launch with nobody signed in, because the last session was revoked or
 * expired while the app was closed: cancels and dismisses every trip reminder
 * and deletes every registry. Never rejects.
 */
export function purgeAllReminders(): Promise<void> {
  return withReminderLock(async () => {
    const keep = activeUser;
    await cancelLocalReminders(allReminders((await getScheduledNotifications()) ?? [], keep));
    await dismissNotifications(allReminders(await getPresentedNotifications(), keep));
    const keys = (await AsyncStorage.getAllKeys()).filter(
      (key) => isRegistryKey(key) && (keep === null || key !== registryKey(keep)),
    );
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  }).catch(() => {});
}

/**
 * Reminders switched off: cancels everything already scheduled and forgets
 * the signed-in person's registry, so nothing fires and no bell stays lit.
 * Never rejects.
 */
export function cancelAllReminders(): Promise<void> {
  return withReminderLock(async () => {
    const userId = activeUser;
    await hydrateReminders();
    const ids = new Set<string>();
    if (activeUser === userId) {
      for (const reminder of reminders.values()) if (reminder.notificationId) ids.add(reminder.notificationId);
    }
    for (const id of allReminders((await getScheduledNotifications()) ?? [])) ids.add(id);
    await cancelLocalReminders([...ids]);
    if (userId === null) return;
    await AsyncStorage.multiRemove([registryKey(userId), LEGACY_REGISTRY_KEY]);
    forgetActiveRegistry(userId);
  }).catch(() => {});
}

/**
 * Given the trips `userId` can open now, cancels reminders for any trip that
 * left the list (they left, were removed, or it was deleted) and any left over
 * from another account. Never rejects.
 */
export function reconcileReminders(userId: string, tripIds: ReadonlySet<string>): Promise<void> {
  return withReminderLock(async () => {
    await hydrateReminders();
    // The registry is edited with no await after this check, so it can't be
    // written into an account that signed in meanwhile.
    if (activeUser !== userId) return;
    const ids = new Set<string>();
    const stale = staleRegistryEntries([...reminders.values()], tripIds);
    for (const itemId of stale) {
      const notificationId = reminders.get(itemId)?.notificationId;
      if (notificationId) ids.add(notificationId);
      reminders.delete(itemId);
    }
    if (stale.length > 0) {
      persist();
      emit();
    }
    const scheduled = await getScheduledNotifications();
    for (const id of remindersToReconcile(scheduled ?? [], userId, tripIds)) ids.add(id);
    await cancelLocalReminders([...ids]);
  }).catch(() => {});
}

export function subscribeReminders(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Re-renders subscribers whenever the reminder set changes (including
 * hydration), so list rows showing the bell glyph stay correct.
 */
export function useReminderVersion(): number {
  return useSyncExternalStore(subscribeReminders, () => version, () => 0);
}

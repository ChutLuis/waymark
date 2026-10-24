/**
 * Pure rules for trip reminders, kept free of React Native so Vitest can cover
 * them; store.ts does the storage and notification I/O.
 *
 * A reminder belongs to the account that set it. The registry is stored per
 * user, and every scheduled notification carries that user's id, so ending a
 * session can cancel exactly that person's reminders, and nothing of theirs
 * fires for whoever uses the device next.
 */

export type ReminderOffset = 0 | 60 | 1440;

export interface Reminder {
  itemId: string;
  /** The item's trip; null only for an entry carried over from the device-wide registry. */
  tripId: string | null;
  offsetMinutes: ReminderOffset;
  notificationId: string | null;
}

/** The registry from before reminders were per account: one list for the whole device. */
export const LEGACY_REGISTRY_KEY = 'waymark.reminders.v1';
const REGISTRY_PREFIX = 'waymark.reminders.v2.';

export function registryKey(userId: string): string {
  return `${REGISTRY_PREFIX}${userId}`;
}

/** Any reminder registry key, per user or legacy. */
export function isRegistryKey(key: string): boolean {
  return key === LEGACY_REGISTRY_KEY || key.startsWith(REGISTRY_PREFIX);
}

const OFFSETS: readonly unknown[] = [0, 60, 1440];

/** Reads a stored registry, dropping anything malformed instead of failing. */
export function parseRegistry(raw: string | null): Reminder[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const reminders: Reminder[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { itemId, tripId, offsetMinutes, notificationId } = entry as Record<string, unknown>;
    if (typeof itemId !== 'string' || !OFFSETS.includes(offsetMinutes)) continue;
    reminders.push({
      itemId,
      tripId: typeof tripId === 'string' ? tripId : null,
      offsetMinutes: offsetMinutes as ReminderOffset,
      notificationId: typeof notificationId === 'string' ? notificationId : null,
    });
  }
  return reminders;
}

export function serializeRegistry(reminders: Iterable<Reminder>): string {
  return JSON.stringify([...reminders]);
}

/** Marks a scheduled notification as one of this app's trip reminders. */
export const REMINDER_KIND = 'trip-reminder';

/** The data a trip reminder is scheduled with; the tap handler reads tripId. */
export function reminderPayload(userId: string, tripId: string, itemId: string): Record<string, string> {
  return { kind: REMINDER_KIND, userId, tripId, itemId };
}

/** What these rules need from a scheduled or delivered notification. */
export interface NotificationRef {
  identifier: string;
  data: Record<string, unknown> | null | undefined;
}

/**
 * A trip reminder this app scheduled: tagged, or the untagged shape reminders
 * had before they carried an account.
 */
export function isTripReminder(data: NotificationRef['data']): boolean {
  if (!data) return false;
  if (data.kind === REMINDER_KIND) return true;
  return typeof data.tripId === 'string' && typeof data.itemId === 'string';
}

/** The account a reminder was set for; null for an untagged (older) one. */
export function reminderOwner(data: NotificationRef['data']): string | null {
  return typeof data?.userId === 'string' ? data.userId : null;
}

function reminderTrip(data: NotificationRef['data']): string | null {
  return typeof data?.tripId === 'string' ? data.tripId : null;
}

/**
 * Reminders to cancel when `userId`'s session ends: theirs, plus untagged ones,
 * whose owner can't be told apart, so nothing survives the sign-out.
 */
export function remindersOf(notifications: readonly NotificationRef[], userId: string): string[] {
  return notifications
    .filter(({ data }) => isTripReminder(data) && (reminderOwner(data) ?? userId) === userId)
    .map(({ identifier }) => identifier);
}

/**
 * Every trip reminder, for when nobody is signed in. `except` keeps one
 * account's, should someone have signed in while the cleanup ran.
 */
export function allReminders(
  notifications: readonly NotificationRef[],
  except: string | null = null,
): string[] {
  return notifications
    .filter(({ data }) => isTripReminder(data) && (except === null || reminderOwner(data) !== except))
    .map(({ identifier }) => identifier);
}

/**
 * Reminders that must not fire while `userId` is signed in, given the trips
 * they can still open: another account's (left from a session that ended while
 * the app was closed), and their own (or untagged) ones for a trip that has
 * left their list because they left it, were removed, or it was deleted.
 */
export function remindersToReconcile(
  notifications: readonly NotificationRef[],
  userId: string,
  tripIds: ReadonlySet<string>,
): string[] {
  return notifications
    .filter(({ data }) => {
      if (!isTripReminder(data)) return false;
      const owner = reminderOwner(data);
      if (owner !== null && owner !== userId) return true;
      const tripId = reminderTrip(data);
      return tripId !== null && !tripIds.has(tripId);
    })
    .map(({ identifier }) => identifier);
}

/** Registry entries (item ids) for trips no longer in the list; entries without a trip are kept. */
export function staleRegistryEntries(
  reminders: readonly Reminder[],
  tripIds: ReadonlySet<string>,
): string[] {
  return reminders
    .filter((reminder) => reminder.tripId !== null && !tripIds.has(reminder.tripId))
    .map((reminder) => reminder.itemId);
}

/**
 * Carries the device-wide registry over to the signed-in account. Its entries
 * didn't record their trip, so it is filled in from the still-scheduled
 * notification where there is one. Entries already in the account's own
 * registry win.
 */
export function adoptLegacyReminders(
  own: readonly Reminder[],
  legacy: readonly Reminder[],
  scheduled: readonly NotificationRef[],
): Reminder[] {
  const tripByNotification = new Map(
    scheduled.map(({ identifier, data }) => [identifier, reminderTrip(data)] as const),
  );
  const merged = new Map(
    legacy.map((reminder) => [
      reminder.itemId,
      {
        ...reminder,
        tripId:
          reminder.tripId ??
          (reminder.notificationId ? tripByNotification.get(reminder.notificationId) ?? null : null),
      },
    ]),
  );
  for (const reminder of own) merged.set(reminder.itemId, reminder);
  return [...merged.values()];
}

/** Device-wide record of the exact-alarm access reminders were last scheduled under. */
export const EXACT_ACCESS_KEY = 'waymark.reminders.exactAccess';

/**
 * Whether reminders have to be scheduled again because exact-alarm access
 * changed since they were (or was never recorded): allowed now, inexact ones
 * become exact; taken away, Android has cancelled the exact ones.
 */
export function exactAccessChanged(
  recorded: string | null,
  access: 'granted' | 'denied' | 'not-applicable',
): boolean {
  return access !== 'not-applicable' && recorded !== access;
}

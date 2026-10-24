import { useEffect, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  cancelLocalReminder,
  ensureNotificationChannel,
  ensureNotificationPermission,
  scheduleLocalReminder,
  useExactAlarmAccess,
  type NotificationChannelSpec,
  type PermissionOutcome,
} from '@/lib/notifications';
import { formatDateTime } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';
import { useAuth } from '@/features/auth/AuthContext';
import { useTrips } from '@/features/trips/hooks';
import { getRemindersEnabled, hydrateReminderPreference } from './preference';
import { reminderPayload } from './registry';
import {
  getReminder,
  getReminderUser,
  hydrateReminders,
  isRemindersHydrated,
  reconcileReminders,
  removeStoredReminder,
  setStoredReminder,
  subscribeReminders,
  syncExactAlarmAccess,
  withReminderLock,
  type Reminder,
  type ReminderOffset,
} from './store';

export { hydrateReminders, useReminderVersion } from './store';
export type { Reminder, ReminderOffset } from './store';

export const REMINDER_OFFSETS: { value: ReminderOffset; label: string }[] = [
  { value: 0, label: 'At start' },
  { value: 60, label: '1 hr before' },
  { value: 1440, label: '1 day before' },
];

export const TRIP_REMINDER_CHANNEL: NotificationChannelSpec = {
  id: 'trip-reminders',
  name: 'Trip reminders',
  description: 'Reminders you set on stops in your trip plans.',
};

/**
 * Asks for notification permission for trip reminders. The channel comes
 * first: Android 13+ shows no permission prompt until a channel exists.
 */
export async function ensureReminderPermission(): Promise<PermissionOutcome> {
  await ensureNotificationChannel(TRIP_REMINDER_CHANNEL);
  return ensureNotificationPermission();
}

export function reminderFireDate(startAt: string, offsetMinutes: ReminderOffset): Date {
  return new Date(new Date(startAt).getTime() - offsetMinutes * 60_000);
}

/**
 * The signed-in person's reminder for an item: undefined until their registry
 * has loaded (or with no item), then the reminder or null.
 */
export function useReminder(itemId: string | null): { data: Reminder | null | undefined } {
  const owner = useSyncExternalStore(subscribeReminders, getReminderUser, () => null);
  const hydrated = useSyncExternalStore(subscribeReminders, isRemindersHydrated, () => false);
  const reminder = useSyncExternalStore(
    subscribeReminders,
    () => (itemId === null ? null : getReminder(itemId)),
    () => null,
  );

  useEffect(() => {
    if (owner !== null) void hydrateReminders();
  }, [owner]);

  return { data: itemId === null || !hydrated ? undefined : reminder };
}

interface SetReminderVars {
  item: Pick<ItineraryItem, 'id' | 'title' | 'tripId'>;
  startAt: string;
  offsetMinutes: ReminderOffset;
}

export interface SetReminderResult {
  /** `disabled`: Trip reminders are switched off (or nobody is signed in), so nothing was scheduled. */
  outcome: PermissionOutcome | 'disabled';
  reminder: Reminder | null;
}

/** Reminders live on the device: offline is no reason to hold them. */
const LOCAL_NETWORK_MODE = 'always';

/**
 * Schedules (or replaces) the signed-in person's reminder for a stop. Not a
 * hook: queued stop saves call it too, after a restart (itinerary/hooks.ts).
 */
export async function setStopReminder(
  { item, startAt, offsetMinutes }: SetReminderVars,
  { onlyIfSet = false }: { onlyIfSet?: boolean } = {},
): Promise<SetReminderResult> {
  await hydrateReminderPreference();
  if (!getRemindersEnabled()) return { outcome: 'disabled', reminder: null };

  // Asked before taking the lock: the permission prompt can sit on screen.
  const outcome = await ensureReminderPermission();
  if (outcome === 'denied') return { outcome, reminder: null };

  return withReminderLock(async (): Promise<SetReminderResult> => {
    const userId = getReminderUser();
    // Switched off, or signed out, while the prompt was up.
    if (!getRemindersEnabled() || userId === null) return { outcome: 'disabled', reminder: null };

    await hydrateReminders();
    if (getReminderUser() !== userId) return { outcome: 'disabled', reminder: null };
    const existing = getReminder(item.id);
    // Following a saved stop: only a reminder that is still set moves, at its
    // current offset (the editor may have changed or cleared it meanwhile).
    if (onlyIfSet && !existing) return { outcome: 'disabled', reminder: null };
    const offset = onlyIfSet && existing ? existing.offsetMinutes : offsetMinutes;
    if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);

    const notificationId = await scheduleLocalReminder(
      reminderFireDate(startAt, offset),
      item.title,
      `Starts ${formatDateTime(startAt)}`,
      reminderPayload(userId, item.tripId, item.id),
      TRIP_REMINDER_CHANNEL.id,
    );
    if (getReminderUser() !== userId) {
      // The session ended while scheduling: this reminder must not outlive it.
      if (notificationId) await cancelLocalReminder(notificationId);
      return { outcome: 'disabled', reminder: null };
    }
    const reminder: Reminder = { itemId: item.id, tripId: item.tripId, offsetMinutes: offset, notificationId };
    setStoredReminder(reminder);
    return { outcome, reminder };
  });
}

/** Cancels and forgets the signed-in person's reminder for a stop, if any. */
export function clearStopReminder(itemId: string): Promise<void> {
  return withReminderLock(async () => {
    await hydrateReminders();
    const existing = getReminder(itemId);
    if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);
    removeStoredReminder(itemId);
  });
}

/**
 * Keeps a stop's existing reminder in step with the stop as saved: moved
 * with a new start, gone without one. Queued saves call it when they land,
 * since the sheet that set the reminder may be gone by then. Never rejects.
 */
export async function followStopReminder(
  item: Pick<ItineraryItem, 'id' | 'title' | 'tripId' | 'startAt'>,
): Promise<void> {
  try {
    await hydrateReminders();
    const existing = getReminder(item.id);
    if (!existing) return;
    if (!item.startAt) {
      await clearStopReminder(item.id);
      return;
    }
    await setStopReminder(
      { item, startAt: item.startAt, offsetMinutes: existing.offsetMinutes },
      { onlyIfSet: true },
    );
  } catch {
    // Reminders are best-effort and local to this device.
  }
}

export function useSetReminder() {
  return useMutation({ networkMode: LOCAL_NETWORK_MODE, mutationFn: (vars: SetReminderVars) => setStopReminder(vars) });
}

export function useClearReminder() {
  return useMutation({ networkMode: LOCAL_NETWORK_MODE, mutationFn: clearStopReminder });
}

/** Synchronous read used by list rows to show the bell glyph; pair with
 * useReminderVersion() so the row re-renders when the store changes. */
export function hasReminder(itemId: string): boolean {
  return getReminder(itemId) !== null;
}

/**
 * Keeps reminders in step with the trips the signed-in person can open: when
 * a trip leaves their list (they left, were removed, or it was deleted), its
 * reminders are cancelled. Mount once inside the signed-in area.
 */
export function useReminderReconcile(): void {
  const { userId } = useAuth();
  const trips = useTrips();
  // Only a list the server just returned counts: a failed refetch is skipped,
  // and so is the copy restored from the device on a cold start.
  const tripKey =
    trips.isSuccess && trips.isFetchedAfterMount ? trips.data.map((trip) => trip.id).sort().join(' ') : null;

  useEffect(() => {
    if (userId === null || tripKey === null) return;
    void reconcileReminders(userId, new Set(tripKey === '' ? [] : tripKey.split(' ')));
  }, [userId, tripKey]);
}

/**
 * Schedules the signed-in person's reminders again whenever exact-alarm access
 * changes (checked on every return to the foreground), so ones set while it
 * was off become exact once it is allowed. Mount once inside the signed-in area.
 */
export function useExactAlarmSync(): void {
  const { userId } = useAuth();
  const access = useExactAlarmAccess();

  useEffect(() => {
    if (userId === null || access === 'not-applicable') return;
    void syncExactAlarmAccess(userId, access);
  }, [userId, access]);
}

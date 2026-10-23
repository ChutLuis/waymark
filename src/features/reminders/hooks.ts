import { useEffect, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  cancelLocalReminder,
  ensureNotificationChannel,
  ensureNotificationPermission,
  scheduleLocalReminder,
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

export function useSetReminder() {
  return useMutation({
    networkMode: LOCAL_NETWORK_MODE,
    mutationFn: async ({ item, startAt, offsetMinutes }: SetReminderVars): Promise<SetReminderResult> => {
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
        if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);

        const notificationId = await scheduleLocalReminder(
          reminderFireDate(startAt, offsetMinutes),
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
        const reminder: Reminder = { itemId: item.id, tripId: item.tripId, offsetMinutes, notificationId };
        setStoredReminder(reminder);
        return { outcome, reminder };
      });
    },
  });
}

export function useClearReminder() {
  return useMutation({
    networkMode: LOCAL_NETWORK_MODE,
    mutationFn: (itemId: string) =>
      withReminderLock(async () => {
        await hydrateReminders();
        const existing = getReminder(itemId);
        if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);
        removeStoredReminder(itemId);
      }),
  });
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
  // Only a list the server just returned counts; a failed refetch is skipped.
  const tripKey = trips.isSuccess ? trips.data.map((trip) => trip.id).sort().join(' ') : null;

  useEffect(() => {
    if (userId === null || tripKey === null) return;
    void reconcileReminders(userId, new Set(tripKey === '' ? [] : tripKey.split(' ')));
  }, [userId, tripKey]);
}

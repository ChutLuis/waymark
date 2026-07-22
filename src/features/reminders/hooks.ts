import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelLocalReminder,
  ensureNotificationPermission,
  scheduleLocalReminder,
  type PermissionOutcome,
} from '@/lib/notifications';
import { formatDateTime } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';
import {
  getReminder,
  hydrateReminders,
  removeStoredReminder,
  setStoredReminder,
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

const keys = {
  reminder: (itemId: string) => ['reminder', itemId] as const,
};

export function reminderFireDate(startAt: string, offsetMinutes: ReminderOffset): Date {
  return new Date(new Date(startAt).getTime() - offsetMinutes * 60_000);
}

export function useReminder(itemId: string | null) {
  return useQuery({
    queryKey: keys.reminder(itemId ?? 'none'),
    enabled: itemId !== null,
    queryFn: async () => {
      await hydrateReminders();
      return getReminder(itemId ?? '');
    },
  });
}

interface SetReminderVars {
  item: Pick<ItineraryItem, 'id' | 'title' | 'tripId'>;
  startAt: string;
  offsetMinutes: ReminderOffset;
}

export interface SetReminderResult {
  outcome: PermissionOutcome;
  reminder: Reminder | null;
}

export function useSetReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, startAt, offsetMinutes }: SetReminderVars): Promise<SetReminderResult> => {
      const outcome = await ensureNotificationPermission();
      if (outcome === 'denied') return { outcome, reminder: null };

      await hydrateReminders();
      const existing = getReminder(item.id);
      if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);

      const notificationId = await scheduleLocalReminder(
        reminderFireDate(startAt, offsetMinutes),
        item.title,
        `Starts ${formatDateTime(startAt)}`,
        { tripId: item.tripId, itemId: item.id },
      );
      const reminder: Reminder = { itemId: item.id, offsetMinutes, notificationId };
      setStoredReminder(reminder);
      return { outcome, reminder };
    },
    onSuccess: (_result, { item }) =>
      queryClient.invalidateQueries({ queryKey: keys.reminder(item.id) }),
  });
}

export function useClearReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await hydrateReminders();
      const existing = getReminder(itemId);
      if (existing?.notificationId) await cancelLocalReminder(existing.notificationId);
      removeStoredReminder(itemId);
    },
    onSuccess: (_result, itemId) =>
      queryClient.invalidateQueries({ queryKey: keys.reminder(itemId) }),
  });
}

/** Synchronous read used by list rows to show the bell glyph; pair with
 * useReminderVersion() so the row re-renders when the store changes. */
export function hasReminder(itemId: string): boolean {
  return getReminder(itemId) !== null;
}

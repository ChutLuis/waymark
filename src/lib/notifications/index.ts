/**
 * Thin wrapper over expo-notifications so feature code never touches the
 * module directly. Degrades gracefully on web, where scheduled local
 * notifications are unavailable (REM-3 acceptance).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PermissionOutcome = 'granted' | 'denied' | 'unavailable';

/** A scheduled or delivered notification: its id and the data it carries. */
export interface LocalNotificationRef {
  identifier: string;
  data: Record<string, unknown> | null | undefined;
}

/** An Android notification channel: the row people see under the app's notification settings. */
export interface NotificationChannelSpec {
  id: string;
  name: string;
  description?: string;
}

const createdChannels = new Set<string>();

/**
 * Creates (or renames) an Android channel once per process. Android 13+ only
 * shows the permission prompt once a channel exists, so call it before
 * `ensureNotificationPermission`. A no-op elsewhere.
 */
export async function ensureNotificationChannel(channel: NotificationChannelSpec): Promise<void> {
  if (Platform.OS !== 'android' || createdChannels.has(channel.id)) return;
  try {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      description: channel.description ?? null,
      importance: Notifications.AndroidImportance.HIGH,
    });
    createdChannels.add(channel.id);
  } catch {
    // Scheduling still works; Android falls back to its default channel.
  }
}

export async function ensureNotificationPermission(): Promise<PermissionOutcome> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    if (!existing.canAskAgain) return 'denied';
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function scheduleLocalReminder(
  date: Date,
  title: string,
  body: string,
  data: Record<string, string>,
  channelId?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (date.getTime() <= Date.now()) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
    });
  } catch {
    return null;
  }
}

export async function cancelLocalReminder(notificationId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or cancelled; nothing to do.
  }
}

export async function cancelLocalReminders(notificationIds: readonly string[]): Promise<void> {
  await Promise.all(notificationIds.map(cancelLocalReminder));
}

/** Everything this app has scheduled; null when that can't be read (web, or a native failure). */
export async function getScheduledNotifications(): Promise<LocalNotificationRef[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    return requests.map((request) => ({ identifier: request.identifier, data: request.content.data }));
  } catch {
    return null;
  }
}

/** A scheduled one-off notification with what it takes to schedule it again. */
export interface ScheduledDateNotification extends LocalNotificationRef {
  title: string | null;
  body: string | null;
  date: Date;
  channelId: string | undefined;
}

/** Scheduled notifications with a fixed date; null when they can't be read. */
export async function getScheduledDateNotifications(): Promise<ScheduledDateNotification[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    const scheduled: ScheduledDateNotification[] = [];
    for (const { identifier, content, trigger } of requests) {
      const raw = trigger as { type?: unknown; value?: unknown; channelId?: unknown } | null;
      if (raw?.type !== 'date' || typeof raw.value !== 'number') continue;
      scheduled.push({
        identifier,
        data: content.data,
        title: content.title,
        body: content.body,
        date: new Date(raw.value),
        channelId: typeof raw.channelId === 'string' ? raw.channelId : undefined,
      });
    }
    return scheduled;
  } catch {
    return null;
  }
}

/**
 * Schedules a notification again under the same identifier, replacing it.
 * Android then picks an exact or inexact alarm by the access the app has now.
 * False if it couldn't.
 */
export async function rescheduleNotification(notification: ScheduledDateNotification): Promise<boolean> {
  // A past one has fired or is about to: nothing to move.
  if (Platform.OS === 'web' || notification.date.getTime() <= Date.now()) return true;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notification.identifier,
      content: {
        title: notification.title,
        body: notification.body,
        data: (notification.data ?? {}) as Record<string, unknown>,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notification.date,
        channelId: notification.channelId,
      },
    });
    return true;
  } catch {
    // It stays scheduled as it was.
    return false;
  }
}

export {
  openExactAlarmSettings,
  refreshExactAlarmAccess,
  useExactAlarmAccess,
  type ExactAlarmAccess,
} from './exactAlarms';

/** This app's notifications still showing in the notification tray. */
export async function getPresentedNotifications(): Promise<LocalNotificationRef[]> {
  if (Platform.OS === 'web') return [];
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    return presented.map(({ request }) => ({ identifier: request.identifier, data: request.content.data }));
  } catch {
    return [];
  }
}

/** Takes delivered notifications out of the notification tray. */
export async function dismissNotifications(notificationIds: readonly string[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    notificationIds.map((id) =>
      Notifications.dismissNotificationAsync(id).catch(() => {
        // Already dismissed by the user.
      }),
    ),
  );
}

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

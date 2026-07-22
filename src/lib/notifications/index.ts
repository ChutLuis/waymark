/**
 * Thin wrapper over expo-notifications so feature code never touches the
 * module directly. Degrades gracefully on web, where scheduled local
 * notifications are unavailable (REM-3 acceptance).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PermissionOutcome = 'granted' | 'denied' | 'unavailable';

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
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (date.getTime() <= Date.now()) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
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

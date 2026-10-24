/**
 * Android's exact-alarm access (SCHEDULE_EXACT_ALARM) for trip reminders.
 * Android only: on iOS and web there is no such setting, so both report
 * "not-applicable" and opening the setting does nothing. Feature code reaches
 * this through src/lib/notifications.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type ExactAlarmAccess = 'granted' | 'denied' | 'not-applicable';

interface ExactAlarmsNative {
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): boolean;
}

// Optional: a development build from before the module existed has no native
// side, and reminders then behave as before.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<ExactAlarmsNative>('ExactAlarms') : null;

export function getExactAlarmAccess(): ExactAlarmAccess {
  if (!native) return 'not-applicable';
  try {
    return native.canScheduleExactAlarms() ? 'granted' : 'denied';
  } catch {
    return 'not-applicable';
  }
}

/** Opens the system page for this app's "Alarms & reminders" access. False if it couldn't. */
export function openExactAlarmSettings(): boolean {
  if (!native) return false;
  try {
    return native.openExactAlarmSettings();
  } catch {
    return false;
  }
}

/**
 * Whether Android lets this app set exact alarms (SCHEDULE_EXACT_ALARM).
 * expo-notifications schedules a reminder exactly when it can and inexactly
 * otherwise, so this decides whether "1 hr before" means an hour before.
 * Re-read whenever the app comes to the foreground, which is how a person
 * returns from the system setting.
 */
import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';
import {
  getExactAlarmAccess,
  openExactAlarmSettings as openNativeSettings,
  type ExactAlarmAccess,
} from '../../../modules/exact-alarms';

export type { ExactAlarmAccess };

let access: ExactAlarmAccess = getExactAlarmAccess();
const listeners = new Set<() => void>();
let appStateSub: NativeEventSubscription | null = null;

/** Reads the current access, telling subscribers if it changed. */
export function refreshExactAlarmAccess(): ExactAlarmAccess {
  const next = getExactAlarmAccess();
  if (next !== access) {
    access = next;
    listeners.forEach((listener) => listener());
  }
  return access;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  appStateSub ??= AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshExactAlarmAccess();
  });
  // Nothing was listening while it may have changed.
  refreshExactAlarmAccess();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      appStateSub?.remove();
      appStateSub = null;
    }
  };
}

export function useExactAlarmAccess(): ExactAlarmAccess {
  return useSyncExternalStore(subscribe, () => access, () => 'not-applicable');
}

/** The system page where the person allows exact alarms for this app. */
export function openExactAlarmSettings(): boolean {
  return openNativeSettings();
}

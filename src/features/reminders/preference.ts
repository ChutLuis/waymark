/**
 * Global "Trip reminders" preference (Profile → Trip reminders). Device-local,
 * backed by AsyncStorage, and read by the itinerary editor so a person who has
 * switched reminders off isn't offered the per-item toggle. Defaults to on.
 *
 * Off means off: switching it off cancels every reminder already scheduled,
 * and scheduling checks it first (hooks.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { cancelAllReminders } from './store';

const STORAGE_KEY = 'waymark.remindersEnabled';

let enabled = true;
let hydration: Promise<void> | null = null;
/** Set once the person flips the switch, so a slow first read can't undo it. */
let changedThisSession = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function hydrateReminderPreference(): Promise<void> {
  hydration ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (raw !== null && !changedThisSession) enabled = raw === 'true';
    })
    .catch(() => {
      // Unreadable: keep the default.
    })
    .then(emit);
  return hydration;
}

export function getRemindersEnabled(): boolean {
  return enabled;
}

export function setRemindersEnabled(next: boolean): void {
  changedThisSession = true;
  enabled = next;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {
    // The preference won't survive a reload; harmless.
  });
  if (!next) void cancelAllReminders();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemindersEnabled(): boolean {
  return useSyncExternalStore(subscribe, getRemindersEnabled, () => true);
}

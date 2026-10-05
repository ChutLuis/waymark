/**
 * Global "Trip reminders" preference (Profile → Trip reminders). Device-local,
 * backed by AsyncStorage, and read by the itinerary editor so a person who has
 * switched reminders off isn't offered the per-item toggle. Defaults to on.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'waymark.remindersEnabled';

let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export async function hydrateReminderPreference(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw !== null) enabled = raw === 'true';
  } catch {
    // Unreadable: keep the default.
  }
  emit();
}

export function getRemindersEnabled(): boolean {
  return enabled;
}

export function setRemindersEnabled(next: boolean): void {
  enabled = next;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {
    // The preference won't survive a reload; harmless.
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRemindersEnabled(): boolean {
  return useSyncExternalStore(subscribe, getRemindersEnabled, () => true);
}
/**
 * Device-local reminder registry (v1 keeps reminders on the scheduling
 * device only — docs/ARCHITECTURE.md §8). Backed by AsyncStorage so
 * reminders survive an app reload; the in-memory map is the hot path.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type ReminderOffset = 0 | 60 | 1440;

export interface Reminder {
  itemId: string;
  offsetMinutes: ReminderOffset;
  notificationId: string | null;
}

const STORAGE_KEY = 'waymark.reminders.v1';

const reminders = new Map<string, Reminder>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

let hydration: Promise<void> | null = null;

export function hydrateReminders(): Promise<void> {
  hydration ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      if (!raw) return;
      for (const reminder of JSON.parse(raw) as Reminder[]) {
        reminders.set(reminder.itemId, reminder);
      }
      emit();
    })
    .catch(() => {
      // Unreadable store: reminders start empty on this device.
    });
  return hydration;
}

function persist(): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...reminders.values()])).catch(() => {
    // The reminder still fires this session; it just won't survive a reload.
  });
}

export function getReminder(itemId: string): Reminder | null {
  return reminders.get(itemId) ?? null;
}

export function setStoredReminder(reminder: Reminder): void {
  reminders.set(reminder.itemId, reminder);
  persist();
  emit();
}

export function removeStoredReminder(itemId: string): void {
  if (reminders.delete(itemId)) {
    persist();
    emit();
  }
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Re-renders subscribers whenever the reminder set changes (including
 * hydration), so list rows showing the bell glyph stay correct.
 */
export function useReminderVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

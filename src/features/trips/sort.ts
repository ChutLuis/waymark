/**
 * Pure list ordering for the trips screen: upcoming/current trips first
 * (soonest start first, dateless trips after), past trips below, most
 * recent first. A trip is "past" once its last known date is before today.
 */
import type { Trip } from '@/lib/types';

export interface SplitTrips<T extends Trip> {
  current: T[];
  past: T[];
}

export function splitTrips<T extends Trip>(trips: T[], todayKey: string): SplitTrips<T> {
  const lastDate = (trip: Trip) => trip.endDate ?? trip.startDate;

  const current: T[] = [];
  const past: T[] = [];
  for (const trip of trips) {
    const last = lastDate(trip);
    if (last && last < todayKey) past.push(trip);
    else current.push(trip);
  }

  current.sort((a, b) => {
    if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.startDate) return -1;
    if (b.startDate) return 1;
    return a.name.localeCompare(b.name);
  });
  past.sort((a, b) => (lastDate(b) as string).localeCompare(lastDate(a) as string));

  return { current, past };
}

/** "in 83 days" / "today" / "83 days ago" style countdown for the card meta. */
export function daysUntilLabel(startDate: string, todayKey: string): string | null {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const diff = Math.round((toUtc(startDate) - toUtc(todayKey)) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return `in ${diff} days`;
}

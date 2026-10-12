/**
 * The shoebox (Airmail v4.1 · 01) as pure functions: past trips grouped into
 * one sheet per year, newest first, and the lines printed about them.
 */
import { numberWord } from './stack';

interface PastTrip {
  id: string;
  startDate: string | null;
  endDate: string | null;
}

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** A past trip's postmark date: its last known date. */
function lastDate(trip: PastTrip): string | null {
  return trip.endDate ?? trip.startDate;
}

export function postmarkYear(trip: PastTrip): number | null {
  const date = lastDate(trip);
  return date ? Number(date.slice(0, 4)) : null;
}

/** "MAR", the month a past trip ended. */
export function postmarkMonth(trip: PastTrip): string {
  const date = lastDate(trip);
  return date ? MONTHS_SHORT[Number(date.slice(5, 7)) - 1] : '';
}

/** One sheet per year, newest year first and newest trip first within it. */
export function sheetsByYear<T extends PastTrip>(trips: T[]): { year: number; trips: T[] }[] {
  const byYear = new Map<number, T[]>();
  for (const trip of trips) {
    const year = postmarkYear(trip);
    if (year === null) continue;
    byYear.set(year, [...(byYear.get(year) ?? []), trip]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({
      year,
      trips: list.sort((a, b) => (lastDate(b) ?? '').localeCompare(lastDate(a) ?? '')),
    }));
}

/** "2026 · THREE TRIPS". */
export function sheetHeading(year: number, count: number): string {
  return `${year} · ${numberWord(count)} ${count === 1 ? 'trip' : 'trips'}`.toUpperCase();
}

/** "14 trips, postmarked · 2023 to 2026". */
export function albumSummary<T extends PastTrip>(trips: T[]): string {
  const years = trips.map(postmarkYear).filter((y): y is number => y !== null);
  const count = `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}, postmarked`;
  if (years.length === 0) return count;
  const first = Math.min(...years);
  const last = Math.max(...years);
  return first === last ? `${count} · ${last}` : `${count} · ${first} to ${last}`;
}

/** Under the latest past trip on Home: "and 13 more, back to 2023". */
export function moreLine<T extends PastTrip>(trips: T[]): string {
  const years = trips.map(postmarkYear).filter((y): y is number => y !== null);
  const more = trips.length - 1;
  return years.length ? `and ${more} more, back to ${Math.min(...years)}` : `and ${more} more`;
}

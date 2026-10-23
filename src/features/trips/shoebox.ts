/**
 * The shoebox (Airmail v4.1 · 01) as pure functions: past trips grouped into
 * one sheet per year, newest first, the lines printed about them, and the
 * sheet's row geometry.
 */
import { numberWord } from './stack';
import { DESTINATION_INFO, matchDestination } from './destinations';

interface PastTrip {
  id: string;
  name?: string;
  destination?: string | null;
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

/**
 * The city line of a trip's postmark, uppercased: the illustrated country's
 * chip (TIKAL), else the free-text destination, else the trip's name — so a
 * trip with no illustrated country is still postmarked, not left bare.
 */
export function postmarkCity(trip: PastTrip): string {
  const country = matchDestination(trip.destination ?? null);
  const text =
    (country ? DESTINATION_INFO[country].chip : trip.destination?.trim()) ||
    trip.name?.trim() ||
    '';
  return text.toUpperCase();
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

/**
 * Under the latest past trip on Home: "and 13 more, back to 2023", or "and 2
 * more this year" when every past trip is from this year.
 */
export function moreLine<T extends PastTrip>(trips: T[], thisYear: number): string {
  const years = trips.map(postmarkYear).filter((y): y is number => y !== null);
  const more = trips.length - 1;
  if (years.length === 0) return `and ${more} more`;
  if (years.length === trips.length && years.every((y) => y === thisYear)) return `and ${more} more this year`;
  return `and ${more} more, back to ${Math.min(...years)}`;
}

/* ------------------------------------------------------------------ */
/* Sheet geometry (README: 01 · the shoebox album)                     */
/* ------------------------------------------------------------------ */

/**
 * A sheet's grid, row by row. `centered` marks a row that does not fill its
 * columns: a short row floats to the sheet's middle, a full row stays flush
 * with the padding. Every partial row is centred, whatever row it is in — a
 * sheet of six is 4 + 2 centred, not 4 flush and 2 adrift.
 */
export function sheetRows<T>(trips: T[], columns: number): { trips: T[]; centered: boolean }[] {
  const rows: { trips: T[]; centered: boolean }[] = [];
  for (let i = 0; i < trips.length; i += columns) {
    const row = trips.slice(i, i + columns);
    rows.push({ trips: row, centered: row.length < columns });
  }
  return rows;
}

/**
 * One cell's width in points. The columns are floored to a whole device pixel:
 * an exact quarter, rounded up by layout, overflows the row by a fraction of a
 * pixel and wraps the last stamp onto a line of its own.
 */
export function stampCellWidth(
  sheetWidth: number,
  columns: number,
  gap: number,
  padX: number,
  scale: number,
): number {
  return Math.floor(((sheetWidth - 2 * padX - (columns - 1) * gap) / columns) * scale) / scale;
}

/** How far a quadratic `q` bend rises above its own baseline (at t = 0.5). */
const CANCEL_RISE = 1.25;

/**
 * The baselines of a postmark's wavy cancel lines: a pitch of `pitch`, the
 * first at `first`, and none whose stroke would leave the `height` box (the
 * band drawn in the design is 22 × 16 with three lines).
 */
export function cancelLineYs(height: number, pitch: number, stroke: number, first: number): number[] {
  const ys: number[] = [];
  for (let y = first; y + stroke / 2 <= height; y += pitch) {
    if (y - CANCEL_RISE - stroke / 2 < 0) continue;
    ys.push(y);
  }
  return ys;
}

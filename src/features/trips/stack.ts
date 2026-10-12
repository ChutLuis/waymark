/**
 * The Home trips (Airmail v4 · 01), as pure functions: the raised stack's
 * card positions, reordering, and the envelope faces' address wording.
 */

/** Every trip card is this tall; an envelope's header row is 38 pt. */
export const STACK_CARD_HEIGHT = 340;
export const STACK_PEEK = 38;
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * The stamp rail under the Home card (Airmail v4.1 · 01): one 48 × 56 stamp
 * per current trip, 10 apart, with a 28 pt divider where the year changes and
 * an unlabelled one before the undated trips.
 */
export const RAIL = {
  stampWidth: 48,
  stampHeight: 56,
  gap: 10,
  divider: 28,
  padX: 24,
  /** The picked stamp sits this much higher. */
  lift: 4,
  /** Room left on either side when the picked stamp scrolls into view. */
  spare: 24,
} as const;

export type RailEntry =
  | { kind: 'trip'; id: string; caption: string; x: number }
  | { kind: 'divider'; label: string | null; x: number };

interface RailTrip {
  id: string;
  startDate: string | null;
}

/** "NOW", "13 OCT", "NO DATE". */
export function railCaption(trip: RailTrip, onNow: boolean): string {
  if (onNow) return 'NOW';
  if (!trip.startDate) return 'NO DATE';
  const [, m, d] = trip.startDate.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/**
 * The rail's entries in the default order (on now, then by start date, then
 * undated), with each entry's x inside the scroll content.
 */
export function railEntries(trips: RailTrip[], onNowIds: ReadonlySet<string>): RailEntry[] {
  const entries: RailEntry[] = [];
  let x = RAIL.padX;
  let year: number | null = null;
  let seenUndated = false;
  const push = (entry: RailEntry, width: number) => {
    entries.push(entry);
    x += width + RAIL.gap;
  };
  for (const trip of trips) {
    if (trip.startDate) {
      const tripYear = Number(trip.startDate.slice(0, 4));
      if (year !== null && tripYear !== year) push({ kind: 'divider', label: String(tripYear), x }, RAIL.divider);
      year = tripYear;
    } else if (!seenUndated) {
      seenUndated = true;
      if (entries.length > 0) push({ kind: 'divider', label: null, x }, RAIL.divider);
    }
    push({ kind: 'trip', id: trip.id, caption: railCaption(trip, onNowIds.has(trip.id)), x }, RAIL.stampWidth);
  }
  return entries;
}

/**
 * Where to scroll so a stamp at `x` shows in full with `spare` either side,
 * or null when it already does.
 */
export function railScrollTarget(x: number, scrollX: number, viewport: number, contentWidth: number): number | null {
  const left = x - RAIL.spare;
  const right = x + RAIL.stampWidth + RAIL.spare;
  if (left >= scrollX && right <= scrollX + viewport) return null;
  const target = left < scrollX ? left : right - viewport;
  return Math.max(0, Math.min(target, Math.max(0, contentWidth - viewport)));
}

/**
 * Keeps the user's stack order across data refreshes: ids that are gone drop
 * out, new ids join at the back in their default order.
 */
export function reconcileOrder(previous: string[], defaults: string[]): string[] {
  const kept = previous.filter((id) => defaults.includes(id));
  const added = defaults.filter((id) => !kept.includes(id));
  return [...kept, ...added];
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parts(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** "13 – 15 October", "28 March – 6 April"; empty without dates. */
export function addressDates(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = parts(start);
  const e = parts(end);
  if (s.y === e.y && s.m === e.m) {
    return s.d === e.d ? `${s.d} ${MONTHS_LONG[s.m - 1]}` : `${s.d} – ${e.d} ${MONTHS_LONG[e.m - 1]}`;
  }
  return `${s.d} ${MONTHS_LONG[s.m - 1]} – ${e.d} ${MONTHS_LONG[e.m - 1]}`;
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** "six", "twelve", then digits. */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * The envelope face's third address line: "with Theo, six days",
 * "two nights", "pick dates to get a stamp".
 */
export function envelopeNote(opts: { hasDates: boolean; others: string[]; days: number }): string {
  if (!opts.hasDates) return 'pick dates to get a stamp';
  const first = opts.others.map((n) => n.trim().split(/\s+/)[0]).filter(Boolean);
  const length = `${numberWord(opts.days)} ${opts.days === 1 ? 'day' : 'days'}`;
  if (first.length === 0) {
    const nights = Math.max(0, opts.days - 1);
    return nights === 0 ? 'a day trip' : `${numberWord(nights)} ${nights === 1 ? 'night' : 'nights'}`;
  }
  const names =
    first.length === 1 ? first[0] : `${first.slice(0, -1).join(', ')} and ${first[first.length - 1]}`;
  return `with ${names}, ${length}`;
}

/** Status on an envelope's header row is blue when the trip is days away. */
export function isDaysAway(start: string | null, todayKey: string, within = 7): boolean {
  if (!start) return false;
  const a = parts(start);
  const b = parts(todayKey);
  const diff = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000);
  return diff >= 0 && diff <= within;
}

/**
 * x on the on-now card's mini route, proportional to time from the first
 * stop to the last; clamped to the route.
 */
export function miniRouteX(minutes: number, first: number, last: number, width: number): number {
  if (last <= first) return 0;
  const t = (minutes - first) / (last - first);
  return Math.min(width, Math.max(0, t * width));
}

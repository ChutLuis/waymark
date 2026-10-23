/**
 * Pure date-range calendar helpers for the Airbnb-style trip range picker.
 * All dates use ISO 'YYYY-MM-DD' strings so comparisons are timezone-free.
 */

/** `pending` is a leave date still waiting for its return date. */
export type DayRangeRole = 'none' | 'pending' | 'single' | 'start' | 'middle' | 'end';

export interface DateRange {
  start: string;
  end: string;
}

export const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Sunday first, to index with `getUTCDay()`. */
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function parseYearMonth(iso: string | null, fallback: Date): { year: number; month: number } {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m] = iso.split('-').map(Number);
    return { year: y, month: m - 1 };
  }
  return { year: fallback.getFullYear(), month: fallback.getMonth() };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** The calendar date `days` after (or before) `iso`. */
export function addDays(iso: string, days: number): string {
  const d = toUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The "+5n" / "+7n" presets: keep `start` and return `nights` later. */
export function nightsFrom(start: string, nights: number): DateRange {
  return { start, end: addDays(start, nights) };
}

/**
 * The "Wknd" preset: the next Friday to Sunday, counting `from` itself when it
 * is a Friday. A Saturday or Sunday moves on to the following weekend, so the
 * preset always selects a whole Friday-to-Sunday trip.
 */
export function nextWeekend(from: string): DateRange {
  const weekday = toUtcDate(from).getUTCDay();
  const start = addDays(from, (5 - weekday + 7) % 7);
  return { start, end: addDays(start, 2) };
}

/**
 * Monday-first calendar grid for a given year and 0-based month index.
 * Returns an array of 7-element weeks containing 'YYYY-MM-DD' or null.
 */
export function buildCalendarMonth(year: number, monthIndex: number): (string | null)[][] {
  const firstDayUtc = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const leadingEmpty = (firstDayUtc + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < leadingEmpty; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatIsoDate(year, monthIndex, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/**
 * The calendar's two-tap selection, so every tap has one predictable result:
 * - With no dates, or a finished range, a tap picks the leave date and waits
 *   for the return date.
 * - While waiting, a later day sets the return date, an earlier day moves the
 *   leave date there, and the leave date itself makes a one-day trip.
 * A finished range (a one-day trip included) only changes by starting over,
 * so tapping a one-day trip's day again waits for a return date once more.
 */
export function stepRangeSelection(
  current: { start: string | null; end: string | null },
  tapped: string,
): { start: string; end: string | null } {
  if (!current.start || current.end !== null) {
    return { start: tapped, end: null };
  }
  if (tapped < current.start) {
    return { start: tapped, end: null };
  }
  return { start: current.start, end: tapped };
}

/**
 * Visual role of a calendar day cell within `[start, end]`. A leave date that
 * is still waiting for its return date is `pending`, so it reads differently
 * from a finished one-day trip (`single`).
 */
export function dayRangeRole(
  day: string,
  start: string | null,
  end: string | null,
): DayRangeRole {
  if (!start) return 'none';
  if (!end) return day === start ? 'pending' : 'none';
  if (end <= start) return day === start ? 'single' : 'none';
  if (day === start) return 'start';
  if (day === end) return 'end';
  if (day > start && day < end) return 'middle';
  return 'none';
}

/**
 * The range band across one calendar week, in columns (0–7): from the centre
 * of the start day, or the left edge of the week's first day in the range
 * when the range began earlier, to the centre of the end day, or the right
 * edge of the last day in the range when it carries on. One band per week
 * keeps it seamless. Null when the week holds no part of a multi-day range.
 */
export function weekBand(
  week: readonly (string | null)[],
  start: string | null,
  end: string | null,
): { from: number; to: number } | null {
  const inRange = week.flatMap((day, index) => {
    const role = day ? dayRangeRole(day, start, end) : 'none';
    return role === 'start' || role === 'middle' || role === 'end' ? [{ index, role }] : [];
  });
  if (inRange.length === 0) return null;
  const first = inRange[0];
  const last = inRange[inRange.length - 1];
  return {
    from: first.role === 'start' ? first.index + 0.5 : first.index,
    to: last.role === 'end' ? last.index + 0.5 : last.index + 1,
  };
}

/**
 * The calendar's summary of a finished range: "13–23 NOV · 10 NIGHTS",
 * "28 SEP – 6 OCT · 8 NIGHTS", or "14 OCT · 1 DAY" for a one-day trip.
 */
export function rangeSummary(start: string, end: string): string {
  const s = toUtcDate(start);
  const e = toUtcDate(end);
  const nights = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000));
  const startMonth = MONTHS_SHORT[s.getUTCMonth()];
  const endMonth = MONTHS_SHORT[e.getUTCMonth()];
  const dates =
    nights === 0
      ? `${s.getUTCDate()} ${startMonth}`
      : startMonth === endMonth && s.getUTCFullYear() === e.getUTCFullYear()
        ? `${s.getUTCDate()}–${e.getUTCDate()} ${endMonth}`
        : `${s.getUTCDate()} ${startMonth} – ${e.getUTCDate()} ${endMonth}`;
  const length = nights === 0 ? '1 DAY' : `${nights} ${nights === 1 ? 'NIGHT' : 'NIGHTS'}`;
  return `${dates} · ${length}`;
}

const ROLE_LABELS: Record<DayRangeRole, string | null> = {
  none: null,
  pending: 'trip start, choose a return date',
  single: 'one-day trip',
  start: 'trip start',
  middle: 'in your trip',
  end: 'trip end',
};

/** "Wednesday 7 October, in your trip": a day cell for screen readers. */
export function dayAccessibilityLabel(day: string, role: DayRangeRole, isToday: boolean): string {
  const date = toUtcDate(day);
  const name = `${WEEKDAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
  return [name, ROLE_LABELS[role], isToday ? 'today' : null].filter(Boolean).join(', ');
}

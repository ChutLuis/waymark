/**
 * Pure date/text formatting helpers. No React Native imports so these can be
 * unit-tested with Vitest directly.
 */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function monthShort(date: Date): string {
  return MONTH_NAMES[date.getMonth()].slice(0, 3);
}

/**
 * Date-only strings ("2026-10-12") are parsed by `new Date` as UTC midnight,
 * which shifts a calendar date backwards in western timezones. Parse them as
 * local dates instead.
 */
function parseLocal(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(iso);
}

/** "Sunday, October 12" */
export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** "10:40" (24-hour, zero-padded minutes) */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "Oct 12, 10:40" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${monthShort(d)} ${d.getDate()}, ${formatTime(iso)}`;
}

/** "Oct 12, 2026" (accepts date-only strings). */
export function formatDate(iso: string): string {
  const d = parseLocal(iso);
  return `${monthShort(d)} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Local "YYYY-MM-DD" for a Date. */
export function toDateOnly(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

/** "Oct 12 – 19" or "Oct 28 – Nov 2"; falls back gracefully when dates are missing. */
export function formatDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso && !endIso) return '';
  if (startIso && !endIso) {
    const s = parseLocal(startIso);
    return `From ${monthShort(s)} ${s.getDate()}`;
  }
  if (!startIso && endIso) {
    const e = parseLocal(endIso);
    return `Until ${monthShort(e)} ${e.getDate()}`;
  }
  const s = parseLocal(startIso as string);
  const e = parseLocal(endIso as string);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${monthShort(s)} ${s.getDate()} – ${e.getDate()}`;
  }
  return `${monthShort(s)} ${s.getDate()} – ${monthShort(e)} ${e.getDate()}`;
}

/** "Jul 14", or "Today" / "Yesterday" relative to `now`. */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${monthShort(d)} ${d.getDate()}`;
}

/** Local calendar-day key, e.g. "2026-10-12". */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Mia Junot" -> "MJ"; single names use the first two letters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

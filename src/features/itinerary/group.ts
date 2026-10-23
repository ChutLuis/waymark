/**
 * Pure grouping logic for the itinerary list: items grouped by local
 * calendar day, days sorted ascending, untimed items collected in an
 * "Unscheduled" section that always sorts last.
 */
import { dayKey, formatDayHeader } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';

export const UNSCHEDULED_KEY = 'unscheduled';

export interface ItineraryDaySection {
  key: string;
  title: string;
  items: ItineraryItem[];
}

export function groupItineraryByDay(items: ItineraryItem[]): ItineraryDaySection[] {
  const byDay = new Map<string, ItineraryItem[]>();
  for (const item of items) {
    const key = item.startAt ? dayKey(item.startAt) : UNSCHEDULED_KEY;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(item);
    else byDay.set(key, [item]);
  }

  const sections: ItineraryDaySection[] = [];
  const dayKeys = [...byDay.keys()]
    .filter((k) => k !== UNSCHEDULED_KEY)
    .sort((a, b) => a.localeCompare(b));

  for (const key of dayKeys) {
    const dayItems = (byDay.get(key) as ItineraryItem[]).sort((a, b) => {
      const timeDiff =
        new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime();
      return timeDiff !== 0 ? timeDiff : a.sortOrder - b.sortOrder;
    });
    sections.push({
      key,
      title: formatDayHeader(dayItems[0].startAt as string),
      items: dayItems,
    });
  }

  const unscheduled = byDay.get(UNSCHEDULED_KEY);
  if (unscheduled) {
    sections.push({
      key: UNSCHEDULED_KEY,
      title: 'Unscheduled',
      items: unscheduled.sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/* Plan screen helpers (README: 06 · Plan)                             */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface TripDay {
  /** Local YYYY-MM-DD. */
  key: string;
  /** "SUN". */
  weekday: string;
  /** "28". */
  day: number;
  /** "SUN 28" accessibility label. */
  label: string;
}

function parseDateOnly(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateOnlyKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Every day from start to end inclusive, as stamp labels. Empty when the trip
 * has no dates.
 */
export function tripDaysList(startDate: string | null, endDate: string | null): TripDay[] {
  if (!startDate || !endDate) return [];
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (end < start) return [];
  const days: TripDay[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const copy = new Date(d);
    days.push({
      key: dateOnlyKey(copy),
      weekday: WEEKDAYS[copy.getDay()],
      day: copy.getDate(),
      label: `${WEEKDAYS[copy.getDay()]} ${copy.getDate()}`,
    });
  }
  return days;
}

/** Today when it falls within the trip, otherwise the first day. */
export function defaultSelectedDay(days: TripDay[], todayKey: string): string | null {
  if (days.length === 0) return null;
  return days.some((d) => d.key === todayKey) ? todayKey : days[0].key;
}

/** New stops belong to the selected local day; ANY/no dates stay unscheduled. */
export function newItemStartAt(selectedDay: string | null): string | null {
  if (!selectedDay || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDay)) return null;
  const date = parseDateOnly(selectedDay);
  if (dateOnlyKey(date) !== selectedDay) return null;
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

export type DayRow =
  | { type: 'item'; key: string; item: ItineraryItem }
  | { type: 'free'; key: string; minutes: number };

const MIN_GAP_MINUTES = 15;

/**
 * The rows for a single day: its timed items in order, with a free-time row
 * where the gap between one stop's end and the next stop's start is at least
 * 15 minutes. Untimed and other days' items are excluded.
 */
export function buildDayRows(items: ItineraryItem[], day: string): DayRow[] {
  const dayItems = items
    .filter((item) => item.startAt && dayKey(item.startAt) === day)
    .sort((a, b) => new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime());

  const rows: DayRow[] = [];
  dayItems.forEach((item, index) => {
    rows.push({ type: 'item', key: item.id, item });
    const next = dayItems[index + 1];
    if (item.endAt && next?.startAt) {
      const minutes = Math.round(
        (new Date(next.startAt).getTime() - new Date(item.endAt).getTime()) / 60_000,
      );
      if (minutes >= MIN_GAP_MINUTES) {
        rows.push({ type: 'free', key: `free-${item.id}`, minutes });
      }
    }
  });
  return rows;
}

/**
 * The next stop that isn't done and starts within 24 hours of `now`
 * (README: the Next card). Null when none qualifies.
 */
export function nextStop(items: ItineraryItem[], now: Date): ItineraryItem | null {
  const horizon = now.getTime() + 24 * 3_600_000;
  const candidates = items
    .filter((item) => item.status !== 'done' && item.startAt)
    .filter((item) => {
      const t = new Date(item.startAt as string).getTime();
      return t >= now.getTime() && t <= horizon;
    })
    .sort((a, b) => new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime());
  return candidates[0] ?? null;
}

/**
 * How many of a day's stops still need doing. Completion comes from the
 * status a member set, never from the clock: a planned stop whose time has
 * passed is overdue, not done.
 */
export function stopsToGo(items: readonly Pick<ItineraryItem, 'status'>[]): number {
  return items.filter((item) => item.status !== 'done').length;
}

/** Minutes until an ISO timestamp (can be negative). */
export function minutesUntil(iso: string, now: Date): number {
  return Math.round((new Date(iso).getTime() - now.getTime()) / 60_000);
}

/** The row index the NOW line sits before, for the selected day. */
export function nowRowIndex(rows: DayRow[], now: Date): number | null {
  let index = 0;
  for (const row of rows) {
    if (row.type === 'item' && row.item.startAt) {
      if (new Date(row.item.startAt).getTime() > now.getTime()) return index;
    }
    index += 1;
  }
  return rows.length;
}

const STATUS_LABELS: Record<ItineraryItem['status'], string> = {
  planned: 'PLANNED',
  confirmed: 'CONFIRMED',
  done: 'DONE',
};

export function statusLabel(status: ItineraryItem['status']): string {
  return STATUS_LABELS[status];
}

/**
 * Plan route geometry (Airmail v4 · Plan entrance). Stops sit at heights
 * proportional to clock time, about 24 pt per hour, but never closer than
 * the previous row's height plus a minimum gap, so rows don't collide. Pure
 * and unit-tested; the screen measures row heights and feeds them back in.
 */
import type { ItineraryStatus } from '@/lib/types';

export const ROUTE = {
  /** Points per hour of clock time. */
  pxPerHour: 24,
  /** Minimum gap between one row's bottom and the next row's top. */
  gap: 16,
  /** Minimum gap when a "free time" label sits between two rows. */
  freeGap: 40,
} as const;

/** Today's "now" slot (README 02 v4.1.1): a row of its own for the plane and the NOW tag. */
export const NOW_SLOT = {
  height: 30,
  /** The NOW tag's height, centred in the slot. */
  tag: 18,
} as const;

export interface RouteRowInput {
  /** Minutes since local midnight, or null for an untimed stop. */
  minutes: number | null;
  /** Measured (or estimated) row height in pt. */
  height: number;
  /** A free-time label sits between this row and the one before it. */
  freeBefore?: boolean;
  /** The NOW slot: placed under the row before it, never by time. */
  slot?: boolean;
}

/**
 * Where today's NOW slot goes, as the row index it sits before: in the gap
 * after the last timed stop at or before now, so 0 before the first stop and
 * the row count after the last.
 */
export function nowSlotIndex(minutes: (number | null)[], nowMinutes: number): number {
  let at = 0;
  minutes.forEach((m, i) => {
    if (m !== null && m <= nowMinutes) at = i + 1;
  });
  return at;
}

/**
 * The rows with the NOW slot inserted before row `at`. A free-time label in
 * that gap moves onto the slot, so the slot sits under the label and the rows
 * below move down to make room.
 */
export function withNowSlot(rows: RouteRowInput[], at: number): RouteRowInput[] {
  const out = rows.map((r) => ({ ...r }));
  const next = out[at];
  const slot: RouteRowInput = { minutes: null, height: NOW_SLOT.height, freeBefore: next?.freeBefore ?? false, slot: true };
  if (next) next.freeBefore = false;
  out.splice(at, 0, slot);
  return out;
}

/** Top offset of each row, in input order. */
export function layoutRoute(rows: RouteRowInput[], opts: typeof ROUTE = ROUTE): number[] {
  const origin = rows.find((r) => r.minutes !== null && !r.slot)?.minutes ?? 0;
  // The time scale runs from wherever the first timed row lands, so a slot
  // above it moves the whole day down.
  let originTop: number | null = null;
  const tops: number[] = [];
  rows.forEach((row, i) => {
    const timedRow = row.minutes !== null && !row.slot;
    const proportional =
      timedRow && originTop !== null ? originTop + ((row.minutes! - origin) / 60) * opts.pxPerHour : 0;
    const floor =
      i === 0 ? 0 : tops[i - 1] + rows[i - 1].height + (row.freeBefore ? opts.freeGap : opts.gap);
    const top = Math.max(proportional, floor);
    if (timedRow && originTop === null) originTop = top;
    tops.push(top);
  });
  return tops;
}

export interface RoutePoint {
  minutes: number | null;
  /** The stop stamp's centre on the route line (the slot's centre for the slot). */
  y: number;
  status?: ItineraryStatus;
  /** Today's NOW slot. */
  slot?: boolean;
}

function timed(points: RoutePoint[]): { minutes: number; y: number; status?: ItineraryStatus }[] {
  return points.filter((p): p is RoutePoint & { minutes: number } => p.minutes !== null);
}

/**
 * Where "now" sits on the route: the NOW slot's centre when the route has one;
 * otherwise between the two timed stops around it, proportional to time and
 * clamped to the first and last stops. Null when no stop has a time.
 */
export function routeYAt(points: RoutePoint[], nowMinutes: number): number | null {
  const slot = points.find((p) => p.slot);
  if (slot) return slot.y;
  const list = timed(points);
  if (list.length === 0) return null;
  if (nowMinutes <= list[0].minutes) return list[0].y;
  const last = list[list.length - 1];
  if (nowMinutes >= last.minutes) return last.y;
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (nowMinutes >= a.minutes && nowMinutes <= b.minutes) {
      const span = b.minutes - a.minutes;
      return span === 0 ? a.y : a.y + ((b.y - a.y) * (nowMinutes - a.minutes)) / span;
    }
  }
  return last.y;
}

/**
 * Where the plane takes off on focus: the centre of the last completed or
 * confirmed stop before now, else the first stop.
 */
export function flightStartY(points: RoutePoint[], nowMinutes: number): number | null {
  const list = timed(points);
  if (list.length === 0) return null;
  let start = list[0].y;
  for (const p of list) {
    if (p.minutes > nowMinutes) break;
    if (p.status === 'done' || p.status === 'confirmed') start = p.y;
  }
  return start;
}

/** Minutes since local midnight for an ISO timestamp. */
export function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** "3 stops · 1 still to go", "1 stop · all done", "No stops yet". */
export function stopsSummary(count: number, toGo: number): string {
  if (count === 0) return 'No stops yet';
  const stops = `${count} ${count === 1 ? 'stop' : 'stops'}`;
  if (toGo === 0) return `${stops} · all done`;
  if (toGo === count) return stops;
  return `${stops} · ${toGo} still to go`;
}

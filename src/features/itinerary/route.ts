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

export interface RouteRowInput {
  /** Minutes since local midnight, or null for an untimed stop. */
  minutes: number | null;
  /** Measured (or estimated) row height in pt. */
  height: number;
  /** A free-time label sits between this row and the one before it. */
  freeBefore?: boolean;
}

/** Top offset of each row, in input order. */
export function layoutRoute(rows: RouteRowInput[], opts: typeof ROUTE = ROUTE): number[] {
  const origin = rows.find((r) => r.minutes !== null)?.minutes ?? 0;
  const tops: number[] = [];
  rows.forEach((row, i) => {
    const proportional =
      row.minutes === null ? 0 : ((row.minutes - origin) / 60) * opts.pxPerHour;
    const floor =
      i === 0 ? 0 : tops[i - 1] + rows[i - 1].height + (row.freeBefore ? opts.freeGap : opts.gap);
    tops.push(Math.max(proportional, floor));
  });
  return tops;
}

export interface RoutePoint {
  minutes: number | null;
  /** The stop stamp's centre on the route line. */
  y: number;
  status?: ItineraryStatus;
}

function timed(points: RoutePoint[]): { minutes: number; y: number; status?: ItineraryStatus }[] {
  return points.filter((p): p is RoutePoint & { minutes: number } => p.minutes !== null);
}

/**
 * Where "now" sits on the route: between the two timed stops around it,
 * proportional to time; clamped to the first and last stops. Null when no
 * stop has a time.
 */
export function routeYAt(points: RoutePoint[], nowMinutes: number): number | null {
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

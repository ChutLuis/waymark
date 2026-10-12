/**
 * Packing (Airmail v4 · 08) as pure functions: which bags are full, which
 * just became full (PACKED slams on that transition only, never on mount),
 * and which bag a dragged tag is over.
 */
import type { PackingItem } from '@/lib/types';

/** A bag is packed when it holds at least one item and every item is ticked. */
export function isBagPacked(items: Pick<PackingItem, 'isPacked'>[]): boolean {
  return items.length > 0 && items.every((i) => i.isPacked);
}

/**
 * Bags that went from not-all-checked to all-checked between two snapshots.
 * A bag missing from `previous` (first render, a new member) never slams.
 */
export function newlyPacked(previous: Record<string, boolean> | null, next: Record<string, boolean>): string[] {
  if (!previous) return [];
  return Object.keys(next).filter((bag) => next[bag] && previous[bag] === false);
}

export interface BagRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The bag under the finger: any bag whose rect, extended upward by `slop` for
 * its handle, contains the point.
 */
export function bagAt(rects: BagRect[], x: number, y: number, slop: number): string | null {
  'worklet';
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.width && y >= r.y - slop && y <= r.y + r.height) return r.id;
  }
  return null;
}

/** Loose tags sit at small rotations between −1.5° and 1.2°. */
const TAG_TILTS = [-1.5, 1.2, -0.6, 0.8, -1.1, 0.4];
export function tagTilt(index: number): number {
  return TAG_TILTS[index % TAG_TILTS.length];
}

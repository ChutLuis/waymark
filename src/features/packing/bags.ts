/**
 * Packing (Airmail v4 · 08) as pure functions: which bags are full, which
 * just became full (PACKED slams on that transition only, never on mount),
 * which bag a dragged tag is over, and how items group into bags and loose
 * tags.
 */
import type { PackingItem } from '@/lib/types';

/** A bag is packed when it holds at least one item and every item is ticked. */
export function isBagPacked(items: Pick<PackingItem, 'isPacked'>[]): boolean {
  return items.length > 0 && items.every((i) => i.isPacked);
}

/**
 * PACKED slams only when a bag goes from not-all-checked to all-checked. A
 * bag seen for the first time (`previous` null: mount, a refetch of a new
 * bag) never slams, and nothing happens when a bag stops being full.
 */
export function becamePacked(previous: boolean | null, next: boolean): boolean {
  return previous === false && next;
}

/**
 * True when ticking `item` would make this bag full: the bag has something in
 * it and every other item is already ticked. Used to arm the slam for a press
 * on this device, so a refetch or a rollback cannot set it off.
 */
export function completesBag(items: PackingItem[], item: PackingItem): boolean {
  if (item.isPacked) return false;
  const others = items.filter((i) => i.id !== item.id);
  return items.length > 0 && others.every((i) => i.isPacked);
}

export interface PackingGroups {
  /** Unassigned items and items whose assignee is no longer on the trip. */
  loose: PackingItem[];
  /** Member user id → their items, in list order. */
  byBag: Map<string, PackingItem[]>;
}

/**
 * The packing screen's two columns. An item assigned to someone who is no
 * longer a trip member is treated exactly like an unassigned one: it stays
 * visible as a loose tag and can be claimed again, instead of vanishing.
 */
export function groupPackingItems(items: PackingItem[], memberIds: Iterable<string>): PackingGroups {
  const members = new Set(memberIds);
  const loose: PackingItem[] = [];
  const byBag = new Map<string, PackingItem[]>();
  for (const item of items) {
    if (item.assignedTo === null || !members.has(item.assignedTo)) {
      loose.push(item);
      continue;
    }
    byBag.set(item.assignedTo, [...(byBag.get(item.assignedTo) ?? []), item]);
  }
  return { loose, byBag };
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

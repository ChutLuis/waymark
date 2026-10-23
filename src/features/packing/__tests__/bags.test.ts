import { describe, expect, it } from 'vitest';
import { bagAt, becamePacked, completesBag, groupPackingItems, isBagPacked, tagTilt } from '../bags';
import type { PackingItem } from '@/lib/types';

function item(id: string, assignedTo: string | null): PackingItem {
  return {
    id,
    tripId: 'trip-1',
    label: id,
    quantity: 1,
    assignedTo,
    isPacked: false,
    sortOrder: 0,
    createdBy: null,
  };
}

describe('groupPackingItems', () => {
  it('puts an item assigned to a member in that member\'s bag', () => {
    const { loose, byBag } = groupPackingItems([item('a', 'me'), item('b', 'theo')], ['me', 'theo']);
    expect(loose).toEqual([]);
    expect(byBag.get('me')?.map((i) => i.id)).toEqual(['a']);
    expect(byBag.get('theo')?.map((i) => i.id)).toEqual(['b']);
  });

  it('keeps an item assigned to a former member visible as a loose tag', () => {
    const { loose, byBag } = groupPackingItems([item('a', 'gone')], ['me', 'theo']);
    expect(loose.map((i) => i.id)).toEqual(['a']);
    expect(byBag.size).toBe(0);
  });

  it('treats an unassigned item as loose', () => {
    const { loose, byBag } = groupPackingItems([item('a', null)], ['me']);
    expect(loose.map((i) => i.id)).toEqual(['a']);
    expect(byBag.size).toBe(0);
  });

  it('mixes all three cases and keeps list order', () => {
    const { loose, byBag } = groupPackingItems(
      [item('a', 'gone'), item('b', 'me'), item('c', null), item('d', 'me'), item('e', 'gone')],
      ['me'],
    );
    expect(loose.map((i) => i.id)).toEqual(['a', 'c', 'e']);
    expect(byBag.get('me')?.map((i) => i.id)).toEqual(['b', 'd']);
  });

  it('has no bags for members with nothing assigned', () => {
    const { loose, byBag } = groupPackingItems([], ['me']);
    expect(loose).toEqual([]);
    expect(byBag.has('me')).toBe(false);
  });
});

describe('isBagPacked', () => {
  it('needs at least one item, all ticked', () => {
    expect(isBagPacked([])).toBe(false);
    expect(isBagPacked([{ isPacked: true }, { isPacked: false }])).toBe(false);
    expect(isBagPacked([{ isPacked: true }, { isPacked: true }])).toBe(true);
  });
});

describe('becamePacked', () => {
  it('slams on the transition to all-checked', () => {
    expect(becamePacked(false, true)).toBe(true);
  });

  it('never slams on mount', () => {
    expect(becamePacked(null, true)).toBe(false);
  });

  it('stays still when a full bag stays full (a refetch)', () => {
    expect(becamePacked(true, true)).toBe(false);
  });

  it('does nothing when a bag stops being full', () => {
    expect(becamePacked(true, false)).toBe(false);
  });
});

describe('completesBag', () => {
  const a = item('a', 'me');
  const b = item('b', 'me');

  it('is true when the press ticks the last unpacked item', () => {
    expect(completesBag([{ ...a, isPacked: true }, b], b)).toBe(true);
  });

  it('is false when another item is still unpacked', () => {
    expect(completesBag([a, b], a)).toBe(false);
  });

  it('is false for an untick, even in a full bag', () => {
    const packed = { ...a, isPacked: true };
    expect(completesBag([packed, { ...b, isPacked: true }], packed)).toBe(false);
  });

  it('is false for an empty bag', () => {
    expect(completesBag([], a)).toBe(false);
  });
});

describe('bagAt', () => {
  const rects = [
    { id: 'me', x: 14, y: 400, width: 178, height: 220 },
    { id: 'theo', x: 202, y: 400, width: 178, height: 220 },
  ];

  it('finds the bag under the finger', () => {
    expect(bagAt(rects, 100, 500, 12)).toBe('me');
    expect(bagAt(rects, 300, 500, 12)).toBe('theo');
  });

  it('counts 12 pt above a bag for its handle', () => {
    expect(bagAt(rects, 100, 390, 12)).toBe('me');
    expect(bagAt(rects, 100, 386, 12)).toBeNull();
  });

  it('misses between and outside the bags', () => {
    expect(bagAt(rects, 197, 500, 12)).toBeNull();
    expect(bagAt(rects, 100, 700, 12)).toBeNull();
  });
});

describe('tagTilt', () => {
  it('stays within −1.5° and 1.2°', () => {
    for (let i = 0; i < 12; i++) {
      expect(tagTilt(i)).toBeGreaterThanOrEqual(-1.5);
      expect(tagTilt(i)).toBeLessThanOrEqual(1.2);
    }
  });
});

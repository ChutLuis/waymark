import { describe, expect, it } from 'vitest';
import { bagAt, becamePacked, isBagPacked, tagTilt } from '../bags';

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

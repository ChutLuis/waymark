import { describe, expect, it } from 'vitest';
import { perforationOffsets, stampOutline } from '../perforation';

describe('perforationOffsets', () => {
  it('spaces a whole multiple of the pitch exactly', () => {
    expect(perforationOffsets(56, 8)).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);
    expect(perforationOffsets(16, 8)).toEqual([0, 8, 16]);
  });

  it('always starts and ends on the true corners', () => {
    for (const length of [20, 24, 40, 42, 48, 56, 72, 88, 90, 99, 104]) {
      for (const pitch of [4, 8]) {
        const offsets = perforationOffsets(length, pitch);
        expect(offsets[0]).toBe(0);
        expect(offsets[offsets.length - 1]).toBe(length);
      }
    }
  });

  it('spreads evenly (close to the pitch) when the side is not a multiple', () => {
    // 42 / 8 = 5.25 -> 5 gaps of 8.4
    const offsets = perforationOffsets(42, 8);
    expect(offsets).toHaveLength(6);
    expect(offsets[1]).toBeCloseTo(8.4, 5);
    expect(offsets[5]).toBe(42);
    // Every gap is within 0.5 of the pitch.
    for (let i = 1; i < offsets.length; i += 1) {
      expect(Math.abs(offsets[i] - offsets[i - 1] - 8)).toBeLessThanOrEqual(0.5);
    }
  });

  it('degrades safely for non-positive input', () => {
    expect(perforationOffsets(0, 8)).toEqual([0]);
    expect(perforationOffsets(56, 0)).toEqual([0]);
  });
});
describe('stampOutline', () => {
  it('is the plain rectangle without perforations', () => {
    expect(stampOutline(56, 72, 8, 3, false)).toBe('M0 0H56V72H0Z');
  });

  it('notches every hole: a half circle per side hole and a quarter per corner', () => {
    const d = stampOutline(56, 72, 8, 3);
    const sideHoles = (perforationOffsets(56, 8).length - 2) * 2 + (perforationOffsets(72, 8).length - 2) * 2;
    expect(d.match(/A/g)).toHaveLength(sideHoles + 4);
    expect(d.startsWith('M3 0')).toBe(true);
    expect(d.endsWith('A3 3 0 0 0 3 0Z')).toBe(true);
  });

  it('keeps every point on the frame or inside a notch', () => {
    const d = stampOutline(30, 35, 4, 1.5);
    const points = [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(30);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(35);
      expect(x === 0 || x === 30 || y === 0 || y === 35).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { perforationOffsets } from '../perforation';

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
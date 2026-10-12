import { describe, expect, it } from 'vitest';
import { motion } from '@/theme/tokens';
import { bezierAt, clamp, motionMs, sampleTrack, segmentDurations, window01 } from '../curves';
import { dealCard, dropIn, packedSlam } from '../keyframes';

describe('bezierAt', () => {
  it('hits both end points', () => {
    for (const curve of Object.values(motion.easing)) {
      expect(bezierAt(curve, 0)).toBe(0);
      expect(bezierAt(curve, 1)).toBe(1);
    }
  });

  it('is the identity for linear', () => {
    for (const x of [0.1, 0.33, 0.5, 0.9]) expect(bezierAt(motion.easing.linear, x)).toBeCloseTo(x, 6);
  });

  it('matches CSS `ease` at the midpoint', () => {
    // cubic-bezier(.25,.1,.25,1) at 0.5 is 0.8024 in every browser.
    expect(bezierAt([0.25, 0.1, 0.25, 1], 0.5)).toBeCloseTo(0.8024, 3);
  });

  it('is symmetric for a symmetric curve', () => {
    const curve = [0.42, 0, 0.58, 1] as const;
    expect(bezierAt(curve, 0.3) + bezierAt(curve, 0.7)).toBeCloseTo(1, 5);
  });

  it('overshoots past 1 for the indicator and spring-home curves', () => {
    const peak = (curve: readonly [number, number, number, number]) =>
      Math.max(...Array.from({ length: 99 }, (_, i) => bezierAt(curve, (i + 1) / 100)));
    expect(peak(motion.easing.indicator)).toBeGreaterThan(1.05);
    expect(peak(motion.easing.springHome)).toBeGreaterThan(1.05);
    expect(peak(motion.easing.standard)).toBeLessThanOrEqual(1);
  });

  it('accelerates for gravity and decelerates for standard', () => {
    expect(bezierAt(motion.easing.gravity, 0.5)).toBeLessThan(0.5);
    expect(bezierAt(motion.easing.standard, 0.5)).toBeGreaterThan(0.5);
  });
});

describe('sampleTrack', () => {
  const track = { at: [0, 0.7, 1], v: [-90, 5, 0] };

  it('returns the keyframe values at their offsets', () => {
    expect(sampleTrack(track, 0, motion.easing.settle)).toBe(-90);
    expect(sampleTrack(track, 0.7, motion.easing.settle)).toBeCloseTo(5, 6);
    expect(sampleTrack(track, 1, motion.easing.settle)).toBe(0);
  });

  it('clamps outside 0..1', () => {
    expect(sampleTrack(track, -1, motion.easing.settle)).toBe(-90);
    expect(sampleTrack(track, 2, motion.easing.settle)).toBe(0);
  });

  it('eases each segment on its own', () => {
    // Halfway through the first segment, linear sits at the midpoint and the
    // decelerating curve is already past it.
    const half = 0.35;
    expect(sampleTrack(track, half, motion.easing.linear)).toBeCloseTo(-42.5, 6);
    expect(sampleTrack(track, half, motion.easing.settle)).toBeGreaterThan(-42.5);
  });

  it('holds a value between equal keyframes', () => {
    const opacity = { at: [0, 0.2, 1], v: [0, 1, 1] };
    expect(sampleTrack(opacity, 0.6, motion.easing.settle)).toBe(1);
  });
});

describe('keyframes', () => {
  it('alternates the deal rotation by card index', () => {
    expect(dealCard(0).rotate.v[0]).toBe(-5);
    expect(dealCard(1).rotate.v[0]).toBe(5);
    expect(dealCard(0).rotate.v[1]).toBe(1);
  });

  it('settles the drop at −0.2·r', () => {
    expect(dropIn(10).rotate.v).toEqual([10, -2, 0]);
  });

  it('rests PACKED at −8°', () => {
    expect(packedSlam.rotate.v.at(-1)).toBe(-8);
  });

  it('keeps every track ascending from 0 to 1', () => {
    for (const track of [...Object.values(dealCard(2)), ...Object.values(packedSlam)]) {
      expect(track.at[0]).toBe(0);
      expect(track.at.at(-1)).toBe(1);
      expect(track.at.length).toBe(track.v.length);
      for (let i = 1; i < track.at.length; i++) expect(track.at[i]).toBeGreaterThan(track.at[i - 1]);
    }
  });
});

describe('timing helpers', () => {
  it('maps percentage keyframes to segment durations', () => {
    const [a, b, c] = segmentDurations([0, 0.2, 0.7, 1], motion.duration.deal);
    expect(a).toBeCloseTo(128, 6);
    expect(b).toBeCloseTo(320, 6);
    expect(c).toBeCloseTo(192, 6);
  });

  it('drops every duration to 0 with reduced motion', () => {
    expect(motionMs(motion.duration.expand, true)).toBe(0);
    expect(motionMs(motion.duration.expand, false)).toBe(580);
  });

  it('windows and clamps progress', () => {
    expect(window01(0.5, 0.25, 0.75)).toBe(0.5);
    expect(window01(0.1, 0.25, 0.75)).toBe(0);
    expect(window01(0.9, 0.25, 0.75)).toBe(1);
    expect(clamp(12, -8, 8)).toBe(8);
  });
});

describe('motion tokens', () => {
  it('keeps every easing a valid cubic-bezier', () => {
    for (const [name, curve] of Object.entries(motion.easing)) {
      expect(curve, name).toHaveLength(4);
      expect(curve[0]).toBeGreaterThanOrEqual(0);
      expect(curve[0]).toBeLessThanOrEqual(1);
      expect(curve[2]).toBeGreaterThanOrEqual(0);
      expect(curve[2]).toBeLessThanOrEqual(1);
    }
  });

  it('places the sheet ring after the last of the ten stamps prints', () => {
    const lastStampEnds = 9 * motion.stagger.sheetStamp + 380;
    expect(motion.choreo.sheet.ringAt).toBeGreaterThan(lastStampEnds - motion.choreo.sheet.d0);
  });

  it('cracks the seal only after the full hold', () => {
    expect(motion.duration.hold).toBe(600);
  });
});

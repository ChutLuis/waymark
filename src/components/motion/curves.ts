/**
 * Pure motion maths shared by the JS and UI threads. Every function is a
 * worklet with no React Native imports, so Vitest can run it and Reanimated
 * can call it from `useAnimatedStyle`.
 */
import type { BezierTuple } from '@/theme/tokens';

/** x(t) or y(t) of a cubic bezier with end points 0 and 1. */
function bezierCoord(t: number, p1: number, p2: number): number {
  'worklet';
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

function bezierSlope(t: number, p1: number, p2: number): number {
  'worklet';
  const u = 1 - t;
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` evaluated at progress `x` (0..1). Solves
 * x(t) = x with Newton's method, falling back to bisection where the slope is
 * flat, then returns y(t). y may leave [0, 1] for overshooting curves.
 */
export function bezierAt(curve: BezierTuple, x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  if (x1 === y1 && x2 === y2) return x;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bezierCoord(t, x1, x2) - x;
    if (Math.abs(err) < 1e-6) return bezierCoord(t, y1, y2);
    const slope = bezierSlope(t, x1, x2);
    if (Math.abs(slope) < 1e-6) break;
    t -= err / slope;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 30; i++) {
    const cx = bezierCoord(t, x1, x2);
    if (Math.abs(cx - x) < 1e-6) break;
    if (cx < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return bezierCoord(t, y1, y2);
}

/**
 * A keyframe track: values at offsets (0..1, ascending, first 0, last 1).
 * Mirrors a CSS keyframe list for one property.
 */
export interface Track {
  readonly at: readonly number[];
  readonly v: readonly number[];
}

/**
 * Samples a track at overall progress `p` (0..1). Each segment between two
 * offsets runs the full easing curve, as the README maps percentage keyframes
 * to `withSequence` segments that each use the moment's easing.
 */
export function sampleTrack(track: Track, p: number, curve: BezierTuple): number {
  'worklet';
  const { at, v } = track;
  const last = at.length - 1;
  if (p <= at[0]) return v[0];
  if (p >= at[last]) return v[last];
  let i = 0;
  while (i < last - 1 && p > at[i + 1]) i++;
  const span = at[i + 1] - at[i];
  const local = span <= 0 ? 1 : (p - at[i]) / span;
  return v[i] + (v[i + 1] - v[i]) * bezierAt(curve, local);
}

/** Durations of each segment of a track, for a total duration in ms. */
export function segmentDurations(at: readonly number[], total: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < at.length; i++) out.push((at[i] - at[i - 1]) * total);
  return out;
}

/** Reduced motion: every duration and delay is 0, so a moment jumps to its end. */
export function motionMs(ms: number, reduced: boolean): number {
  return reduced ? 0 : ms;
}

/** Linear interpolation, clamped to the [from, to] progress window. */
export function window01(p: number, from: number, to: number): number {
  'worklet';
  if (to <= from) return p >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (p - from) / (to - from)));
}

/** Clamps a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

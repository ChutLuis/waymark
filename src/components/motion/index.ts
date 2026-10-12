import { useCallback, useEffect, useMemo } from 'react';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withDelay,
  withTiming,
  type EasingFunctionFactory,
  type SharedValue,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/components/useReducedMotion';
import { motion, type EasingName } from '@/theme';
import { motionMs } from './curves';

export { bezierAt, clamp, sampleTrack, window01, type Track } from './curves';

const EASINGS = Object.fromEntries(
  (Object.keys(motion.easing) as EasingName[]).map((name) => {
    const [a, b, c, d] = motion.easing[name];
    return [name, Easing.bezier(a, b, c, d)];
  }),
) as Record<EasingName, EasingFunctionFactory>;

/** An easing token as a Reanimated easing for `withTiming`. */
export function easing(name: EasingName): EasingFunctionFactory {
  return EASINGS[name];
}

/**
 * Reduced-motion-aware timing: `ms(n)` is n, or 0 when the OS asks for reduced
 * motion, so every moment jumps to its end state.
 */
export function useMotion() {
  const reduced = useReducedMotion();
  return useMemo(() => ({ reduced, ms: (n: number) => motionMs(n, reduced) }), [reduced]);
}

export interface Timeline {
  /** Linear 0..1 progress; tracks sample it with their own easing. */
  p: SharedValue<number>;
  /** Runs 0 → 1 over `duration` after `delay` (reduced motion: jumps to 1). */
  run: (duration: number, delay?: number) => void;
  /** Holds the timeline at a progress value without animating. */
  set: (value: number) => void;
}

/**
 * One moment's clock for one element. The element's `useAnimatedStyle` samples
 * its keyframe tracks from `p`, so each property keeps its own offsets.
 * Starts at `initial`: 0 for an entrance about to play, 1 for "at rest".
 */
export function useTimeline(initial = 1): Timeline {
  const { reduced } = useMotion();
  const p = useSharedValue(initial);
  const run = useCallback(
    (duration: number, delay = 0) => {
      cancelAnimation(p);
      if (reduced) {
        p.value = 1;
        return;
      }
      p.value = 0;
      p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.linear }));
    },
    [p, reduced],
  );
  const set = useCallback(
    (value: number) => {
      cancelAnimation(p);
      p.value = value;
    },
    [p],
  );
  return { p, run, set };
}

/**
 * An entrance that plays once on mount: starts hidden at progress 0 and runs
 * after `delay`. When `enabled` is false (the element mounted after the tab's
 * entrance, e.g. a different day), it simply sits at rest.
 */
export function useEntrance(duration: number, delay: number, enabled = true): SharedValue<number> {
  const timeline = useTimeline(enabled ? 0 : 1);
  useEffect(() => {
    if (enabled) timeline.run(duration, delay);
    // Mount only: an entrance never replays on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return timeline.p;
}

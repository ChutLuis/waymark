import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion as useReducedMotionAtLaunch } from 'react-native-reanimated';

/**
 * Tracks the OS reduce-motion setting; non-essential animation drops to 0ms.
 * Seeded synchronously from Reanimated's launch-time read, so the first frame
 * of an entrance already knows whether to play.
 */
export function useReducedMotion(): boolean {
  const atLaunch = useReducedMotionAtLaunch();
  const [reduced, setReduced] = useState(atLaunch);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

import { useState } from 'react';
import { Animated } from 'react-native';

/**
 * React Native's useAnimatedValue is not exported by react-native-web, so
 * this provides the same behavior: one Animated.Value created lazily and
 * kept stable for the component's lifetime.
 */
export function useLazyAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

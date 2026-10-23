import { useEffect } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useLazyAnimatedValue } from './useLazyAnimatedValue';
import { useReducedMotion } from './useReducedMotion';
import { disabledOpacity, motion, radius, useTheme } from '@/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** Custom 52x32 switch per the component spec (thumb slide is a token motion). */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useLazyAnimatedValue(value ? 1 : 0);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: reducedMotion ? 0 : motion.duration.fast,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [value, progress, reducedMotion]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.ink : colors.fieldBorder,
          opacity: disabled ? disabledOpacity : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: colors.paper, transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: radius.pill,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
  },
});
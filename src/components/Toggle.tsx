import { useEffect } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useLazyAnimatedValue } from './useLazyAnimatedValue';
import { useReducedMotion } from './useReducedMotion';
import { motion, radius, useTheme } from '@/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** Custom 50x30 switch per the component spec (thumb slide is a token motion). */
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
          backgroundColor: value ? colors.accent.base : colors.hairline.strong,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: colors.surface.bg, transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: radius.full,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
  },
});

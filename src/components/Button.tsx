import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { radius, useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'text' | 'destructive';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<ButtonSize, number> = { lg: 56, md: 48, sm: 44 };
const H_PADDING: Record<ButtonSize, number> = { lg: 24, md: 20, sm: 18 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leading,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const containerFor = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.border : colors.ink,
          opacity: pressed && !disabled ? 0.7 : 1,
        };
      case 'secondary':
        return {
          backgroundColor: colors.paper,
          borderWidth: 2,
          borderColor: colors.ink,
          opacity: pressed ? 0.7 : 1,
        };
      case 'destructive':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        };
      case 'quiet':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        };
      case 'text':
        return { backgroundColor: 'transparent', opacity: pressed ? 0.7 : 1 };
    }
  };

  const textColor =
    variant === 'primary'
      ? colors.paper
      : variant === 'destructive'
        ? colors.wax
        : colors.ink;

  const textRole = size === 'lg' ? 'buttonLg' : size === 'md' ? 'button' : 'bodySm';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: HEIGHTS[size], paddingHorizontal: H_PADDING[size] },
        containerFor(pressed),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {leading}
          <AppText role={textRole} style={{ color: textColor }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
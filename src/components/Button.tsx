import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { fontFamilies, radius, useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'text' | 'destructive' | 'destructiveSolid';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** A leading icon. Pass a function to draw it in the label's color, so it tracks the disabled state. */
  leading?: ReactNode | ((color: string) => ReactNode);
  style?: StyleProp<ViewStyle>;
  /** Extra label styling, on top of the size role/weight. */
  labelStyle?: StyleProp<TextStyle>;
  /** Clamp the label to one line (e.g. buttons that must not wrap). */
  labelLines?: number;
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
  labelStyle,
  labelLines,
}: ButtonProps) {
  const { colors } = useTheme();

  const containerFor = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.divider : colors.ink,
          opacity: pressed && !disabled ? 0.7 : 1,
        };
      case 'secondary':
        return {
          backgroundColor: colors.paper,
          borderWidth: 2,
          borderColor: disabled ? colors.border : colors.ink,
          opacity: pressed ? 0.7 : 1,
        };
      case 'destructive':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        };
      case 'destructiveSolid':
        return {
          backgroundColor: disabled ? colors.divider : colors.wax,
          opacity: pressed && !disabled ? 0.7 : 1,
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

  const textColor = disabled
    ? colors.ink2
    : variant === 'destructiveSolid'
      ? colors.stampPaper
      : variant === 'primary'
        ? colors.paper
        : variant === 'destructive'
          ? colors.danger
          : colors.ink;

  const textRole = size === 'lg' ? 'buttonLg' : size === 'md' ? 'button' : 'bodySm';
  // The `sm` size is Besley 700 15/20 (bodySm is 400), used by claim pills.
  const textStyle: StyleProp<TextStyle> = [
      size === 'sm'
        ? { color: textColor, fontFamily: fontFamilies.bold, fontSize: 15, lineHeight: 20 }
        : { color: textColor },
      labelStyle,
    ];

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
          {typeof leading === 'function' ? leading(textColor) : leading}
          <AppText role={textRole} style={textStyle} numberOfLines={labelLines}>
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

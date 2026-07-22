import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const containerFor = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled
            ? colors.accent.disabled
            : pressed
              ? colors.accent.pressed
              : colors.accent.base,
        };
      case 'secondary':
        return {
          backgroundColor: colors.surface.raised,
          borderWidth: hairlineWidth,
          borderColor: colors.hairline.strong,
          opacity: pressed ? 0.7 : 1,
        };
      case 'destructive':
        return {
          backgroundColor: colors.surface.raised,
          borderWidth: hairlineWidth,
          borderColor: colors.semantic.danger.base,
          opacity: pressed ? 0.7 : 1,
        };
      case 'quiet':
        return { opacity: pressed ? 0.7 : 1 };
    }
  };

  const textColor =
    variant === 'primary'
      ? colors.accent.onAccent
      : variant === 'destructive'
        ? colors.semantic.danger.base
        : variant === 'quiet'
          ? colors.accent.ink
          : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, containerFor(pressed), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <AppText role="bodyStrong" style={{ fontSize: 15, lineHeight: 20, color: textColor }}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.s2,
  },
});

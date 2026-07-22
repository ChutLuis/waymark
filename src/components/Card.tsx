import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';

interface CardProps {
  children: ReactNode;
  /** raised = card surface; flat = page surface (used by shared notes). */
  surface?: 'raised' | 'flat';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Hairline-bordered card; depth comes from surface contrast, not shadows. */
export function Card({ children, surface = 'raised', padded = false, style }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surface === 'raised' ? colors.surface.raised : colors.surface.bg,
          borderColor: colors.hairline.default,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface CardRowProps {
  label: string;
  value?: string;
  valueTone?: 'secondary' | 'accent';
  onPress?: () => void;
  accessibilityLabel?: string;
  isLast?: boolean;
  leading?: ReactNode;
  children?: ReactNode;
}

/** Settings-style row inside a Card with a hairline separator. */
export function CardRow({
  label,
  value,
  valueTone = 'secondary',
  onPress,
  accessibilityLabel,
  isLast = false,
  leading,
  children,
}: CardRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading}
      <AppText style={styles.rowLabel}>{label}</AppText>
      {children}
      {value ? (
        <AppText
          tone={valueTone}
          role={valueTone === 'accent' ? 'label' : 'body'}
          style={styles.rowValue}
        >
          {value}
        </AppText>
      ) : null}
    </>
  );
  const rowStyle = [
    styles.row,
    !isLast && { borderBottomWidth: hairlineWidth, borderBottomColor: colors.hairline.default },
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={({ pressed }) => [rowStyle, pressed && { opacity: 0.7 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.s4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3 + 1,
    paddingHorizontal: spacing.s4,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 15,
    lineHeight: 20,
    marginLeft: 'auto',
    flexShrink: 1,
    textAlign: 'right',
  },
});

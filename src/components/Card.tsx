import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { hairlineWidth, radius, shadows, spacing, useTheme } from '@/theme';

type CardShadow = 'none' | 'card' | 'cardRaised' | 'row';

interface CardProps {
  children: ReactNode;
  /** flat = page surface (used by shared notes). */
  surface?: 'paper' | 'flat';
  shadow?: CardShadow;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Paper card with radius 4; depth comes from an Airmail token shadow. */
export function Card({
  children,
  surface = 'paper',
  shadow = 'card',
  padded = false,
  style,
}: CardProps) {
  const { colors } = useTheme();
  const shadowStyle = shadow === 'none' ? null : { boxShadow: shadows[shadow] };
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface === 'paper' ? colors.paper : colors.bg },
        shadowStyle,
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
  valueTone?: 'secondary' | 'accent' | 'danger';
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
      <AppText role="body" style={styles.rowLabel}>
        {label}
      </AppText>
      {children}
      {value ? (
        <AppText tone={valueTone} role="bodySm" style={styles.rowValue}>
          {value}
        </AppText>
      ) : null}
    </>
  );
  const rowStyle = [
    styles.row,
    !isLast && { borderBottomWidth: hairlineWidth, borderBottomColor: colors.hairline },
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
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.s7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    paddingVertical: spacing.s6,
    paddingHorizontal: spacing.s7,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 0,
  },
  rowValue: {
    marginLeft: 'auto',
    flexShrink: 1,
    textAlign: 'right',
  },
});
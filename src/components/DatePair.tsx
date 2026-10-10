import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '@/theme';

interface DatePairProps {
  start: ReactNode;
  end: ReactNode;
  /** One label over both boxes ("DATES"), set like a TextField label. */
  label?: string;
  /** "Clear dates" / "Clear times"; the link shows only with onClear. */
  clearLabel: string;
  onClear?: () => void;
}

/**
 * Two date boxes side by side (design §05: gap 10) with one clear link for
 * both. The link belongs to the pair: its text sits 8 pt under the boxes, and
 * the sheet's full section gap follows it.
 */
export function DatePair({ start, end, label, clearLabel, onClear }: DatePairProps) {
  return (
    // Drawn above the next block, so the link's touch area wins the strip it
    // shares with it (the item editor's STATUS label, N46).
    <View style={styles.pair}>
      {label ? (
        <AppText role="kicker" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.row}>
        <View style={styles.col}>{start}</View>
        <View style={styles.col}>{end}</View>
      </View>
      {onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          // Starts exactly at the boxes' bottom edge (the 4 pt margin) so a tap
          // on a box never lands on Clear; 4 + 20 + 20 makes a 44 pt target.
          hitSlop={{ top: spacing.s1, bottom: 20, left: spacing.s3, right: spacing.s3 }}
          onPress={onClear}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <AppText role="link" tone="muted">{clearLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { zIndex: 1 },
  // TextField's label-to-field gap.
  label: { marginBottom: spacing.s2 },
  row: { flexDirection: 'row', gap: spacing.s4 },
  col: { flex: 1, minWidth: 0 },
  // The 20 pt link line box puts the glyph tops ~4 pt below its top edge.
  clear: { alignSelf: 'flex-start', marginTop: spacing.s1 },
  pressed: { opacity: 0.7 },
});

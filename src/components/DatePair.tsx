import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '@/theme';

interface DatePairProps {
  start: ReactNode;
  end: ReactNode;
  /** "Clear dates" / "Clear times"; the link shows only with onClear. */
  clearLabel: string;
  onClear?: () => void;
}

/**
 * STARTS / ENDS side by side with one clear link for both. The link belongs
 * to the pair: its text sits 8 pt under the fields, and the sheet's full
 * section gap follows it.
 */
export function DatePair({ start, end, clearLabel, onClear }: DatePairProps) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.col}>{start}</View>
        <View style={styles.col}>{end}</View>
      </View>
      {onClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          // Starts exactly at the fields' bottom edge (the 4 pt margin) so a tap
          // on a field never lands on Clear; 4 + 20 + 20 makes a 44 pt target.
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
  row: { flexDirection: 'row', gap: spacing.s5 },
  col: { flex: 1, minWidth: 0 },
  // The 20 pt link line box puts the glyph tops ~4 pt below its top edge.
  clear: { alignSelf: 'flex-start', marginTop: spacing.s1 },
  pressed: { opacity: 0.7 },
});

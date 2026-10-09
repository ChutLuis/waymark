import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PatternBand, type PatternKey } from '@/components/airmail/PatternBand';
import { spacing, useTheme } from '@/theme';

interface TripPreviewCardProps {
  /** Text column, written above the two ruled address lines. */
  children?: ReactNode;
  /** Top-right stamp (or empty stamp slot). */
  stamp: ReactNode;
  pattern: PatternKey;
  style?: StyleProp<ViewStyle>;
}

/**
 * The cream postcard used for a trip without scene art: ruled address lines,
 * a stamp at the top right and the destination's border pattern along the
 * bottom edge (airmail when there is no destination). New trip's preview and
 * the Join screen's no-art preview share it.
 */
export function TripPreviewCard({ children, stamp, pattern, style }: TripPreviewCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.paper }, style]}>
      <View style={styles.row}>
        <View style={styles.text}>
          {children}
          <View style={[styles.rule, { backgroundColor: colors.rule }]} />
          <View style={[styles.rule, { backgroundColor: colors.rule }]} />
        </View>
        <View style={styles.stamp}>{stamp}</View>
      </View>
      <PatternBand pattern={pattern} height={8} tile={8} style={styles.band} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    paddingTop: 16,
    paddingBottom: 0,
    paddingHorizontal: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 12px 24px -12px rgba(21,34,59,0.4)',
  },
  row: { flexDirection: 'row', gap: spacing.s6 },
  // Short text (the Join preview) sits on the address lines, low on the card.
  text: { flex: 1, minWidth: 0, paddingBottom: 22, justifyContent: 'flex-end' },
  rule: { height: 1, marginTop: 14 },
  // Same clearance above the border band as the card's top padding.
  stamp: { flexShrink: 0, paddingBottom: 16 },
  band: { marginHorizontal: -16 },
});

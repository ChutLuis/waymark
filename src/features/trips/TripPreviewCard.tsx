import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { PatternBand, type PatternKey } from '@/components/airmail/PatternBand';
import { hairlineWidth, radius, shadows, spacing, useTheme } from '@/theme';

type LineTone = 'primary' | 'secondary' | 'muted';

interface PreviewHeader {
  /** The destination, as an envelope's header row prints it. */
  label: string;
  labelTone?: LineTone;
  /** The countdown, or NO DATES. */
  status: string;
  statusTone?: LineTone | 'accent';
}

interface AddressLine {
  text: string;
  tone?: LineTone;
}

interface TripPreviewCardProps {
  /** Text column, written above the two ruled address lines. */
  children?: ReactNode;
  /** An envelope-style header row across the top. */
  header?: PreviewHeader;
  /**
   * Lines written on the rules, as on an envelope face; the last one is the
   * note. Replaces the two blank rules.
   */
  address?: readonly AddressLine[];
  /** Top-right stamp (or empty stamp slot). */
  stamp: ReactNode;
  pattern: PatternKey;
  style?: StyleProp<ViewStyle>;
}

/**
 * The cream postcard used for a trip without scene art: ruled address lines,
 * a stamp at the top right and the destination's border pattern along the
 * bottom edge (airmail when there is no destination). New trip's preview and
 * the Join screen's no-art preview share it; New trip addresses it like the
 * trip's envelope face (header row, then name, dates and a note).
 */
export function TripPreviewCard({ children, header, address, stamp, pattern, style }: TripPreviewCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.paper }, style]}>
      {header ? (
        <View style={styles.header}>
          <AppText role="kickerSm" tone={header.labelTone ?? 'secondary'} numberOfLines={1} style={styles.headerLabel}>
            {header.label}
          </AppText>
          <AppText role="kickerSm" tone={header.statusTone ?? 'secondary'}>
            {header.status}
          </AppText>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={[styles.text, address ? styles.addressText : null]}>
          {children}
          {address ? (
            address.map((line, index) => (
              <AppText
                key={index}
                role={index === address.length - 1 ? 'meta' : 'addressLg'}
                tone={line.tone ?? 'primary'}
                numberOfLines={1}
                style={[styles.addressLine, { borderBottomColor: colors.rule }]}
              >
                {line.text}
              </AppText>
            ))
          ) : (
            <>
              <View style={[styles.rule, { backgroundColor: colors.rule }]} />
              <View style={[styles.rule, { backgroundColor: colors.rule }]} />
            </>
          )}
        </View>
        <View style={styles.stamp}>{stamp}</View>
      </View>
      <PatternBand pattern={pattern} height={8} tile={8} style={styles.band} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    paddingTop: spacing.s7,
    paddingBottom: 0,
    paddingHorizontal: spacing.s7,
    overflow: 'hidden',
    boxShadow: shadows.cardRaised,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s5,
    marginBottom: spacing.s3,
  },
  headerLabel: { flexShrink: 1 },
  row: { flexDirection: 'row', gap: spacing.s6 },
  // Short text (the Join preview) sits on the address lines, low on the card.
  text: { flex: 1, minWidth: 0, paddingBottom: spacing.s10, justifyContent: 'flex-end' },
  // Written lines end level with the stamp.
  addressText: { paddingBottom: spacing.s7 },
  addressLine: { paddingTop: spacing.s3, borderBottomWidth: hairlineWidth },
  rule: { height: hairlineWidth, marginTop: spacing.s6 },
  // Same clearance above the border band as the card's top padding.
  stamp: { flexShrink: 0, paddingBottom: spacing.s7 },
  band: { marginHorizontal: -spacing.s7 },
});

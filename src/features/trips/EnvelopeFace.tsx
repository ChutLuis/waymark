import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { DefaultAirmailStampArt } from '@/components/airmail/DefaultAirmailArt';
import { EmptyStampSlot } from '@/components/StateViews';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { fontFamilies, radius, shadows, spacing, useTheme, type Palette } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import { findCountry } from './countries';
import { DESTINATION_ART } from './destinationArt';
import { DESTINATION_INFO, daysUntilLabelUppercase, matchDestination, normaliseDestination, tripDays } from './destinations';
import { addressDates, envelopeNote, isDaysAway, STACK_CARD_HEIGHT, STACK_PEEK } from './stack';
import type { TripListItem } from './hooks';

const STAMP = { width: 56, height: 64, inset: 6 } as const;

/** Envelope papers by order in the stack, front to back (README 01). */
const PAPERS: { paper: keyof Palette; rule: keyof Palette }[] = [
  { paper: 'envelope1', rule: 'envelopeRule1' },
  { paper: 'envelope2', rule: 'envelopeRule2' },
  { paper: 'envelope3', rule: 'envelopeRule3' },
];

interface EnvelopeFaceProps {
  trip: TripListItem;
  /** The other members' display names. */
  others: string[];
  /** Which envelope paper this trip wears (stable per trip). */
  paperIndex: number;
}

/** "PAR AVION / by air mail" in airmail blue with a cream rule inside. */
function ParAvion() {
  const { colors } = useTheme();
  return (
    <View style={[styles.parAvion, { backgroundColor: colors.parAvion }]}>
      <View pointerEvents="none" style={[styles.parAvionRule, { borderColor: colors.stampPaper }]} />
      <AppText role="parAvion" numberOfLines={1} style={{ color: colors.stampPaper, paddingRight: 1 }}>
        PAR AVION
      </AppText>
      <AppText role="parAvionSub" style={{ color: colors.stampPaper }}>
        by air mail
      </AppText>
    </View>
  );
}

function FaceStamp({ trip }: { trip: TripListItem }) {
  const country = matchDestination(trip.destination);
  const iso = findCountry(trip.destination)?.code;
  const hasDates = Boolean(trip.startDate && trip.endDate);
  if (!hasDates) return <EmptyStampSlot width={STAMP.width} height={STAMP.height} />;
  return (
    <PerforatedStamp width={STAMP.width} height={STAMP.height} size="sm">
      {country ? (
        <Image source={DESTINATION_ART[country].sceneStampStill} style={styles.stampArt} contentFit="cover" />
      ) : (
        <View style={styles.stampArt}>
          <DefaultAirmailStampArt
            label={iso ?? (trip.name.trim()[0] ?? '?').toUpperCase()}
            subtitle="WAYMARK"
          />
        </View>
      )}
    </PerforatedStamp>
  );
}

/**
 * The full face of an envelope in the Home stack (Airmail v4 · 01): a 38 pt
 * header row that peeks out from behind the cards in front, then PAR AVION,
 * the stamp (destination, initial, or a dashed slot without dates) and three
 * ruled address lines.
 */
export function EnvelopeFace({ trip, others, paperIndex }: EnvelopeFaceProps) {
  const { colors } = useTheme();
  const { paper, rule } = PAPERS[paperIndex % PAPERS.length];
  const today = toDateOnly(new Date());
  const hasDates = Boolean(trip.startDate && trip.endDate);
  const country = matchDestination(trip.destination);
  const info = country ? DESTINATION_INFO[country] : null;
  // The destination once: when the trip is simply named after it (a trip
  // "El Salvador" to El Salvador), the header doesn't repeat the address line.
  const place = info?.region ?? trip.destination?.trim() ?? '';
  const repeatsName = place !== '' && normaliseDestination(place) === normaliseDestination(trip.name);
  const headerKicker = (place && !repeatsName ? place : 'AIRMAIL DISPATCH').toUpperCase();
  const countdown = daysUntilLabelUppercase(trip.startDate, today);
  const statusColor = !hasDates
    ? colors.ink3
    : isDaysAway(trip.startDate, today)
      ? colors.airmailBlue
      : colors.ink2;
  const lines = [
    trip.name,
    hasDates ? addressDates(trip.startDate, trip.endDate) : 'No dates yet',
  ];
  const note = envelopeNote({ hasDates, others, days: tripDays(trip.startDate, trip.endDate) });

  return (
    <View style={[styles.face, { backgroundColor: colors[paper], boxShadow: shadows.envelope }]}>
      <View style={styles.header}>
        <AppText role="kickerSm" numberOfLines={1} style={[styles.name, { color: colors.ink2 }]}>
          {headerKicker}
        </AppText>
        <AppText role="kickerSm" numberOfLines={1} style={{ color: statusColor, paddingRight: 1 }}>
          {countdown ?? 'NO DATES'}
        </AppText>
      </View>
      {hasDates ? <ParAvion /> : null}
      <View style={styles.stamp}>
        <FaceStamp trip={trip} />
      </View>
      <View style={styles.address}>
        {lines.map((line, i) => (
          <AppText
            key={i}
            role="address"
            numberOfLines={1}
            style={[styles.addressLine, { borderBottomColor: colors[rule], color: hasDates ? colors.ink : colors.ink2 }]}
          >
            {line}
          </AppText>
        ))}
        <AppText
          role="address"
          numberOfLines={1}
          style={[styles.addressLine, styles.addressNote, { borderBottomColor: colors[rule], color: colors.ink2 }]}
        >
          {note}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { height: STACK_CARD_HEIGHT, borderRadius: radius.card, overflow: 'hidden' },
  header: {
    height: STACK_PEEK,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: { flexShrink: 1 },
  parAvion: {
    position: 'absolute',
    left: 16,
    top: 54,
    paddingTop: 5,
    paddingHorizontal: 9,
    paddingBottom: 4,
    borderRadius: radius.chip,
    transform: [{ rotate: '-2deg' }],
  },
  parAvionRule: { position: 'absolute', left: 2, top: 2, right: 2, bottom: 2, borderWidth: 1, borderRadius: 1 },
  stamp: { position: 'absolute', right: 18, top: 50, transform: [{ rotate: '2.2deg' }] },
  stampArt: { position: 'absolute', left: STAMP.inset, top: STAMP.inset, right: STAMP.inset, bottom: STAMP.inset },
  address: { position: 'absolute', left: 40, right: 24, top: 148, bottom: spacing.s12, justifyContent: 'space-between' },
  addressLine: { borderBottomWidth: 1 },
  addressNote: { fontFamily: fontFamilies.regularItalic },
});

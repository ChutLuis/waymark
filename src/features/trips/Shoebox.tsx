import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { Postmark } from '@/components/airmail/Postmark';
import { sampleTrack, useEntrance } from '@/components/motion';
import { shoeboxStamp } from '@/components/motion/keyframes';
import { motion, spacing } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import { SceneStamp } from './SceneStamp';
import { DESTINATION_ART } from './destinationArt';
import { DESTINATION_INFO, formatTripRange, matchDestination } from './destinations';
import { daysUntilLabel } from './sort';
import type { TripListItem } from './hooks';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthYear(trip: TripListItem): string {
  const date = trip.endDate ?? trip.startDate;
  if (!date) return 'No dates yet';
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function ShoeboxRow({
  trip,
  past,
  dealDelay,
  onPress,
}: {
  trip: TripListItem;
  past: boolean;
  /** The first past stamp lands after the deal; null sits at rest. */
  dealDelay: number | null;
  onPress: () => void;
}) {
  const country = matchDestination(trip.destination);
  const p = useEntrance(motion.choreo.home.shoebox, dealDelay ?? 0, dealDelay !== null);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(shoeboxStamp.opacity, p.value, motion.easing.standard),
    transform: [
      { translateY: sampleTrack(shoeboxStamp.translateY, p.value, motion.easing.standard) },
      { rotate: `${sampleTrack(shoeboxStamp.rotate, p.value, motion.easing.standard)}deg` },
      { scale: sampleTrack(shoeboxStamp.scale, p.value, motion.easing.standard) },
    ],
  }));
  const today = toDateOnly(new Date());
  const meta = past
    ? `${monthYear(trip)} · postmarked`
    : [formatTripRange(trip.startDate, trip.endDate), trip.startDate ? daysUntilLabel(trip.startDate, today) : null]
        .filter(Boolean)
        .join(' · ') || 'No dates yet';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={past ? `${trip.name}, past trip` : trip.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.stamp, stampStyle]}>
        {country ? (
          <>
            <SceneStamp band="mini" image={DESTINATION_ART[country].sceneStampStill} denomination={null} name={null} />
            {past ? (
              <Postmark
                variant="compact"
                style={styles.postmark}
                city={DESTINATION_INFO[country].chip}
                date={trip.endDate}
              />
            ) : null}
          </>
        ) : (
          <SceneStamp band="mini" image={null} initial={(trip.name.trim()[0] ?? '?').toUpperCase()} />
        )}
      </Animated.View>
      <View style={styles.text}>
        <AppText role="rowTitleLg" numberOfLines={1}>
          {trip.name}
        </AppText>
        <AppText role="metaSm" tone="secondary">
          {meta}
        </AppText>
      </View>
    </Pressable>
  );
}

/**
 * The shoebox under the Home stack: past trips, postmarked. On the session's
 * deal, the first past stamp lands at 820 ms.
 */
export function Shoebox({
  past,
  dealing,
  onOpen,
}: {
  past: TripListItem[];
  dealing: boolean;
  onOpen: (trip: TripListItem) => void;
}) {
  return (
    <View style={styles.box}>
      {past.length > 0 ? (
        <>
          <AppText role="kicker" tone="secondary">
            THE SHOEBOX · PAST
          </AppText>
          <View style={styles.list}>
            {past.map((trip, i) => (
              <ShoeboxRow
                key={trip.id}
                trip={trip}
                past
                dealDelay={dealing && i === 0 ? motion.choreo.home.shoeboxAt : null}
                onPress={() => onOpen(trip)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingTop: spacing.s8, paddingHorizontal: spacing.gutter },
  list: { marginTop: spacing.s5, gap: spacing.s5 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  stamp: { width: 40, height: 48 },
  postmark: { position: 'absolute', left: 10, top: 2, opacity: 0.85 },
  text: { flex: 1, minWidth: 0, marginLeft: 40 },
  pressed: { opacity: 0.7 },
});

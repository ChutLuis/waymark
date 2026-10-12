import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Postmark } from '@/components/airmail/Postmark';
import { sampleTrack, useEntrance } from '@/components/motion';
import { shoeboxStamp } from '@/components/motion/keyframes';
import { iconStrokeWidth, motion, spacing, useTheme } from '@/theme';
import { SceneStamp } from './SceneStamp';
import { DESTINATION_ART } from './destinationArt';
import { DESTINATION_INFO, matchDestination } from './destinations';
import { moreLine } from './shoebox';
import type { TripListItem } from './hooks';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The two stamps behind the latest one: rotation and offset in the pile. */
const BEHIND = [
  { rotate: -8, left: 3, top: 4 },
  { rotate: 7, left: 10, top: 2 },
] as const;
const TOP = { left: 6, top: 5 } as const;

function monthYear(trip: TripListItem): string {
  const date = trip.endDate ?? trip.startDate;
  if (!date) return 'No dates yet';
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function PileStamp({ trip }: { trip: TripListItem }) {
  const country = matchDestination(trip.destination);
  return country ? (
    <SceneStamp band="mini" image={DESTINATION_ART[country].sceneStampStill} denomination={null} name={null} />
  ) : (
    <SceneStamp band="mini" image={null} initial={(trip.name.trim()[0] ?? '?').toUpperCase()} />
  );
}

/**
 * The shoebox on Home (Airmail v4.1 · 01): one row for every past trip, a pile
 * of up to three stamps with the latest on top and postmarked, its name, and
 * how far back the rest go. Tapping it opens the album. On the session's deal
 * the top stamp lands at 820 ms.
 */
export function Shoebox({
  past,
  dealing,
  onOpen,
}: {
  /** Past trips, most recent first. */
  past: TripListItem[];
  dealing: boolean;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const p = useEntrance(motion.choreo.home.shoebox, motion.choreo.home.shoeboxAt, dealing);
  const topStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(shoeboxStamp.opacity, p.value, motion.easing.standard),
    transform: [
      { translateY: sampleTrack(shoeboxStamp.translateY, p.value, motion.easing.standard) },
      { rotate: `${sampleTrack(shoeboxStamp.rotate, p.value, motion.easing.standard)}deg` },
      { scale: sampleTrack(shoeboxStamp.scale, p.value, motion.easing.standard) },
    ],
  }));

  if (past.length === 0) return null;
  const latest = past[0];
  const country = matchDestination(latest.destination);
  const behind = past.slice(1, 3);
  const sub = past.length === 1 ? `${monthYear(latest)} · postmarked` : moreLine(past);

  return (
    <View style={styles.box}>
      <AppText role="kicker" tone="secondary">
        THE SHOEBOX · {past.length} PAST
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`The shoebox, ${past.length} past ${past.length === 1 ? 'trip' : 'trips'}`}
        accessibilityHint="Opens the album of past trips"
        onPress={onOpen}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.pile}>
          {behind
            .slice()
            .reverse()
            .map((trip, i) => {
              const spot = BEHIND[behind.length - 1 - i];
              return (
                <View
                  key={trip.id}
                  style={[styles.pileStamp, { left: spot.left, top: spot.top, transform: [{ rotate: `${spot.rotate}deg` }] }]}
                >
                  <PileStamp trip={trip} />
                </View>
              );
            })}
          <Animated.View style={[styles.pileStamp, TOP, topStyle]}>
            <PileStamp trip={latest} />
            {country ? (
              <Postmark
                variant="compact"
                style={styles.postmark}
                city={DESTINATION_INFO[country].chip}
                date={latest.endDate}
              />
            ) : null}
          </Animated.View>
        </View>
        <View style={styles.text}>
          <AppText role="envelopeTitle" numberOfLines={1} style={styles.name}>
            {latest.name}
          </AppText>
          <AppText role="metaSm" tone="secondary" numberOfLines={1}>
            {sub}
          </AppText>
        </View>
        <ChevronRight size={18} color={colors.ink3} strokeWidth={iconStrokeWidth} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingTop: spacing.s8, paddingHorizontal: spacing.gutter },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 56, marginTop: spacing.s4 },
  pile: { width: 52, height: 56 },
  pileStamp: { position: 'absolute', width: 40, height: 48 },
  postmark: { position: 'absolute', left: 10, top: 2, opacity: 0.85 },
  text: { flex: 1, minWidth: 0, marginLeft: 20 },
  name: { fontSize: 18, lineHeight: 22 },
  pressed: { opacity: 0.7 },
});

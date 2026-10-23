import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { DefaultAirmailStampArt } from '@/components/airmail/DefaultAirmailArt';
import { PerforatedStamp, STAMP_SHADOW_MARGIN } from '@/components/airmail/PerforatedStamp';
import { easing, sampleTrack, useEntrance, useMotion } from '@/components/motion';
import { dayStampRotation, dropIn } from '@/components/motion/keyframes';
import { motion, useTheme } from '@/theme';
import { findCountry } from './countries';
import { DESTINATION_ART } from './destinationArt';
import { matchDestination } from './destinations';
import { RAIL, railEntries, railScrollTarget } from './stack';
import type { TripListItem } from './hooks';

const CAPTION_GAP = 7;
const RULE = 2;
const RAIL_HEIGHT = 92;
const PAD_TOP = 6;

function RailStamp({ trip }: { trip: TripListItem }) {
  const { colors } = useTheme();
  const country = matchDestination(trip.destination);
  if (!trip.startDate || !trip.endDate) {
    return (
      <View style={styles.emptySlot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={RAIL.stampWidth} height={RAIL.stampHeight} style={StyleSheet.absoluteFill}>
          <Rect
            x={0.75}
            y={0.75}
            width={RAIL.stampWidth - 1.5}
            height={RAIL.stampHeight - 1.5}
            rx={2}
            fill={colors.paper}
            fillOpacity={0.5}
            stroke={colors.fieldBorder}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </Svg>
        <AppText role="dayNumber" numberOfLines={1}>
          {(trip.name.trim()[0] ?? '?').toUpperCase()}
        </AppText>
        <AppText role="stampLabel" tone="secondary" numberOfLines={2} style={styles.slotName}>
          {trip.name}
        </AppText>
      </View>
    );
  }
  const iso = findCountry(trip.destination)?.code;
  return (
    <PerforatedStamp width={RAIL.stampWidth} height={RAIL.stampHeight} size="sm">
      {country ? (
        <Image source={DESTINATION_ART[country].sceneStampStill} style={styles.art} contentFit="cover" />
      ) : (
        <View style={styles.art}>
          <DefaultAirmailStampArt label={iso ?? (trip.name.trim()[0] ?? '?').toUpperCase()} compact />
        </View>
      )}
    </PerforatedStamp>
  );
}

function RailItem({
  trip,
  caption,
  index,
  picked,
  deal,
  onPick,
}: {
  trip: TripListItem;
  caption: string;
  index: number;
  picked: boolean;
  /** Drops in on the session's deal (only stamps on screen at mount). */
  deal: boolean;
  onPick: () => void;
}) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const lift = useSharedValue(picked ? -RAIL.lift : 0);
  const keys = dropIn(dayStampRotation(index));
  const drop = useEntrance(motion.duration.drop, motion.choreo.home.railAt + index * motion.choreo.home.railStagger, deal);

  // The picked stamp rises 4 pt; the one it replaces settles back.
  useEffect(() => {
    lift.set(withTiming(picked ? -RAIL.lift : 0, {
      duration: ms(motion.choreo.home.pickLift),
      easing: easing('standard'),
    }));
  }, [picked, lift, ms]);

  // One transform for both: two styles setting transform on one view overwrite
  // each other, and a re-render would reapply the drop's and drop the lift.
  const stampStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, drop.value, motion.easing.drop),
    transform: [
      { translateY: lift.value + sampleTrack(keys.translateY, drop.value, motion.easing.drop) },
      { rotate: `${sampleTrack(keys.rotate, drop.value, motion.easing.drop)}deg` },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${caption === 'NOW' ? 'on now' : caption.toLowerCase()}`}
      accessibilityState={{ selected: picked }}
      onPress={onPick}
      style={styles.item}
    >
      <Animated.View style={stampStyle}>
        <RailStamp trip={trip} />
      </Animated.View>
      <AppText
        role="tagSm"
        numberOfLines={1}
        style={[
          styles.caption,
          { color: picked ? colors.ink : colors.ink2, borderBottomColor: picked ? colors.ink : 'transparent' },
        ]}
      >
        {caption}
      </AppText>
    </Pressable>
  );
}

function YearDivider({ label }: { label: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={2} height={RAIL.stampHeight}>
        <Line x1={1} y1={0} x2={1} y2={RAIL.stampHeight} stroke={colors.railDivider} strokeWidth={1.5} strokeDasharray="4 3" />
      </Svg>
      <AppText role="tagSm" tone="secondary" numberOfLines={1} style={[styles.caption, styles.noRule]}>
        {label ?? ' '}
      </AppText>
    </View>
  );
}

interface TripRailProps {
  /** Every current trip, in the default order. */
  trips: TripListItem[];
  onNowIds: ReadonlySet<string>;
  pickedId: string;
  /** The session's first Home mount: the stamps on screen drop in. */
  dealing: boolean;
  onPick: (trip: TripListItem) => void;
}

/**
 * The stamp rail under the Home card (Airmail v4.1 · 01): one stamp per
 * current trip with its start date under it and year dividers between, the
 * picked one raised 4 pt. Picking a stamp deals its trip onto Home and scrolls
 * the stamp into view if it was cut off.
 */
export function TripRail({ trips, onNowIds, pickedId, dealing, onPick }: TripRailProps) {
  const { ms } = useMotion();
  const entries = useMemo(() => railEntries(trips, onNowIds), [trips, onNowIds]);
  const byId = useMemo(() => new Map(trips.map((trip, index) => [trip.id, { trip, index }])), [trips]);
  const [viewport, setViewport] = useState(0);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const target = useSharedValue(-1);
  const onScroll = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.x;
  });
  // Drives the scroll only while a pick animates it; user scrolls are left alone.
  useDerivedValue(() => {
    if (target.value >= 0) scrollTo(ref, target.value, 0, false);
  });

  const last = entries[entries.length - 1];
  const contentWidth = last ? last.x + (last.kind === 'trip' ? RAIL.stampWidth : RAIL.divider) + RAIL.padX : 0;
  const pickedIndex = trips.findIndex((t) => t.id === pickedId);

  const pick = (trip: TripListItem, x: number) => {
    if (trip.id === pickedId) return;
    onPick(trip);
    const to = railScrollTarget(x, offset.value, viewport, contentWidth);
    if (to === null) return;
    target.set(offset.value);
    target.set(withTiming(to, { duration: ms(motion.choreo.home.railScroll), easing: easing('standard') }, () => {
      target.set(-1);
    }));
  };

  return (
    <View>
      <View style={styles.labelRow}>
        <AppText role="kickerSm" tone="secondary">
          ALL {trips.length} TRIPS
        </AppText>
        <AppText role="tagSm" style={styles.position}>
          {pickedIndex + 1} OF {trips.length}
        </AppText>
      </View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {entries.map((entry) => {
          if (entry.kind === 'divider') return <YearDivider key={`divider-${entry.x}`} label={entry.label} />;
          const item = byId.get(entry.id);
          if (!item) return null;
          const { trip, index } = item;
          return (
            <RailItem
              key={entry.id}
              trip={trip}
              caption={entry.caption}
              index={index}
              picked={entry.id === pickedId}
              deal={dealing && (viewport === 0 || entry.x < viewport)}
              onPick={() => pick(trip, entry.x)}
            />
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: RAIL.padX,
  },
  position: { paddingRight: 1 },
  rail: { height: RAIL_HEIGHT, flexGrow: 0 },
  railContent: {
    paddingTop: PAD_TOP,
    paddingHorizontal: RAIL.padX,
    paddingBottom: STAMP_SHADOW_MARGIN,
    gap: RAIL.gap,
    alignItems: 'flex-start',
  },
  item: { width: RAIL.stampWidth, alignItems: 'center', gap: CAPTION_GAP },
  art: { position: 'absolute', left: 5, top: 5, right: 5, bottom: 5 },
  emptySlot: { width: RAIL.stampWidth, height: RAIL.stampHeight, alignItems: 'center', justifyContent: 'center', padding: 4, gap: 2 },
  slotName: { alignSelf: 'stretch', textAlign: 'center', paddingRight: 1 },
  caption: {
    paddingRight: 1,
    borderBottomWidth: RULE,
    paddingBottom: RULE,
  },
  // Keeps the caption's height so the labels line up, without its rule.
  noRule: { borderBottomWidth: 0, paddingBottom: 2 * RULE },
  divider: { width: RAIL.divider, alignItems: 'center', gap: CAPTION_GAP },
});

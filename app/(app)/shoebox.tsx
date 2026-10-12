import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, { runOnJS, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { easing, sampleTrack, useEntrance, useMotion } from '@/components/motion';
import { sheetStampPrint } from '@/components/motion/keyframes';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import { matchDestination } from '@/features/trips/destinations';
import { albumSheet, primeShell } from '@/features/trips/expandStore';
import { markShellOpening } from '@/features/trips/shellMotion';
import { albumSummary, postmarkMonth, sheetHeading, sheetsByYear } from '@/features/trips/shoebox';
import { splitTrips } from '@/features/trips/sort';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { haptic } from '@/lib/haptics';
import { toDateOnly } from '@/lib/format/date';
import { iconStrokeWidth, motion, radius, shadows, spacing, useTheme } from '@/theme';

/** README 01 · the album's stamp cell, in points. */
const STAMP = { width: 56, height: 64, art: 6 } as const;
const RING = { size: 34, left: 26, top: 6, stroke: 1.5 } as const;
const LINES = { left: 44, top: 30, width: 22, height: 16, pitch: 5, stroke: 1.5 } as const;
const COLUMNS = 4;
const GAP = { row: 12, column: 8 } as const;
const SHEET_PAD = { top: 12, x: 16, bottom: 14 } as const;
/** Used stamps read at 80% saturation: a 20% paper wash over the art. */
const WASH = 0.2;
/** Rough sheet heights, to tell which sheets are on screen at open. */
const ESTIMATE = { header: 188, sheetHead: 22, row: 120 } as const;

function AlbumStamp({
  trip,
  index,
  sheet,
  animate,
  width,
  onOpen,
}: {
  trip: TripListItem;
  index: number;
  sheet: number;
  animate: boolean;
  width: number;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const country = matchDestination(trip.destination);
  const keys = sheetStampPrint(index);
  const s = motion.choreo.shoebox;
  const p = useEntrance(motion.choreo.sheet.print, s.d0 + sheet * s.sheetStagger + index * s.stampStagger, animate);
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.print),
    transform: [
      { translateY: sampleTrack(keys.translateY, p.value, motion.easing.print) },
      { scale: sampleTrack(keys.scale, p.value, motion.easing.print) },
      { rotate: `${sampleTrack(keys.rotate, p.value, motion.easing.print)}deg` },
    ],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.name}, ${postmarkMonth(trip).toLowerCase()}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.cell, { width }, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.stamp, style]}>
        <PerforatedStamp width={STAMP.width} height={STAMP.height} size="sm">
          <View style={[styles.art, { backgroundColor: colors.stampInk }]}>
            {country ? (
              <Image source={DESTINATION_ART[country].sceneStampStill} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <AppText role="initialLg" style={[styles.initial, { color: colors.stampPaper }]}>
                {(trip.name.trim()[0] ?? '?').toUpperCase()}
              </AppText>
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.stampPaper, opacity: WASH }]} />
          </View>
        </PerforatedStamp>
        {/* Outside the stamp's mask: the postmark runs 4 and 10 pt onto the sheet. */}
        <View pointerEvents="none" style={[styles.ring, { borderColor: colors.cancelInk }]} />
        <Svg width={LINES.width} height={LINES.height} style={styles.lines} pointerEvents="none">
          {Array.from({ length: Math.ceil(LINES.height / LINES.pitch) }, (_, i) => (
            <Line
              key={i}
              x1={0}
              x2={LINES.width}
              y1={i * LINES.pitch + LINES.stroke / 2}
              y2={i * LINES.pitch + LINES.stroke / 2}
              stroke={colors.cancelInk}
              strokeWidth={LINES.stroke}
            />
          ))}
        </Svg>
      </Animated.View>
      {/* Printed on stamp paper: stampInk in both themes. */}
      <AppText role="tagLabel" numberOfLines={2} style={[styles.name, { color: colors.stampInk }]}>
        {trip.name}
      </AppText>
      <AppText role="monoXs" style={[styles.month, styles.printed, { color: colors.stampInk }]}>
        {postmarkMonth(trip)}
      </AppText>
    </Pressable>
  );
}

/**
 * The shoebox album (Airmail v4.1 · 01): every past trip, one sheet of
 * postmarked stamps per year, newest first. It pushes over Home like the Trip
 * page (440 ms in while Home steps back and dims, 380 ms out), and its stamps
 * print in once per open from d0 = 380 ms.
 */
export default function ShoeboxScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { ms } = useMotion();
  const trips = useTrips();
  const closing = useRef(false);
  const [sheetWidth, setSheetWidth] = useState(0);

  const past = useMemo(() => splitTrips(trips.data ?? [], toDateOnly(new Date())).past, [trips.data]);
  const sheets = useMemo(() => sheetsByYear(past), [past]);

  // Push on open.
  useEffect(() => {
    albumSheet.value = 0;
    albumSheet.value = withTiming(1, { duration: ms(motion.duration.push), easing: easing('standard') });
    return () => {
      albumSheet.value = 0;
    };
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pop before anything removes the album; replacing the stack skips it.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        const type = event.data.action.type;
        if (closing.current || type === 'REPLACE' || type === 'RESET') return;
        event.preventDefault();
        closing.current = true;
        haptic('selection');
        const leave = () => navigation.dispatch(event.data.action);
        albumSheet.value = withTiming(0, { duration: ms(motion.duration.pop), easing: easing('exit') }, (finished) => {
          if (finished) runOnJS(leave)();
        });
      }),
    [navigation, ms],
  );

  const pageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - albumSheet.value) * width }] }));

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const openTrip = (trip: TripListItem) => {
    primeShell(false);
    markShellOpening();
    router.push(`/trips/${trip.id}` as never);
  };

  const cellWidth = sheetWidth > 0 ? (sheetWidth - 2 * SHEET_PAD.x - (COLUMNS - 1) * GAP.column) / COLUMNS : STAMP.width;
  // Only the sheets on screen at open print in.
  let estimatedTop = ESTIMATE.header;

  return (
    <Animated.View
      style={[styles.page, { backgroundColor: colors.bg, paddingTop: insets.top, boxShadow: shadows.sheetPush }, pageStyle]}
    >
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to your trips"
            onPress={back}
            style={({ pressed }) => [styles.back, { backgroundColor: colors.paper, boxShadow: shadows.pill }, pressed && styles.pressed]}
          >
            <ChevronLeft size={22} color={colors.ink} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>
        <View style={styles.titleBlock}>
          <AppText role="display">The shoebox</AppText>
          <AppText role="meta" tone="secondary" style={styles.summary}>
            {albumSummary(past)}
          </AppText>
        </View>
        {trips.isPending ? (
          <LoadingState />
        ) : trips.isError ? (
          <ErrorState title="Couldn't load your trips" onRetry={() => trips.refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.sheets, { paddingBottom: insets.bottom + spacing.s12 }]}
            showsVerticalScrollIndicator={false}
          >
            {sheets.map((sheet, s) => {
              const animate = estimatedTop < height;
              estimatedTop += ESTIMATE.sheetHead + Math.ceil(sheet.trips.length / COLUMNS) * ESTIMATE.row + GAP.row;
              return (
                <View
                  key={sheet.year}
                  onLayout={s === 0 ? (e) => setSheetWidth(e.nativeEvent.layout.width) : undefined}
                  style={[styles.sheet, { backgroundColor: colors.stampPaper, boxShadow: shadows.postcard }]}
                >
                  <AppText role="monoXs" style={[styles.sheetHeading, styles.printed, { color: colors.stampInk }]}>
                    {sheetHeading(sheet.year, sheet.trips.length)}
                  </AppText>
                  <View style={styles.grid}>
                    {sheet.trips.map((trip, i) => (
                      <AlbumStamp
                        key={trip.id}
                        trip={trip}
                        index={i}
                        sheet={s}
                        animate={animate}
                        width={cellWidth}
                        onOpen={() => openTrip(trip)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  topBar: { height: 52, paddingHorizontal: spacing.s7, flexDirection: 'row', alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  summary: { marginTop: 2, fontSize: 17, lineHeight: 22 },
  sheets: { paddingTop: spacing.s7, paddingHorizontal: spacing.s7, gap: spacing.s7 },
  sheet: {
    borderRadius: radius.airmailInner,
    paddingTop: SHEET_PAD.top,
    paddingHorizontal: SHEET_PAD.x,
    paddingBottom: SHEET_PAD.bottom,
  },
  sheetHeading: { textAlign: 'center', lineHeight: 12, letterSpacing: 1.6 },
  grid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', rowGap: GAP.row, columnGap: GAP.column },
  cell: { alignItems: 'center', gap: 6 },
  stamp: { width: STAMP.width, height: STAMP.height },
  art: {
    position: 'absolute',
    left: STAMP.art,
    top: STAMP.art,
    right: STAMP.art,
    bottom: STAMP.art,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 22, lineHeight: 24 },
  ring: {
    position: 'absolute',
    left: RING.left,
    top: RING.top,
    width: RING.size,
    height: RING.size,
    borderRadius: RING.size / 2,
    borderWidth: RING.stroke,
  },
  lines: { position: 'absolute', left: LINES.left, top: LINES.top },
  name: { fontSize: 13, lineHeight: 16, textAlign: 'center' },
  month: { lineHeight: 11, letterSpacing: 0.8 },
  printed: { opacity: 0.72 },
  pressed: { opacity: 0.7 },
});

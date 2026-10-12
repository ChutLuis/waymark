import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { ChevronRight, Plane } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { AirmailStripes } from '@/components/airmail/AirmailBorder';
import { useLoop } from '@/components/motion';
import { useItinerary } from '@/features/itinerary/hooks';
import { minutesOfDay } from '@/features/itinerary/route';
import { formatTimePadded, toDateOnly } from '@/lib/format/date';
import { iconStrokeWidth, motion, radius, shadows, useTheme } from '@/theme';
import type { ItineraryItem } from '@/lib/types';
import { TripScene } from './TripScene';
import { formatTripRange, matchDestination, otherMembersWording, tripDays } from './destinations';
import { miniRouteX, STACK_CARD_HEIGHT } from './stack';
import type { TripListItem } from './hooks';
import type { Rect } from './expandStore';

/** One airmail stripe period along the x axis: 36 × √2. */
const CRAWL_DISTANCE = 36 * Math.SQRT2;
const BORDER = 5;
const SCENE_HEIGHT = 150;
const MARKER = 14;
const PLANE_DISC = 22;
/** The plane's paper ring, outside the disc. */
const PLANE_RING = 3;
const DASH = 5;
const BOB = 1.5;

export interface OnNowPostcardHandle {
  /** Measures the paper and scene window in window coordinates. */
  measure: (done: (rects: { paper: Rect; window: Rect } | null) => void) => void;
}

interface OnNowPostcardProps {
  trip: TripListItem;
  viewerId: string | null;
  /** Front of the stack, on a focused screen: the scene and idle loops run. */
  front: boolean;
  /** The trip is collapsing back onto this card: pick the scene up early. */
  collapsing: boolean;
}

function dayNumber(startDate: string | null): number {
  if (!startDate) return 1;
  const [y, m, d] = startDate.split('-').map(Number);
  const today = new Date();
  const start = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(1, Math.round((now - start) / 86_400_000) + 1);
}

function MiniRoute({ stops, active }: { stops: ItineraryItem[]; active: boolean }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const march = useLoop(motion.choreo.home.march, active);
  const bob = useLoop(motion.choreo.home.bob, active);
  const marchStyle = useAnimatedStyle(() => ({ transform: [{ translateX: march.value * 2 * DASH }] }));
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -BOB * Math.cos(bob.value * 2 * Math.PI) }],
  }));

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const minutes = stops.map((s) => minutesOfDay(s.startAt as string));
  const first = minutes[0];
  const last = minutes[minutes.length - 1];
  const track = Math.max(0, width - MARKER);
  const x = (m: number) => miniRouteX(m, first, last, track);
  const planeX = x(nowMin);
  const labels: { x: number; text: string; tone: 'muted' | 'accent' | 'primary' }[] = [];
  const add = (lx: number, text: string, tone: 'muted' | 'accent' | 'primary') => {
    if (labels.some((l) => Math.abs(l.x - lx) < 34)) return;
    labels.push({ x: lx, text, tone });
  };
  add(planeX, 'NOW', 'accent');
  stops.forEach((s, i) => add(x(minutes[i]), formatTimePadded(s.startAt as string), i === stops.length - 1 ? 'primary' : 'muted'));

  const dashFrom = planeX + PLANE_DISC;
  const dashTo = x(last) + MARKER / 2;

  return (
    <View style={styles.miniRoute} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <View style={[styles.miniInk, { width: Math.max(0, planeX + PLANE_DISC / 2 - MARKER / 2), backgroundColor: colors.ink }]} />
          {dashTo > dashFrom ? (
            <View style={[styles.miniDashClip, { left: dashFrom, width: dashTo - dashFrom }]}>
              <Animated.View style={[styles.miniDashRow, marchStyle]}>
                {Array.from({ length: Math.ceil((dashTo - dashFrom) / (2 * DASH)) + 2 }, (_, i) => (
                  <View key={i} style={[styles.miniDash, { backgroundColor: colors.ink3 }]} />
                ))}
              </Animated.View>
            </View>
          ) : null}
          {stops.map((s, i) => {
            const style =
              s.status === 'done'
                ? { backgroundColor: colors.ink }
                : s.status === 'confirmed'
                  ? { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink }
                  : { backgroundColor: colors.stampPaper, borderWidth: 1.5, borderColor: colors.ink3, borderStyle: 'dashed' as const };
            return <View key={s.id} style={[styles.marker, { left: x(minutes[i]) }, style]} />;
          })}
          <Animated.View
            style={[
              styles.miniPlane,
              { left: planeX, backgroundColor: colors.airmailBlue, borderColor: colors.paper, boxShadow: shadows.plane },
              bobStyle,
            ]}
          >
            <Plane size={12} color={colors.paper} strokeWidth={iconStrokeWidth} style={styles.planeIcon} />
          </Animated.View>
          {labels.map((l) => (
            <AppText key={`${l.text}-${l.x}`} role="monoXs" tone={l.tone} style={[styles.miniLabel, { left: l.x - 2 }]}>
              {l.text}
            </AppText>
          ))}
        </>
      ) : null}
    </View>
  );
}

/**
 * The on-now postcard at the front of the Home stack (Airmail v4 · 01): an
 * airmail border whose stripes crawl, the live scene window with a blinking
 * ON NOW chip, the title, a mini route of today and the next stop. Its paper
 * and window are measured for the expand into the trip (02).
 */
export const OnNowPostcard = forwardRef<OnNowPostcardHandle, OnNowPostcardProps>(function OnNowPostcard(
  { trip, viewerId, front, collapsing },
  ref,
) {
  const { colors } = useTheme();
  const paperRef = useRef<View>(null);
  const windowRef = useRef<View>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const itinerary = useItinerary(trip.id);
  const country = matchDestination(trip.destination);

  const crawl = useLoop(motion.choreo.home.stripeCrawl, front);
  const blink = useLoop(motion.choreo.home.blink, front);
  const crawlStyle = useAnimatedStyle(() => ({ transform: [{ translateX: crawl.value * CRAWL_DISTANCE }] }));
  // 1 → .25 → 1, eased in and out.
  const blinkStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.75 * (0.5 - 0.5 * Math.cos(blink.value * 2 * Math.PI)),
  }));

  useImperativeHandle(ref, () => ({
    measure: (done) => {
      const paper = paperRef.current;
      const win = windowRef.current;
      if (!paper || !win) {
        done(null);
        return;
      }
      paper.measureInWindow((px, py, pw, ph) => {
        win.measureInWindow((wx, wy, ww, wh) => {
          if (!pw || !ww) done(null);
          else done({ paper: { x: px, y: py, width: pw, height: ph }, window: { x: wx, y: wy, width: ww, height: wh } });
        });
      });
    },
  }));

  const today = toDateOnly(new Date());
  const stops = useMemo(
    () =>
      (itinerary.data ?? [])
        .filter((i) => i.startAt && toDateOnly(new Date(i.startAt)) === today)
        .sort((a, b) => (a.startAt as string).localeCompare(b.startAt as string)),
    [itinerary.data, today],
  );
  const now = Date.now();
  const nextStop = stops.find((s) => new Date(s.startAt as string).getTime() > now);
  const wording = otherMembersWording(trip.memberProfiles, viewerId);
  const meta = [wording, formatTripRange(trip.startDate, trip.endDate)].filter(Boolean).join(' · ');

  return (
    <View style={[styles.border, { boxShadow: shadows.onNow }]}>
      <View style={styles.stripeClip} pointerEvents="none">
        <Animated.View style={[styles.stripes, crawlStyle]}>
          <AirmailStripes />
        </Animated.View>
      </View>
      <View ref={paperRef} collapsable={false} style={[styles.paper, { backgroundColor: colors.paper }]}>
        <View
          ref={windowRef}
          collapsable={false}
          style={styles.window}
          onLayout={(e) => setWindowWidth(e.nativeEvent.layout.width)}
        >
          {windowWidth > 0 ? (
            <TripScene
              country={country}
              coverImagePath={trip.coverImagePath}
              crop="card"
              width={windowWidth}
              height={SCENE_HEIGHT}
              live
              paused={!front && !collapsing}
              active={collapsing ? true : undefined}
            />
          ) : null}
          <View style={[styles.chip, { backgroundColor: colors.paper, boxShadow: shadows.chip }]}>
            <Animated.View style={[styles.dot, { backgroundColor: colors.airmailRed }, blinkStyle]} />
            <AppText role="kickerSm">
              ON NOW · DAY {dayNumber(trip.startDate)} OF {tripDays(trip.startDate, trip.endDate)}
            </AppText>
          </View>
        </View>
        <View style={styles.titleBlock}>
          <AppText role="cardTitleLg" numberOfLines={1}>
            {trip.name}
          </AppText>
          {meta ? (
            <AppText role="meta" tone="secondary" numberOfLines={1}>
              {meta}
            </AppText>
          ) : null}
        </View>
        {stops.length > 0 ? <MiniRoute stops={stops} active={front} /> : null}
        {nextStop ? (
          <View style={[styles.nextRow, { borderTopColor: colors.hairline }]}>
            <AppText role="kicker" tone="accent" style={styles.nextKicker}>
              NEXT
            </AppText>
            <AppText role="tagLabel" numberOfLines={1} style={[styles.nextText, { fontSize: 16 }]}>
              {nextStop.title} at {formatTimePadded(nextStop.startAt as string)}
            </AppText>
            <ChevronRight size={18} color={colors.ink3} strokeWidth={iconStrokeWidth} />
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  border: {
    height: STACK_CARD_HEIGHT,
    borderRadius: radius.brandOuter,
    padding: BORDER,
  },
  stripeClip: { ...StyleSheet.absoluteFill, borderRadius: radius.brandOuter, overflow: 'hidden' },
  stripes: { position: 'absolute', top: 0, bottom: 0, left: -2 * CRAWL_DISTANCE, right: 0 },
  paper: {
    flex: 1,
    borderRadius: radius.airmailInner,
    paddingTop: 4,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  window: { height: SCENE_HEIGHT, borderRadius: 1, overflow: 'hidden' },
  chip: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingTop: 4,
    paddingRight: 9,
    paddingBottom: 4,
    paddingLeft: 8,
    borderRadius: radius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  titleBlock: { paddingTop: 12, paddingHorizontal: 10 },
  miniRoute: { height: 44, marginTop: 12, marginHorizontal: 10 },
  miniInk: { position: 'absolute', left: MARKER / 2, top: 8, height: 2.5, borderRadius: 2 },
  miniDashClip: { position: 'absolute', top: 8, height: 2, overflow: 'hidden' },
  miniDashRow: { flexDirection: 'row', gap: DASH, marginLeft: -2 * DASH },
  miniDash: { width: DASH, height: 2 },
  marker: { position: 'absolute', top: 2, width: MARKER, height: MARKER, borderRadius: radius.chip },
  miniPlane: {
    position: 'absolute',
    top: -2 - PLANE_RING,
    width: PLANE_DISC + 2 * PLANE_RING,
    height: PLANE_DISC + 2 * PLANE_RING,
    marginLeft: -PLANE_RING,
    borderRadius: PLANE_DISC / 2 + PLANE_RING,
    borderWidth: PLANE_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planeIcon: { transform: [{ rotate: '45deg' }] },
  miniLabel: { position: 'absolute', top: 26 },
  nextRow: {
    height: 44,
    marginTop: 10,
    marginHorizontal: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextKicker: { letterSpacing: 0.6 },
  nextText: { flex: 1, minWidth: 0 },
});

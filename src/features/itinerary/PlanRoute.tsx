import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, {
  type SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Plane } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { easing, sampleTrack, useEntrance, useLoop, useMotion, useTimeline } from '@/components/motion';
import { useAppActive } from '@/components/useAppActive';
import {
  TICKET_ROTATION,
  dropIn,
  nowTagPop,
  statusTagStamp,
  stopStampPop,
} from '@/components/motion/keyframes';
import { StopStamp, STOP_STAMP_HEIGHT, STOP_STAMP_WIDTH } from '@/features/trips/StopStamp';
import { countdownLabel, freeTimeLabel, type CountryKey } from '@/features/trips/destinations';
import { formatTimePadded } from '@/lib/format/date';
import { motion, radius, shadows, useTheme } from '@/theme';
import type { ItineraryItem } from '@/lib/types';
import { minutesUntil, statusLabel, type DayRow } from './group';
import {
  NOW_SLOT,
  ROUTE,
  flightStartY,
  layoutRoute,
  minutesOfDay,
  nowSlotIndex,
  routeYAt,
  withNowSlot,
  type RouteRowInput,
  type RoutePoint,
} from './route';

/** Route geometry, in points from the screen's left edge (README Plan). */
const GEO = {
  stampLeft: 34,
  lineLeft: 51,
  lineWidth: 2,
  textLeft: 84,
  textRight: 16,
  ticketLeft: 78,
  ticketRight: 14,
  /** Compact rows centre their single line on the 42 pt stamp. */
  compactTextTop: 8,
  /** The NEXT ticket starts above its stamp. */
  ticketLift: 14,
  plane: 28,
  planeRing: 4,
  dash: 5,
  dashPitch: 10,
  freeLabel: 18,
} as const;

/**
 * A position on the route that rides the reflow (README 02): placed at once,
 * then every change animates over 300 ms `standard` from where it is toward its
 * new value, like the plane, so nothing heads away from its end. Placed at once
 * until the rows are measured, and under reduced motion.
 */
function useReflow(value: number, on: boolean): SharedValue<number> {
  const v = useSharedValue(value);
  useEffect(() => {
    v.value = on ? withTiming(value, { duration: motion.choreo.plan.nowSlot, easing: easing('standard') }) : value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return v;
}

/** First-pass heights before rows are measured. */
const ESTIMATE = { compact: STOP_STAMP_HEIGHT, block: 76, ticket: 104 } as const;

type RowKind = 'compact' | 'block' | 'ticket';

export type RouteDay = 'past' | 'today' | 'future' | 'untimed';

interface PlanRouteProps {
  rows: DayRow[];
  country: CountryKey | null;
  nextId: string | null;
  now: Date;
  day: RouteDay;
  /** Tab entrance base delay b. */
  base: number;
  /** True while the tab's entrance is still due (rows mounting later sit still). */
  entering: boolean;
  /** Advance a stop's status; `onFail` runs if the change doesn't stick. */
  onAdvance: (item: ItineraryItem, onFail: () => void) => void;
  onEdit: (item: ItineraryItem) => void;
}

function rowTime(item: ItineraryItem): string {
  return item.startAt ? formatTimePadded(item.startAt) : '—';
}

function StatusTag({
  item,
  boxed,
  stampIn,
}: {
  item: ItineraryItem;
  boxed?: boolean;
  /** Stamps in on mount: the tag is keyed by status, so a swap mounts it hidden. */
  stampIn: boolean;
}) {
  const { colors } = useTheme();
  const done = item.status === 'done';
  const color = done ? colors.ink3 : item.status === 'confirmed' ? colors.ink : colors.ink2;
  const p = useEntrance(motion.duration.stampTag, 0, stampIn);
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(statusTagStamp.opacity, p.value, motion.easing.standard),
    transform: [
      { scale: sampleTrack(statusTagStamp.scale, p.value, motion.easing.standard) },
      { rotate: `${sampleTrack(statusTagStamp.rotate, p.value, motion.easing.standard)}deg` },
    ],
  }));
  return (
    <Animated.View style={[boxed ? [styles.boxedTag, { borderColor: colors.ink }] : null, style]}>
      <AppText role="tagSm" style={{ color: boxed ? colors.ink : color, letterSpacing: boxed ? 0.6 : 0.5 }}>
        {statusLabel(item.status)}
      </AppText>
    </Animated.View>
  );
}

/** A status's place in a letter's life: going backwards never waits. */
const STATUS_RANK: Record<ItineraryItem['status'], number> = { planned: 0, confirmed: 1, done: 2 };

function RouteStop({
  item: live,
  kind: layoutKind,
  top,
  index,
  country,
  now,
  base,
  entering,
  onAdvance,
  onEdit,
  onMeasure,
  reflow,
}: {
  item: ItineraryItem;
  kind: RowKind;
  top: number;
  index: number;
  country: CountryKey | null;
  now: Date;
  base: number;
  entering: boolean;
  /** Advance a stop's status; `onFail` runs if the change doesn't stick. */
  onAdvance: (item: ItineraryItem, onFail: () => void) => void;
  onEdit: (item: ItineraryItem) => void;
  onMeasure: (id: string, height: number) => void;
  /** Positions animate to their new values (see useReflow). */
  reflow: boolean;
}) {
  const { colors } = useTheme();
  // The status the stamp's contact delivered: only that tag stamps in.
  const [stamped, setStamped] = useState<ItineraryItem['status'] | null>(null);

  // The row keeps showing the previous status, tag and style, while the stamp
  // is in the air (README 03/04); it swaps on the stamp's contact frame, and
  // at once when the status moves backwards.
  // The press drives the stamp (README 03 v4.1.2): a tapped status is pending
  // until the data catches up, so the segment starts on the next frame.
  const [pending, setPending] = useState<ItineraryItem['status'] | null>(null);
  const pressedAt = useRef<number | null>(null);
  if (pending !== null && live.status === pending) setPending(null);
  const status = pending ?? live.status;
  const [shown, setShown] = useState(status);
  if (shown !== status && STATUS_RANK[status] < STATUS_RANK[shown]) setShown(status);
  const item = shown === live.status ? live : { ...live, status: shown };
  const kind: RowKind = layoutKind === 'ticket' ? 'ticket' : shown === 'done' ? 'compact' : 'block';
  const stampTop = top + (kind === 'ticket' ? GEO.ticketLift : 0);
  const done = item.status === 'done';
  const rowTop = useReflow(kind === 'ticket' ? top : kind === 'compact' ? stampTop + GEO.compactTextTop : stampTop, reflow);
  const stampY = useReflow(stampTop, reflow);
  const rowTopStyle = useAnimatedStyle(() => ({ top: rowTop.value }));
  const stampTopStyle = useAnimatedStyle(() => ({ top: stampY.value }));

  const pop = useEntrance(
    motion.duration.pop2,
    base + motion.choreo.plan.stopStamps + index * motion.stagger.routeStamp,
    entering,
  );
  const popStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(stopStampPop.opacity, pop.value, motion.easing.standard),
    transform: [
      { scale: sampleTrack(stopStampPop.scale, pop.value, motion.easing.standard) },
      { rotate: `${sampleTrack(stopStampPop.rotate, pop.value, motion.easing.standard)}deg` },
    ],
  }));

  const ticketKeys = dropIn(TICKET_ROTATION);
  const ticketIn = useEntrance(motion.duration.drop, base + motion.choreo.plan.ticket, entering && kind === 'ticket');
  const ticketStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(ticketKeys.opacity, ticketIn.value, motion.easing.drop),
    transform: [
      { translateY: sampleTrack(ticketKeys.translateY, ticketIn.value, motion.easing.drop) },
      { rotate: `${sampleTrack(ticketKeys.rotate, ticketIn.value, motion.easing.drop)}deg` },
    ],
  }));

  const nextStatus = status === 'planned' ? 'confirmed' : status === 'confirmed' ? 'done' : null;
  const advance = () => {
    if (!nextStatus) return;
    pressedAt.current = Date.now();
    setPending(nextStatus);
    // A change that fails seeks the stamp back to the stored status.
    onAdvance({ ...live, status }, () => setPending(null));
  };
  const stampLabel = nextStatus
    ? `Mark ${item.title} ${statusLabel(nextStatus).toLowerCase()}`
    : `Edit ${item.title}`;
  const sub = item.location ?? item.description;

  const measure = (height: number) => {
    const offset = kind === 'compact' ? GEO.compactTextTop : 0;
    const box = kind === 'ticket' ? height : Math.max(STOP_STAMP_HEIGHT, height + offset);
    onMeasure(item.id, box);
  };

  return (
    <>
      {kind === 'ticket' ? (
        <Animated.View
          style={[
            styles.ticket,
            { backgroundColor: colors.paper, boxShadow: shadows.nextTicket },
            rowTopStyle,
            ticketStyle,
          ]}
          onLayout={(e) => measure(e.nativeEvent.layout.height)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
            onPress={() => onEdit(live)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.ticketHead}>
              <AppText role="kicker" tone="accent" style={styles.ticketKicker}>
                NEXT · {item.startAt ? countdownLabel(minutesUntil(item.startAt, now)) : 'ANYTIME'}
              </AppText>
              <StatusTag key={item.status} item={item} boxed stampIn={stamped === item.status} />
            </View>
            <View style={styles.baselineRow}>
              <AppText role="time" style={styles.ticketTime}>
                {rowTime(item)}
              </AppText>
              <AppText role="ticketTitle" style={styles.flexText}>
                {item.title}
              </AppText>
            </View>
            {sub ? (
              <AppText role="bodySm" tone="secondary" style={styles.subLine}>
                {sub}
              </AppText>
            ) : null}
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View
          onLayout={(e) => measure(e.nativeEvent.layout.height)}
          style={[styles.rowText, rowTopStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
            onPress={() => onEdit(live)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            {kind === 'compact' ? (
              <View style={styles.compactRow}>
                <AppText role="routeTime" tone="muted">
                  {rowTime(item)}
                </AppText>
                <AppText role="rowTitle" tone="muted" numberOfLines={1} style={[styles.compactTitle, styles.flexText]}>
                  {item.title}
                </AppText>
                <StatusTag key={item.status} item={item} stampIn={stamped === item.status} />
              </View>
            ) : (
              <>
                <View style={styles.baselineRow}>
                  <AppText role="routeTime" tone={done ? 'muted' : 'primary'}>
                    {rowTime(item)}
                  </AppText>
                  <AppText role="rowTitle" tone={done ? 'muted' : 'primary'} style={styles.flexText}>
                    {item.title}
                  </AppText>
                </View>
                {sub ? (
                  <AppText role="bodySm" tone="secondary" style={styles.subLine}>
                    {sub}
                  </AppText>
                ) : null}
                <View style={styles.tagLine}>
                  <StatusTag key={item.status} item={item} stampIn={stamped === item.status} />
                </View>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
      <Animated.View style={[styles.stamp, stampTopStyle, popStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stampLabel}
          hitSlop={4}
          onPress={() => (nextStatus ? advance() : onEdit(live))}
          // No dim when the tap advances the stamp: its segment starts on
          // release and the dim would cover its first frames, then lift in one
          // step. A done stamp's tap opens the editor and keeps it.
          style={({ pressed }) => pressed && !nextStatus && styles.pressed}
        >
          <StopStamp
            status={status}
            pressedAt={pending !== null ? pressedAt.current : null}
            country={country}
            onContact={(landed) => {
              // One commit swaps the text and mounts the new tag hidden, so it
              // never paints at rest before stamping in.
              setStamped(landed);
              setShown(landed);
            }}
          />
        </Pressable>
      </Animated.View>
    </>
  );
}

/** A "6 h 30 free" label in a gap, riding the reflow. */
function FreeLabel({ top, minutes, reflow }: { top: number; minutes: number; reflow: boolean }) {
  const y = useReflow(top, reflow);
  const style = useAnimatedStyle(() => ({ top: y.value }));
  return (
    <Animated.View style={[styles.free, style]}>
      <AppText role="metaSm" tone="muted">
        {freeTimeLabel(minutes)}
      </AppText>
    </Animated.View>
  );
}

/**
 * The dashed line ahead of the plane, marching downward. An idle loop: off
 * with reduced motion, and parked while the screen is out of focus (Plan
 * stays mounted under the Trip page) or the app is in the background.
 */
function MarchingDashes({ top, height, reflow }: { top: number; height: number; reflow: boolean }) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const march = useLoop(motion.choreo.plan.routeMarch, isFocused && appActive);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: march.value * GEO.dashPitch }] }));
  const y = useReflow(top, reflow);
  const h = useReflow(height, reflow);
  const boxStyle = useAnimatedStyle(() => ({ top: y.value, height: Math.max(0, h.value) }));
  const count = Math.ceil(height / GEO.dashPitch) + 2;
  if (height <= 0) return null;
  return (
    <Animated.View style={[styles.dashClip, boxStyle]} pointerEvents="none">
      <Animated.View style={[styles.dashColumn, style]}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dash, { backgroundColor: colors.ink3 }]} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Plan route (Airmail v4 · Plan): stops at heights proportional to clock time,
 * solid ink behind the plane and marching dashes ahead of it. On entrance the
 * stop stamps pop in, the NEXT ticket drops, and the plane flies from the last
 * completed or confirmed stop to now with the ink growing behind it; the NOW
 * tag pops as it arrives. After that the plane is placed each minute without
 * animation.
 */
export function PlanRoute({ rows, country, nextId, now, day, base, entering, onAdvance, onEdit }: PlanRouteProps) {
  const { colors } = useTheme();
  const { reduced, ms } = useMotion();
  const [heights, setHeights] = useState<Record<string, number>>({});

  const stops = useMemo(() => {
    const out: { item: ItineraryItem; kind: RowKind; freeBefore: boolean; freeMinutes: number }[] = [];
    let pendingFree = 0;
    for (const row of rows) {
      if (row.type === 'free') {
        pendingFree = row.minutes;
        continue;
      }
      const kind: RowKind =
        row.item.id === nextId ? 'ticket' : row.item.status === 'done' ? 'compact' : 'block';
      out.push({ item: row.item, kind, freeBefore: pendingFree > 0, freeMinutes: pendingFree });
      pendingFree = 0;
    }
    return out;
  }, [rows, nextId]);

  const timedRoute = day !== 'untimed';
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const stopMinutes = stops.map((s) => (timedRoute && s.item.startAt ? minutesOfDay(s.item.startAt) : null));
  // Today, "now" takes a slot of its own between rows (README 02 v4.1.1).
  const slotAt = day === 'today' && stopMinutes.some((m) => m !== null) ? nowSlotIndex(stopMinutes, nowMinutes) : null;

  const inputs = stops.map((s, i) => ({
    minutes: stopMinutes[i],
    height: heights[s.item.id] ?? ESTIMATE[s.kind],
    freeBefore: s.freeBefore,
  }));
  const laid: RouteRowInput[] = slotAt === null ? inputs : withNowSlot(inputs, slotAt);
  const laidTops = layoutRoute(laid);
  const tops = slotAt === null ? laidTops : laidTops.filter((_, i) => i !== slotAt);
  const slotY = slotAt === null ? null : laidTops[slotAt] + NOW_SLOT.height / 2;
  // The free-time label of each laid row, in the gap above it.
  const laidFree = stops.map((s) => s.freeMinutes);
  if (slotAt !== null) {
    laidFree.splice(slotAt, 0, stops[slotAt]?.freeMinutes ?? 0);
    if (slotAt < stops.length) laidFree[slotAt + 1] = 0;
  }

  const onMeasure = useCallback((id: string, height: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? -1) - height) < 0.5 ? prev : { ...prev, [id]: height }));
  }, []);

  const points: RoutePoint[] = stops.map((s, i) => ({
    minutes: stopMinutes[i],
    y: tops[i] + (s.kind === 'ticket' ? GEO.ticketLift : 0) + STOP_STAMP_HEIGHT / 2,
    status: s.item.status,
  }));
  if (slotY !== null) points.push({ minutes: null, y: slotY, slot: true });
  const stampYs = points.filter((p) => !p.slot).map((p) => p.y);
  // Before the first stop the plane sits above it, and the line starts there.
  const firstY = Math.min(stampYs[0] ?? 0, slotY ?? Infinity);
  const lastY = stampYs[stampYs.length - 1] ?? 0;
  const nowY = day === 'today' ? routeYAt(points, nowMinutes) : null;
  const startY = day === 'today' ? flightStartY(points, nowMinutes) : null;
  const measured = stops.every((s) => heights[s.item.id] !== undefined);

  const height = laid.length > 0 ? laidTops[laid.length - 1] + laid[laid.length - 1].height : 0;

  // Rows reflow with the slot, once measured: before that, a height settling
  // on the first frames would slide the rows instead of placing them.
  const reflow = measured && !reduced;

  // The plane, the ink behind it and the NOW tag share one value: the plane's centre y.
  const planeY = useSharedValue(startY ?? firstY);
  const routeTop = useSharedValue(firstY);
  const nowTag = useTimeline(entering ? 0 : 1);
  const mountedAt = useRef(Date.now());
  const flown = useRef(false);

  useEffect(() => {
    if (nowY === null) return;
    if (flown.current || !entering) {
      // Placed at once the first time; after that the slot only moves with the
      // rows (now passing a stop, or a row changing height at contact), so the
      // plane, the tag and the ink ride the same 300 ms reflow (README 02 v4.1.2).
      const placed = flown.current;
      flown.current = true;
      nowTag.set(1);
      cancelAnimation(planeY);
      planeY.value =
        placed && !reduced ? withTiming(nowY, { duration: motion.choreo.plan.nowSlot, easing: easing('standard') }) : nowY;
      return;
    }
    // Fly once the rows have been measured, keeping the entrance's clock.
    if (!measured || startY === null) return;
    flown.current = true;
    const delay = Math.max(0, ms(base + motion.choreo.plan.plane) - (Date.now() - mountedAt.current));
    if (reduced) {
      planeY.value = nowY;
    } else {
      planeY.value = startY;
      planeY.value = withDelay(delay, withTiming(nowY, { duration: motion.duration.flight, easing: easing('flight') }));
    }
    nowTag.run(motion.choreo.plan.nowTag, delay + ms(motion.choreo.plan.nowTagAfterPlane));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowY, measured, startY]);

  // The line's top moves with the rows too (the slot leaving the top of the day).
  useEffect(() => {
    routeTop.value =
      measured && !reduced
        ? withTiming(firstY, { duration: motion.choreo.plan.nowSlot, easing: easing('standard') })
        : firstY;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstY]);

  const inkEnd = day === 'past' ? lastY : day === 'today' ? null : firstY;
  const inkStyle = useAnimatedStyle(() => ({
    top: routeTop.value,
    height: Math.max(0, (inkEnd ?? planeY.value) - routeTop.value),
  }));
  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: planeY.value - (GEO.plane + 2 * GEO.planeRing) / 2 }],
  }));
  const nowTagStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(nowTagPop.opacity, nowTag.p.value, motion.easing.standard),
    transform: [
      { translateY: planeY.value - NOW_SLOT.tag / 2 },
      { scale: sampleTrack(nowTagPop.scale, nowTag.p.value, motion.easing.standard) },
    ],
  }));

  return (
    <View style={[styles.route, { height }]}>
      <MarchingDashes top={firstY} height={lastY - firstY} reflow={reflow} />
      <Animated.View style={[styles.ink, { backgroundColor: colors.ink }, inkStyle]} />

      {laid.map((row, i) => {
        const minutes = laidFree[i];
        if (!row.freeBefore || i === 0 || !minutes) return null;
        const prevBottom = laidTops[i - 1] + laid[i - 1].height;
        const gap = laidTops[i] - prevBottom;
        if (gap < GEO.freeLabel + 8) return null;
        return (
          <FreeLabel
            // Keyed by the stop below the gap, so a label keeps its text and
            // slides when the slot moves in or out of its gap.
            key={`free-${stops[slotAt !== null && i > slotAt ? i - 1 : i].item.id}`}
            top={prevBottom + (gap - GEO.freeLabel) / 2}
            minutes={minutes}
            reflow={reflow}
          />
        );
      })}

      {stops.map((s, i) => (
        <RouteStop
          key={s.item.id}
          item={s.item}
          kind={s.kind}
          top={tops[i]}
          index={i}
          country={country}
          now={now}
          base={base}
          entering={entering}
          onAdvance={onAdvance}
          onEdit={onEdit}
          onMeasure={onMeasure}
          reflow={reflow}
        />
      ))}

      {nowY !== null ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.plane,
              { backgroundColor: colors.airmailBlue, borderColor: colors.bg, boxShadow: shadows.plane },
              planeStyle,
            ]}
          >
            {/* A View turns about its centre; the Svg's own transform turned it about
                its corner and out of the disc. */}
            <View style={styles.planeIcon}>
              <Plane size={15} color={colors.paper} strokeWidth={2} />
            </View>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.nowTag, { height: NOW_SLOT.tag, backgroundColor: colors.airmailBlue }, nowTagStyle]}
          >
            <AppText role="tag" style={{ color: colors.paper, letterSpacing: 0.6 }}>
              NOW {formatTimePadded(now.toISOString())}
            </AppText>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** Space the ticket needs above the first stop. */
export const ROUTE_TOP_ROOM = GEO.ticketLift;
export { ROUTE };

const styles = StyleSheet.create({
  route: { position: 'relative' },
  dashClip: { position: 'absolute', left: GEO.lineLeft, width: GEO.lineWidth, overflow: 'hidden' },
  dashColumn: { marginTop: -GEO.dashPitch, gap: GEO.dashPitch - GEO.dash },
  dash: { width: GEO.lineWidth, height: GEO.dash },
  ink: { position: 'absolute', left: GEO.lineLeft, width: GEO.lineWidth, borderRadius: 1 },
  stamp: { position: 'absolute', left: GEO.stampLeft, width: STOP_STAMP_WIDTH, height: STOP_STAMP_HEIGHT },
  rowText: { position: 'absolute', left: GEO.textLeft, right: GEO.textRight },
  compactRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  compactTitle: { fontSize: 17, lineHeight: 22 },
  baselineRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  flexText: { flexShrink: 1 },
  subLine: { marginTop: 2 },
  tagLine: { flexDirection: 'row', marginTop: 6 },
  boxedTag: { borderWidth: 1.25, borderRadius: radius.chip, paddingVertical: 1, paddingHorizontal: 5 },
  ticket: {
    position: 'absolute',
    left: GEO.ticketLeft,
    right: GEO.ticketRight,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketKicker: { letterSpacing: 0.6, flexShrink: 1 },
  ticketTime: { fontSize: 14, lineHeight: 18 },
  free: { position: 'absolute', left: GEO.textLeft, right: GEO.textRight, height: GEO.freeLabel },
  plane: {
    position: 'absolute',
    top: 0,
    left: GEO.lineLeft + GEO.lineWidth / 2 - (GEO.plane + 2 * GEO.planeRing) / 2,
    width: GEO.plane + 2 * GEO.planeRing,
    height: GEO.plane + 2 * GEO.planeRing,
    borderRadius: (GEO.plane + 2 * GEO.planeRing) / 2,
    borderWidth: GEO.planeRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planeIcon: { transform: [{ rotate: '135deg' }] },
  nowTag: {
    position: 'absolute',
    left: GEO.textLeft,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.chip,
    top: 0,
    justifyContent: 'center',
    transformOrigin: 'left',
  },
  pressed: { opacity: 0.7 },
});

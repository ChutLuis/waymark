import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Plane } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { easing, sampleTrack, useEntrance, useMotion, useTimeline } from '@/components/motion';
import {
  TICKET_ROTATION,
  dropIn,
  nowTagPop,
  statusTagStamp,
  stopStampPop,
} from '@/components/motion/keyframes';
import { StopStamp, STOP_STAMP_HEIGHT, STOP_STAMP_WIDTH } from '@/features/trips/StopStamp';
import { countdownLabel, freeTimeLabel, type CountryKey } from '@/features/trips/destinations';
import { formatTime, formatTimePadded } from '@/lib/format/date';
import { motion, radius, shadows, useTheme } from '@/theme';
import type { ItineraryItem } from '@/lib/types';
import { minutesUntil, statusLabel, type DayRow } from './group';
import { flightStartY, layoutRoute, minutesOfDay, routeYAt, ROUTE, type RoutePoint } from './route';

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
  onAdvance: (item: ItineraryItem) => void;
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
  stampIn: ReturnType<typeof useTimeline>;
}) {
  const { colors } = useTheme();
  const done = item.status === 'done';
  const color = done ? colors.ink3 : item.status === 'confirmed' ? colors.ink : colors.ink2;
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(statusTagStamp.opacity, stampIn.p.value, motion.easing.standard),
    transform: [
      { scale: sampleTrack(statusTagStamp.scale, stampIn.p.value, motion.easing.standard) },
      { rotate: `${sampleTrack(statusTagStamp.rotate, stampIn.p.value, motion.easing.standard)}deg` },
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

function RouteStop({
  item,
  kind,
  top,
  index,
  country,
  now,
  base,
  entering,
  onAdvance,
  onEdit,
  onMeasure,
}: {
  item: ItineraryItem;
  kind: RowKind;
  top: number;
  index: number;
  country: CountryKey | null;
  now: Date;
  base: number;
  entering: boolean;
  onAdvance: (item: ItineraryItem) => void;
  onEdit: (item: ItineraryItem) => void;
  onMeasure: (id: string, height: number) => void;
}) {
  const { colors } = useTheme();
  const tag = useTimeline(1);
  const stampTop = top + (kind === 'ticket' ? GEO.ticketLift : 0);
  const done = item.status === 'done';

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

  const nextStatus = item.status === 'planned' ? 'confirmed' : item.status === 'confirmed' ? 'done' : null;
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
            { top, backgroundColor: colors.paper, boxShadow: shadows.nextTicket },
            ticketStyle,
          ]}
          onLayout={(e) => measure(e.nativeEvent.layout.height)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
            onPress={() => onEdit(item)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.ticketHead}>
              <AppText role="kicker" tone="accent" style={styles.ticketKicker}>
                NEXT · {item.startAt ? countdownLabel(minutesUntil(item.startAt, now)) : 'ANYTIME'}
              </AppText>
              <StatusTag item={item} boxed stampIn={tag} />
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.title}`}
          onPress={() => onEdit(item)}
          onLayout={(e) => measure(e.nativeEvent.layout.height)}
          style={({ pressed }) => [
            styles.rowText,
            { top: kind === 'compact' ? stampTop + GEO.compactTextTop : stampTop },
            pressed && styles.pressed,
          ]}
        >
          {kind === 'compact' ? (
            <View style={styles.compactRow}>
              <AppText role="routeTime" tone="muted">
                {rowTime(item)}
              </AppText>
              <AppText role="rowTitle" tone="muted" numberOfLines={1} style={[styles.compactTitle, styles.flexText]}>
                {item.title}
              </AppText>
              <StatusTag item={item} stampIn={tag} />
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
                <StatusTag item={item} stampIn={tag} />
              </View>
            </>
          )}
        </Pressable>
      )}
      <Animated.View style={[styles.stamp, { top: stampTop }, popStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stampLabel}
          hitSlop={4}
          onPress={() => (nextStatus ? onAdvance(item) : onEdit(item))}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <StopStamp
            status={item.status}
            country={country}
            onContact={() => tag.run(motion.duration.stampTag)}
          />
        </Pressable>
      </Animated.View>
    </>
  );
}

/** The dashed line ahead of the plane, marching downward (idle loop). */
function MarchingDashes({ top, height }: { top: number; height: number }) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const offset = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(GEO.dashPitch, { duration: motion.choreo.plan.routeMarch, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [reduced, offset]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const count = Math.ceil(height / GEO.dashPitch) + 2;
  if (height <= 0) return null;
  return (
    <View style={[styles.dashClip, { top, height }]} pointerEvents="none">
      <Animated.View style={[styles.dashColumn, style]}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dash, { backgroundColor: colors.ink3 }]} />
        ))}
      </Animated.View>
    </View>
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
  const tops = useMemo(
    () =>
      layoutRoute(
        stops.map((s) => ({
          minutes: timedRoute && s.item.startAt ? minutesOfDay(s.item.startAt) : null,
          height: heights[s.item.id] ?? ESTIMATE[s.kind],
          freeBefore: s.freeBefore,
        })),
      ),
    [stops, heights, timedRoute],
  );

  const onMeasure = useCallback((id: string, height: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? -1) - height) < 0.5 ? prev : { ...prev, [id]: height }));
  }, []);

  const points: RoutePoint[] = stops.map((s, i) => ({
    minutes: timedRoute && s.item.startAt ? minutesOfDay(s.item.startAt) : null,
    y: tops[i] + (s.kind === 'ticket' ? GEO.ticketLift : 0) + STOP_STAMP_HEIGHT / 2,
    status: s.item.status,
  }));
  const firstY = points[0]?.y ?? 0;
  const lastY = points[points.length - 1]?.y ?? 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowY = day === 'today' ? routeYAt(points, nowMinutes) : null;
  const startY = day === 'today' ? flightStartY(points, nowMinutes) : null;
  const measured = stops.every((s) => heights[s.item.id] !== undefined);

  const height =
    stops.length > 0 ? tops[tops.length - 1] + (heights[stops[stops.length - 1].item.id] ?? ESTIMATE[stops[stops.length - 1].kind]) : 0;

  // The plane and the ink behind it share one value: the plane's centre y.
  const planeY = useSharedValue(startY ?? firstY);
  const nowTag = useTimeline(entering ? 0 : 1);
  const mountedAt = useRef(Date.now());
  const flown = useRef(false);

  useEffect(() => {
    if (nowY === null) return;
    if (flown.current || !entering) {
      // Placed each minute without animation.
      flown.current = true;
      cancelAnimation(planeY);
      planeY.value = nowY;
      nowTag.set(1);
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

  const inkEnd = day === 'past' ? lastY : day === 'today' ? null : firstY;
  const inkStyle = useAnimatedStyle(() => ({
    height: Math.max(0, (inkEnd ?? planeY.value) - firstY),
  }));
  const planeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: planeY.value - (GEO.plane + 2 * GEO.planeRing) / 2 }],
  }));
  const nowTagStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(nowTagPop.opacity, nowTag.p.value, motion.easing.standard),
    transform: [{ scale: sampleTrack(nowTagPop.scale, nowTag.p.value, motion.easing.standard) }],
  }));

  return (
    <View style={[styles.route, { height }]}>
      <MarchingDashes top={firstY} height={lastY - firstY} />
      <Animated.View style={[styles.ink, { top: firstY, backgroundColor: colors.ink }, inkStyle]} />

      {stops.map((s, i) => {
        if (!s.freeBefore || i === 0) return null;
        const prevBottom = tops[i - 1] + (heights[stops[i - 1].item.id] ?? ESTIMATE[stops[i - 1].kind]);
        const gap = tops[i] - prevBottom;
        if (gap < GEO.freeLabel + 8) return null;
        return (
          <AppText
            key={`free-${s.item.id}`}
            role="metaSm"
            tone="muted"
            style={[styles.free, { top: prevBottom + (gap - GEO.freeLabel) / 2 }]}
          >
            {freeTimeLabel(s.freeMinutes)}
          </AppText>
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
            <Plane size={15} color={colors.paper} strokeWidth={2} style={styles.planeIcon} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.nowTag, { top: nowY - 9, backgroundColor: colors.airmailBlue }, nowTagStyle]}
          >
            <AppText role="tag" style={{ color: colors.paper, letterSpacing: 0.6 }}>
              NOW {formatTime(now.toISOString())}
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
  free: { position: 'absolute', left: GEO.textLeft, height: GEO.freeLabel },
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
    transformOrigin: 'left',
  },
  pressed: { opacity: 0.7 },
});

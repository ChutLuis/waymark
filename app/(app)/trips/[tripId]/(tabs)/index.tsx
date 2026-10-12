import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { sampleTrack, useEntrance } from '@/components/motion';
import { rise } from '@/components/motion/keyframes';
import { ItineraryItemEditor } from '@/features/itinerary/ItineraryItemEditor';
import { DayStrip, DAY_STRIP_HEIGHT } from '@/features/itinerary/DayStrip';
import { PlanRoute, ROUTE_TOP_ROOM, type RouteDay } from '@/features/itinerary/PlanRoute';
import {
  buildDayRows,
  defaultSelectedDay,
  nextStop as findNextStop,
  tripDaysList,
  type DayRow,
} from '@/features/itinerary/group';
import { stopsSummary } from '@/features/itinerary/route';
import { useItinerary, useSetItineraryStatus } from '@/features/itinerary/hooks';
import { matchDestination } from '@/features/trips/destinations';
import { SHELL } from '@/features/trips/shellLayout';
import { tabEntranceBase } from '@/features/trips/shellMotion';
import { useTrip } from '@/features/trips/hooks';
import { motion, radius, spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';

const NEXT_STATUS: Record<ItineraryItem['status'], ItineraryItem['status'] | null> = {
  planned: 'confirmed',
  confirmed: 'done',
  done: null,
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How long the tab's entrance is "due": rows mounting after it sit still. */
const ENTRANCE_WINDOW =
  motion.choreo.expand.tabBase + motion.choreo.plan.plane + motion.duration.flight + motion.choreo.plan.nowTag;

function weekdayName(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** The day title block: "DAY 6 OF 10", the weekday, the day's summary, and Add. */
function TitleBlock({
  kicker,
  title,
  summary,
  base,
  onAdd,
}: {
  kicker: string;
  title: string;
  summary: string;
  base: number;
  onAdd: () => void;
}) {
  const { colors } = useTheme();
  const keys = rise(16);
  const p = useEntrance(motion.duration.rise, base + motion.choreo.plan.title);
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.standard),
    transform: [{ translateY: sampleTrack(keys.translateY, p.value, motion.easing.standard) }],
  }));
  return (
    <Animated.View style={[styles.titleRow, style]}>
      <View style={styles.titleBlock}>
        <AppText role="kicker" tone="secondary">
          {kicker}
        </AppText>
        <AppText role="tripTitle" numberOfLines={1} style={styles.dayTitle}>
          {title}
        </AppText>
        <AppText role="meta" tone="secondary" style={styles.summary}>
          {summary}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an itinerary item"
        onPress={onAdd}
        style={({ pressed }) => [styles.addButton, { backgroundColor: colors.ink }, pressed && styles.pressed]}
      >
        <Plus size={18} color={colors.paper} strokeWidth={2.4} />
        <AppText role="pillLabel" style={{ color: colors.paper }}>
          Add
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

export default function PlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useTrip(tripId);
  const itinerary = useItinerary(tripId);
  const setStatus = useSetItineraryStatus(tripId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [selectedDayChoice, setSelectedDayChoice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [base] = useState(tabEntranceBase);
  const [entering, setEntering] = useState(true);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the plane and NOW roughly current while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // The entrance plays once per tab visit; rows that mount later (another
  // day) sit still.
  useEffect(() => {
    entranceTimer.current = setTimeout(() => setEntering(false), base + ENTRANCE_WINDOW);
    return () => {
      if (entranceTimer.current) clearTimeout(entranceTimer.current);
    };
  }, [base]);

  const country = matchDestination(trip.data?.destination ?? null);
  const todayKey = toDateOnly(now);
  const days = useMemo(
    () => tripDaysList(trip.data?.startDate ?? null, trip.data?.endDate ?? null),
    [trip.data?.startDate, trip.data?.endDate],
  );

  const items = useMemo(() => itinerary.data ?? [], [itinerary.data]);
  // Undated trips have no day strip: show every item in one list.
  const hasDates = days.length > 0;
  // Untimed items get a trailing "ANY" stamp (README: Not designed fallback).
  const untimed = useMemo(() => items.filter((item) => !item.startAt), [items]);
  const strip = useMemo(
    () =>
      untimed.length > 0
        ? [...days, { key: 'ANY', weekday: 'ANY', day: '—', label: 'Anytime' }]
        : days,
    [days, untimed.length],
  );

  // Default the selected day (today if within the trip, else the first day)
  // without an effect; an explicit tap overrides it.
  const selectedDay = selectedDayChoice ?? defaultSelectedDay(days, todayKey);

  const rows = useMemo<DayRow[]>(() => {
    if (!hasDates) {
      return items
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item): DayRow => ({ type: 'item', key: item.id, item }));
    }
    if (selectedDay === 'ANY') {
      return untimed.map((item): DayRow => ({ type: 'item', key: item.id, item }));
    }
    return selectedDay ? buildDayRows(items, selectedDay) : [];
  }, [hasDates, items, selectedDay, untimed]);
  const next = useMemo(() => findNextStop(items, now), [items, now]);

  const openEditor = (item: ItineraryItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  if (itinerary.isPending || trip.isPending) return <LoadingState />;
  if (itinerary.isError) {
    return <ErrorState title="Couldn't load the itinerary" onRetry={() => itinerary.refetch()} />;
  }

  const dayItems = rows.flatMap((r) => (r.type === 'item' ? [r.item] : []));
  const routeDay: RouteDay =
    !hasDates || selectedDay === 'ANY' || !selectedDay
      ? 'untimed'
      : selectedDay < todayKey
        ? 'past'
        : selectedDay > todayKey
          ? 'future'
          : 'today';
  const toGo =
    routeDay === 'past'
      ? 0
      : routeDay === 'today'
        ? dayItems.filter((i) => (i.startAt ? new Date(i.startAt) > now : i.status !== 'done')).length
        : dayItems.filter((i) => i.status !== 'done').length;

  const dayIndex = days.findIndex((d) => d.key === selectedDay);
  const kicker = !hasDates
    ? 'NO DATES YET'
    : selectedDay === 'ANY'
      ? 'ANYTIME'
      : dayIndex >= 0
        ? `DAY ${dayIndex + 1} OF ${days.length}`
        : '';
  const title = !hasDates
    ? 'All stops'
    : selectedDay === 'ANY'
      ? 'Unscheduled'
      : selectedDay
        ? weekdayName(selectedDay)
        : '';

  return (
    <View style={styles.screen}>
      {strip.length > 0 ? (
        <DayStrip
          days={strip}
          selectedKey={selectedDay}
          todayKey={todayKey}
          base={base}
          entering={entering}
          onSelect={setSelectedDayChoice}
        />
      ) : (
        <View style={styles.stripSpacer} />
      )}
      {/* flex:1 + minHeight:0 bounds this scroller to the pane on web, so the
          page no longer grows past the window and pushes the tab bar's bottom
          edge below it (N16). */}
      <ScrollView
        testID="plan-scroll-view"
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TitleBlock
          kicker={kicker}
          title={title}
          summary={stopsSummary(dayItems.length, toGo)}
          base={base}
          onAdd={() => openEditor(null)}
        />

        {items.length === 0 ? (
          <EmptyState
            placement="top"
            title="Nothing planned yet"
            body="Start with the first thing you know is happening — even if it's just the flight."
            actionLabel="Add an item"
            onAction={() => openEditor(null)}
          />
        ) : rows.length === 0 ? (
          <View style={styles.emptyDay}>
            <AppText tone="muted" role="bodySm">
              Nothing planned for this day yet.
            </AppText>
          </View>
        ) : (
          <View style={styles.routeWrap}>
            <PlanRoute
              key={selectedDay ?? 'all'}
              rows={rows}
              country={country}
              nextId={next?.id ?? null}
              now={now}
              day={routeDay}
              base={base}
              entering={entering}
              onAdvance={(item) => {
                const target = NEXT_STATUS[item.status];
                if (target) setStatus.mutate({ itemId: item.id, status: target });
              }}
              onEdit={openEditor}
            />
          </View>
        )}
      </ScrollView>

      <ItineraryItemEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tripId={tripId}
        item={editingItem}
        tripStartDate={trip.data?.startDate ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  stripSpacer: { height: DAY_STRIP_HEIGHT },
  scroller: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingBottom: SHELL.tabContentClearance },
  titleRow: {
    paddingTop: spacing.s9 - 4,
    paddingLeft: spacing.gutter,
    paddingRight: spacing.s7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.s5,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  dayTitle: { marginTop: 4 },
  summary: { marginTop: 2, fontSize: 15, lineHeight: 20 },
  addButton: {
    height: 40,
    marginTop: 8,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  routeWrap: { marginTop: spacing.s3, paddingTop: ROUTE_TOP_ROOM },
  emptyDay: { minHeight: 50, paddingVertical: 14, paddingHorizontal: spacing.gutter, justifyContent: 'center' },
});

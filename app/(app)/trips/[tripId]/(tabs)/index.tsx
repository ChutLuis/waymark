import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { AirmailBorder } from '@/components/airmail/AirmailBorder';
import { ItineraryItemEditor } from '@/features/itinerary/ItineraryItemEditor';
import {
  buildDayRows,
  defaultSelectedDay,
  minutesUntil,
  nextStop as findNextStop,
  nowRowIndex,
  statusLabel,
  tripDaysList,
  type DayRow,
} from '@/features/itinerary/group';
import { useItinerary, useSetItineraryStatus } from '@/features/itinerary/hooks';
import { StopStamp } from '@/features/trips/StopStamp';
import { StampStill } from '@/features/trips/SceneStamp';
import {
  matchDestination,
  countdownLabel,
  formatTripRange,
  memberNamesWording,
  freeTimeLabel,
} from '@/features/trips/destinations';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { dayStampLayout, fontFamilies, hairlineWidth, shadows, spacing, useTheme } from '@/theme';
import { formatTime, toDateOnly } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';

const NEXT_STATUS: Record<ItineraryItem['status'], ItineraryItem['status'] | null> = {
  planned: 'confirmed',
  confirmed: 'done',
  done: null,
};

/** The per-tab title row: trip name, "with … · dates", and the Add action. */
function TitleRow({ title, subtitle, onAdd }: { title: string; subtitle: string; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleBlock}>
        <AppText role="tripTitle" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? <AppText role="meta" tone="secondary" style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an itinerary item"
        onPress={onAdd}
        style={({ pressed }) => [
          styles.actionPill,
          { backgroundColor: colors.ink },
          pressed && styles.pressed,
        ]}
      >
        <Plus size={18} color={colors.paper} strokeWidth={2.4} />
        <AppText role="button" style={[styles.actionLabel, { color: colors.paper }]}>
          Add
        </AppText>
      </Pressable>
    </View>
  );
}

function DayStamp({
  weekday,
  day,
  selected,
  label,
  width,
  onPress,
}: {
  weekday: string;
  day: number | string;
  selected: boolean;
  label: string;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <PerforatedStamp width={width} height={dayStampLayout.height} size="sm" tone={selected ? 'ink' : 'paper'}>
        <View style={styles.dayStampContent}>
          {/* Always three letters (SAT, SUN, MON): the word never shrinks or
              wraps; the stamp is what gives way on a narrow strip (N26). */}
          <AppText
            role="tag"
            numberOfLines={1}
            style={{
              flexShrink: 0,
              color: selected ? colors.paper : colors.ink2,
            }}
          >
            {weekday}
          </AppText>
          <AppText
            style={{ fontFamily: fontFamilies.extrabold, fontSize: 19, lineHeight: 22, color: selected ? colors.paper : colors.ink }}
          >
            {day}
          </AppText>
        </View>
      </PerforatedStamp>
    </Pressable>
  );
}

function StopStampCell({
  item,
  country,
  onPress,
  onOpen,
}: {
  item: ItineraryItem;
  country: ReturnType<typeof matchDestination>;
  onPress: () => void;
  onOpen: () => void;
}) {
  const nextStatus = NEXT_STATUS[item.status];
  const accessibilityLabel = nextStatus
    ? `Mark ${item.title} ${statusLabel(nextStatus).toLowerCase()}`
    : `Edit ${item.title}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={item.status === 'done' ? onOpen : onPress}
      style={({ pressed }) => [styles.stampCell, pressed && styles.pressed]}
    >
      <StopStamp status={item.status} country={country} />
    </Pressable>
  );
}

export default function PlanScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const dayStampWidth = Math.min(
    dayStampLayout.width,
    Math.max(
      dayStampLayout.minWidth,
      (Math.min(width, 680) - spacing.s7 * 2 - dayStampLayout.gap * (dayStampLayout.visibleDays - 1)) /
        dayStampLayout.visibleDays,
    ),
  );
  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);
  const itinerary = useItinerary(tripId);
  const setStatus = useSetItineraryStatus(tripId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [selectedDayChoice, setSelectedDayChoice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Keep the NOW line roughly current while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  const others = (members.data ?? [])
    .filter((m) => m.userId !== userId)
    .map((m) => m.profile.displayName);
  const wording = memberNamesWording(others);
  const range = formatTripRange(trip.data?.startDate ?? null, trip.data?.endDate ?? null);
  const subtitle = [wording, range].filter(Boolean).join(' · ');

  const openEditor = (item: ItineraryItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  if (itinerary.isPending || trip.isPending) return <LoadingState />;
  if (itinerary.isError) {
    return <ErrorState title="Couldn't load the itinerary" onRetry={() => itinerary.refetch()} />;
  }

  const nowIndex = selectedDay === todayKey ? nowRowIndex(rows, now) : null;

  return (
    <View style={styles.screen}>
      {/* flex:1 + minHeight:0 bounds this scroller to the pane on web, so the
          page no longer grows past the window and pushes the tab bar's bottom
          edge below it (N16). */}
      <ScrollView
        testID="plan-scroll-view"
        style={styles.scroller}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TitleRow
          title={trip.data?.name ?? ''}
          subtitle={subtitle}
          onAdd={() => openEditor(null)}
        />

        {next ? (
          <View style={styles.nextCardWrap}>
            <AirmailBorder padding={6}>
              <View style={styles.nextInner}>
                <View style={styles.nextTop}>
                  <AppText role="kickerLg">
                    NEXT · {countdownLabel(minutesUntil(next.startAt as string, now))}
                  </AppText>
                  <StampStill country={country} />
                </View>
                <AppText role="cardTitleLg" style={styles.nextTitle}>
                  {next.title}
                </AppText>
                <AppText role="body" tone="secondary" style={styles.nextLine}>
                  {[formattedTime(next), next.location ?? next.description].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            </AirmailBorder>
          </View>
        ) : null}

        {strip.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayStripScroll}
            contentContainerStyle={styles.dayStrip}
          >
            {strip.map((d) => (
              <DayStamp
                key={d.key}
                weekday={d.weekday}
                day={d.day}
                label={d.label}
                width={dayStampWidth}
                selected={selectedDay === d.key}
                onPress={() => setSelectedDayChoice(d.key)}
              />
            ))}
          </ScrollView>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            body="Start with the first thing you know is happening — even if it's just the flight."
            actionLabel="Add an item"
            onAction={() => openEditor(null)}
          />
        ) : (
          <View style={[styles.sheet, { backgroundColor: colors.paper }]}>
            <View style={[styles.marginRule, { backgroundColor: colors.marginRule }]} />
            {rows.length === 0 ? (
              <View style={styles.emptyDay}>
                <AppText tone="muted" role="bodySm">
                  Nothing planned for this day yet.
                </AppText>
              </View>
            ) : (
              rows.map((row, index) => {
                const nowBefore = nowIndex === index;
                if (row.type === 'free') {
                  return (
                    <View
                      key={row.key}
                      style={[
                        styles.timelineRow,
                        styles.freeTimelineRow,
                        { borderBottomColor: colors.hairline, borderBottomWidth: hairlineWidth },
                      ]}
                    >
                      {nowBefore ? <NowLine /> : null}
                      <View style={[styles.cellTime]} />
                      <View style={[styles.cellBody, styles.freeRow]}>
                        <AppText role="metaSm" tone="muted" style={styles.freeText}>
                          {freeTimeLabel(row.minutes)}
                        </AppText>
                      </View>
                      <View style={styles.cellStamp} />
                    </View>
                  );
                }
                const item = row.item;
                const done = item.status === 'done';
                const isNext = next?.id === item.id;
                return (
                  <View key={row.key} style={[styles.timelineRow, { borderBottomColor: colors.hairline, borderBottomWidth: hairlineWidth }]}>
                    {nowBefore ? <NowLine /> : null}
                    <View style={styles.cellTime}>
                      <AppText role="time" tone={done ? 'muted' : 'primary'} style={styles.timeText}>
                        {item.startAt ? formattedTime(item) : '—'}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.title}`}
                      onPress={() => openEditor(item)}
                      style={({ pressed }) => [styles.cellBody, pressed && styles.pressed]}
                    >
                      <AppText role="rowTitle" tone={done ? 'muted' : 'primary'}>
                        {item.title}
                      </AppText>
                      {item.location ?? item.description ? (
                        <AppText role="bodySm" tone={done ? 'muted' : 'secondary'} style={styles.itemSub}>
                          {item.location ?? item.description}
                        </AppText>
                      ) : null}
                      <View style={styles.tagRow}>
                        {isNext ? (
                          <View style={[styles.nextTag, { backgroundColor: colors.ink }]}>
                            <AppText role="tag" style={{ color: colors.paper }}>NEXT</AppText>
                          </View>
                        ) : null}
                        <AppText
                          role="tag"
                          style={{
                            color: done ? colors.ink3 : item.status === 'confirmed' ? colors.ink : colors.ink2,
                          }}
                        >
                          {statusLabel(item.status)}
                        </AppText>
                      </View>
                    </Pressable>
                    <View style={styles.cellStamp}>
                      <StopStampCell
                        item={item}
                        country={country}
                        onPress={() => {
                          const target = NEXT_STATUS[item.status];
                          if (target) setStatus.mutate({ itemId: item.id, status: target });
                        }}
                        onOpen={() => openEditor(item)}
                      />
                    </View>
                  </View>
                );
              })
            )}
            {nowIndex === rows.length && selectedDay === todayKey ? <NowLine trailing /> : null}
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

function NowLine({ trailing = false }: { trailing?: boolean }) {
  const { colors } = useTheme();
  const now = new Date();
  return (
    <View style={trailing ? styles.nowRowTrailing : styles.nowRow}>
      <View style={[styles.nowLine, { backgroundColor: colors.airmailBlue }]} />
      <View style={[styles.nowChip, { backgroundColor: colors.airmailBlue }]}>
        <AppText role="tag" style={{ color: colors.paper }}>
          NOW {formatTime(now.toISOString())}
        </AppText>
      </View>
    </View>
  );
}

function formattedTime(item: ItineraryItem): string {
  return item.startAt ? formatTime(item.startAt) : '';
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  scroller: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, gap: 0 },
  titleRow: {
    paddingTop: spacing.s6,
    paddingHorizontal: 20,
    paddingLeft: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s5,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  actionPill: {
    height: 44,
    paddingLeft: spacing.s5,
    paddingRight: spacing.s7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: { fontSize: 15, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  nextCardWrap: { marginTop: spacing.s6, marginHorizontal: spacing.cardGutter, boxShadow: shadows.card },
  nextInner: { paddingTop: 12, paddingBottom: 14, paddingLeft: 16, paddingRight: 14 },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextTitle: { marginTop: 4 },
  nextLine: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  dayStrip: { paddingTop: spacing.s7, paddingHorizontal: spacing.s7, gap: dayStampLayout.gap },
  // The Plan scroll content grows (item 14); without this the horizontal strip
  // would absorb half the free space, leaving a band above the sheet.
  dayStripScroll: { flexGrow: 0 },
  dayStampContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  sheet: {
    flexGrow: 1,
    marginTop: spacing.s7,
    marginHorizontal: spacing.cardGutter,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  marginRule: { position: 'absolute', left: 66, top: 0, bottom: 0, width: 1.5 },
  timelineRow: { flexDirection: 'row', minHeight: 50 },
  freeTimelineRow: { minHeight: 32 },
  cellTime: { width: 66, paddingTop: 14, paddingLeft: 12 },
  timeText: { fontSize: 15 },
  cellBody: { flex: 1, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 4 },
  cellStamp: { width: 44, marginTop: 6, alignItems: 'center' },
  stampCell: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  itemSub: { marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  nextTag: { paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3 },
  freeRow: { height: 32, justifyContent: 'center', paddingTop: 0, paddingBottom: 0 },
  freeText: { fontSize: 15, lineHeight: 20 },
  // Start at the body column (past the margin rule at x=66) so the rule
// doesn't cut through the sentence (item 8).
  emptyDay: { minHeight: 50, paddingVertical: 14, paddingLeft: 80, paddingRight: 20, justifyContent: 'center' },
  nowRow: { position: 'absolute', left: 0, right: 0, top: -15, height: 30, justifyContent: 'center' },
  nowRowTrailing: { height: 30, justifyContent: 'center' },
  nowLine: { position: 'absolute', left: 0, right: 0, top: 14, height: 2 },
  nowChip: { marginLeft: 10, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 3 },
});

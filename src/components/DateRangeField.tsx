import { useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppText } from './AppText';
import {
  MONTH_NAMES,
  WEEKDAY_HEADERS,
  buildCalendarMonth,
  dayAccessibilityLabel,
  dayRangeRole,
  nextWeekend,
  nightsFrom,
  parseYearMonth,
  rangeSummary,
  shiftMonth,
  stepRangeSelection,
  weekBand,
  type DateRange,
} from './dateRange';
import { DATE_BOX_GAP, DATE_BOX_HEIGHT, DATE_BOX_INSET, DATE_BOX_LABEL_TRACKING, dateValueType } from './dateBox';
import { useSheetReveal } from './Sheet';
import { formatDate, toDateOnly } from '@/lib/format/date';
import { tripDays } from '@/features/trips/destinations';
import { haptic } from '@/lib/haptics';
import { hairlineWidth, hitTargetMin, iconSizes, iconStrokeWidth, radius, shadows, spacing, typeScale, useTheme } from '@/theme';

interface DateRangeFieldProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (range: { startDate: string | null; endDate: string | null }) => void;
  error?: string;
}

/** Day rows are full touch targets; the day pills and range band sit inside them. */
const DAY_ROW = hitTargetMin;
const DAY_PILL = 36;
const DAY_INSET = (DAY_ROW - DAY_PILL) / 2;

type Preset = { label: string; nights: number | null };

const PRESETS: Preset[] = [
  { label: 'Wknd', nights: null },
  { label: '+5n', nights: 5 },
  { label: '+7n', nights: 7 },
];

/**
 * Airbnb-style unified date-range picker in the Waymark Airmail aesthetic.
 * Tapping the Leave → Return box expands an interactive monthly calendar where
 * the first tap sets Leave, the second tap sets Return, and the days between
 * are joined by a continuous band (see `stepRangeSelection` for every tap).
 */
export function DateRangeField({ startDate, endDate, onChange, error }: DateRangeFieldProps) {
  const { colors } = useTheme();
  const reveal = useSheetReveal();
  const calendarRef = useRef<View>(null);
  const todayIso = useMemo(() => toDateOnly(new Date()), []);
  const initialYm = useMemo(() => parseYearMonth(startDate, new Date()), [startDate]);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialYm.year);
  const [viewMonth, setViewMonth] = useState(initialYm.month);

  const weeks = useMemo(() => buildCalendarMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const hasAnyDate = Boolean(startDate || endDate);
  const awaitingEnd = Boolean(startDate && !endDate);
  const days = tripDays(startDate, endDate);

  const showMonthOf = (iso: string) => {
    const ym = parseYearMonth(iso, new Date());
    setViewYear(ym.year);
    setViewMonth(ym.month);
  };

  const toggleCalendar = () => {
    Keyboard.dismiss();
    haptic('selection');
    const next = !open;
    if (next && startDate) showMonthOf(startDate);
    if (!next) reveal(null);
    setOpen(next);
  };

  const handleDayPress = (iso: string) => {
    haptic('selection');
    const next = stepRangeSelection({ start: startDate, end: endDate }, iso);
    onChange({ startDate: next.start, endDate: next.end });
  };

  const goPrevMonth = () => {
    haptic('selection');
    const prev = shiftMonth(viewYear, viewMonth, -1);
    setViewYear(prev.year);
    setViewMonth(prev.month);
  };

  const goNextMonth = () => {
    haptic('selection');
    const next = shiftMonth(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const applyPreset = (preset: Preset) => {
    haptic('selection');
    const base = startDate ?? todayIso;
    const range: DateRange = preset.nights === null ? nextWeekend(base) : nightsFrom(base, preset.nights);
    onChange({ startDate: range.start, endDate: range.end });
    showMonthOf(range.start);
  };

  const presetLabel = (preset: Preset) =>
    preset.nights === null
      ? 'Next weekend, Friday to Sunday'
      : `${preset.nights} nights from ${startDate ? formatDate(startDate) : 'today'}`;

  const borderWidth = error || open ? 2 : 1.5;

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <AppText role="kicker">DATES</AppText>
        {hasAnyDate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear dates"
            onPress={() => {
              haptic('selection');
              onChange({ startDate: null, endDate: null });
            }}
            style={({ pressed }) => [styles.clearTarget, pressed && styles.pressed]}
          >
            <AppText role="link" tone="muted">
              Clear dates
            </AppText>
          </Pressable>
        ) : (
          <AppText role="kicker" tone="muted" style={styles.optional}>
            optional · tap to select range
          </AppText>
        )}
      </View>

      {/* Unified Leave → Return range card */}
      <Pressable
        testID="date-range-trigger"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Dates: ${startDate ? formatDate(startDate) : 'not set'} to ${endDate ? formatDate(endDate) : 'not set'}`}
        onPress={toggleCalendar}
        style={({ pressed }) => [
          styles.rangeBox,
          {
            backgroundColor: colors.paper,
            borderWidth,
            borderColor: error ? colors.danger : open || pressed ? colors.ink : colors.fieldBorder,
          },
        ]}
      >
        <View style={styles.half}>
          <View style={styles.halfHeader}>
            <AppText
              role="tag"
              style={[
                styles.boxLabel,
                { color: open && !awaitingEnd ? colors.airmailBlue : colors.ink2 },
              ]}
            >
              LEAVE
            </AppText>
          </View>
          <AppText
            numberOfLines={1}
            style={[dateValueType.lg, { color: startDate ? colors.ink : colors.ink3 }]}
          >
            {startDate ? formatDate(startDate) : 'Add date'}
          </AppText>
        </View>

        <View style={styles.dividerWrap}>
          <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
          <View style={[styles.arrowBadge, { backgroundColor: colors.bg }]}>
            <ArrowRight size={13} color={colors.ink2} strokeWidth={iconStrokeWidth} />
          </View>
          <View style={[styles.dividerLine, { backgroundColor: colors.hairline }]} />
        </View>

        <View style={styles.half}>
          <View style={styles.halfHeader}>
            <AppText
              role="tag"
              style={[
                styles.boxLabel,
                { color: open && awaitingEnd ? colors.airmailBlue : colors.ink2 },
              ]}
            >
              RETURN
            </AppText>
          </View>
          <AppText
            numberOfLines={1}
            style={[
              dateValueType.lg,
              {
                color: endDate
                  ? colors.ink
                  : open && awaitingEnd
                    ? colors.airmailBlue
                    : colors.ink3,
              },
            ]}
          >
            {endDate ? formatDate(endDate) : open && awaitingEnd ? 'Select return' : 'Add date'}
          </AppText>
        </View>
      </Pressable>

      {error ? (
        <AppText role="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      {/* Expandable Airbnb-style Range Calendar */}
      {open ? (
        <View
          ref={calendarRef}
          collapsable={false}
          testID="date-range-calendar"
          // Opening it (or a taller month) scrolls the whole calendar into view.
          onLayout={() => reveal(calendarRef.current)}
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.paper,
              borderColor: colors.ink,
              boxShadow: shadows.cardRaised,
            },
          ]}
        >
          {/* Prompt banner + quick length pills */}
          <View style={[styles.promptBar, { backgroundColor: colors.bg, borderBottomColor: colors.hairline }]}>
            <View style={styles.promptLeft}>
              <Calendar size={iconSizes.sm} color={colors.airmailBlue} strokeWidth={iconStrokeWidth} />
              <AppText role="tagSm" style={[styles.promptText, { color: colors.ink }]}>
                {!startDate ? 'TAP DEPARTURE DATE' : !endDate ? 'NOW TAP RETURN DATE' : rangeSummary(startDate, endDate)}
              </AppText>
            </View>
            <View style={styles.quickRow}>
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={presetLabel(preset)}
                  onPress={() => applyPreset(preset)}
                  style={({ pressed }) => [styles.quickTarget, pressed && styles.pressed]}
                >
                  <View style={[styles.quickChip, { backgroundColor: colors.paper, borderColor: colors.border }]}>
                    {/* One line with a point of trailing room: Android clips the last
                        letter-spaced glyph ("WKND" → "WKN") without it. */}
                    <AppText role="monoXs" numberOfLines={1} style={[styles.quickLabel, { color: colors.ink2 }]}>
                      {preset.label}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Month navigation header */}
          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={6}
              onPress={goPrevMonth}
              style={({ pressed }) => [styles.monthNavBtn, { backgroundColor: colors.bg }, pressed && styles.pressed]}
            >
              <ChevronLeft size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
            </Pressable>
            <AppText role="rowTitle" accessibilityRole="header">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={6}
              onPress={goNextMonth}
              style={({ pressed }) => [styles.monthNavBtn, { backgroundColor: colors.bg }, pressed && styles.pressed]}
            >
              <ChevronRight size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
            </Pressable>
          </View>

          {/* Weekday column headers */}
          <View style={styles.weekdayRow} importantForAccessibility="no-hide-descendants">
            {WEEKDAY_HEADERS.map((wd) => (
              <View key={wd} style={styles.weekdayCell}>
                {/* Stretched, one line: Android measures tracked mono a hair
                    short and would push the last letter onto a clipped line. */}
                <AppText role="monoXs" tone="muted" numberOfLines={1} style={styles.weekdayText}>
                  {wd}
                </AppText>
              </View>
            ))}
          </View>

          {/* Weeks grid: one band per week under the day pills */}
          <View style={styles.weeksGrid}>
            {weeks.map((week, wIdx) => {
              const band = weekBand(week, startDate, endDate);
              return (
                <View key={wIdx} style={styles.weekRow}>
                  {band ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.band,
                        {
                          left: `${(band.from / 7) * 100}%`,
                          width: `${((band.to - band.from) / 7) * 100}%`,
                          backgroundColor: colors.rangeFill,
                          borderColor: colors.rangeEdge,
                        },
                      ]}
                    />
                  ) : null}
                  {week.map((iso, dIdx) => {
                    if (!iso) {
                      return <View key={`empty-${wIdx}-${dIdx}`} style={styles.dayCell} />;
                    }
                    const dayNum = Number(iso.slice(8, 10));
                    const role = dayRangeRole(iso, startDate, endDate);
                    const isCap = role === 'single' || role === 'start' || role === 'end';
                    const isToday = iso === todayIso;
                    const numberColor = isCap
                      ? colors.paper
                      : isToday && role === 'none'
                        ? colors.airmailBlue
                        : colors.ink;

                    return (
                      <Pressable
                        key={iso}
                        accessibilityRole="button"
                        accessibilityLabel={dayAccessibilityLabel(iso, role, isToday)}
                        accessibilityState={{ selected: role !== 'none' }}
                        onPress={() => handleDayPress(iso)}
                        style={styles.dayCell}
                      >
                        <View
                          style={[
                            styles.dayPill,
                            isCap && { backgroundColor: colors.ink },
                            role === 'pending' && [styles.dayPillPending, { borderColor: colors.ink, backgroundColor: colors.paper }],
                          ]}
                        >
                          <AppText role="tagLabel" style={{ color: numberColor }}>
                            {dayNum}
                          </AppText>
                          {isToday ? (
                            <View
                              style={[styles.todayDot, { backgroundColor: isCap ? colors.paper : colors.airmailBlue }]}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* Calendar footer */}
          <View style={[styles.calendarFooter, { borderTopColor: colors.hairline }]}>
            <AppText role="metaSm" tone="secondary" style={styles.footerText}>
              {startDate && endDate
                ? `${days} ${days === 1 ? 'day' : 'days'} selected`
                : startDate
                  ? 'Tap the same day again for a 1-day trip'
                  : 'No dates selected yet'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done selecting dates"
              onPress={() => {
                haptic('selection');
                if (startDate && !endDate) {
                  onChange({ startDate, endDate: startDate });
                }
                reveal(null);
                setOpen(false);
              }}
              style={({ pressed }) => [styles.doneTarget, pressed && styles.pressed]}
            >
              <View style={[styles.donePill, { backgroundColor: colors.ink }]}>
                <AppText role="tagSm" style={{ color: colors.paper }}>
                  DONE
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quickLabel: { paddingRight: 1 },
  // The label row is a full 44 pt target for Clear dates. It reaches up into
  // the sheet's 14 pt field gap, so the label still sits just above the box.
  root: { marginTop: -spacing.s5 },
  labelRow: {
    minHeight: hitTargetMin,
    paddingBottom: spacing.s3,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  // Large text: the hint wraps on its own side instead of over DATES.
  optional: { textTransform: 'lowercase', flexShrink: 1, textAlign: 'right' },
  // Spans the row's full height; the link lines up with the DATES label.
  clearTarget: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    paddingLeft: spacing.s5,
    paddingBottom: spacing.s2,
    justifyContent: 'flex-end',
  },
  rangeBox: {
    height: DATE_BOX_HEIGHT,
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: DATE_BOX_INSET,
    justifyContent: 'center',
    gap: DATE_BOX_GAP,
  },
  halfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boxLabel: {
    letterSpacing: DATE_BOX_LABEL_TRACKING,
  },
  dividerWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    width: hairlineWidth,
  },
  arrowBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: spacing.s2,
  },
  calendarCard: {
    marginTop: spacing.s2,
    borderRadius: radius.input,
    borderWidth: 2,
    overflow: 'hidden',
  },
  promptBar: {
    minHeight: hitTargetMin,
    paddingLeft: spacing.s4,
    paddingRight: spacing.s1,
    borderBottomWidth: hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s2,
  },
  promptLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  promptText: { flexShrink: 1 },
  // The presets keep their width; the prompt beside them wraps instead.
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  // Each preset is a full 44 pt target around its small chip; the targets
  // touch but never overlap.
  quickTarget: {
    minWidth: hitTargetMin,
    minHeight: hitTargetMin,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChip: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  monthHeader: {
    paddingTop: spacing.s3,
    paddingBottom: spacing.s2,
    paddingHorizontal: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.codeBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: spacing.s1,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A point of room for the tracking after the last letter.
  weekdayText: {
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingRight: typeScale.monoXs.letterSpacing,
  },
  weeksGrid: {
    paddingBottom: spacing.s2,
  },
  weekRow: {
    flexDirection: 'row',
    height: DAY_ROW,
  },
  // Same height as the caps, so the band runs into them without a step.
  band: {
    position: 'absolute',
    top: DAY_INSET,
    height: DAY_PILL,
    borderTopWidth: hairlineWidth,
    borderBottomWidth: hairlineWidth,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    width: DAY_PILL,
    height: DAY_PILL,
    borderRadius: radius.codeBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillPending: {
    borderWidth: 2,
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarFooter: {
    minHeight: hitTargetMin,
    paddingLeft: spacing.s4,
    paddingRight: spacing.s3,
    borderTopWidth: hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s3,
  },
  footerText: { flex: 1 },
  doneTarget: {
    minHeight: hitTargetMin,
    minWidth: hitTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.codeBox,
  },
  pressed: { opacity: 0.7 },
});

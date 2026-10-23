import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { PerforatedStamp, STAMP_SHADOW_MARGIN } from '@/components/airmail/PerforatedStamp';
import { sampleTrack, useEntrance } from '@/components/motion';
import { dayStampRotation, dropIn } from '@/components/motion/keyframes';
import { SHELL } from '@/features/trips/shellLayout';
import { dayStampLayout, motion, spacing, useTheme } from '@/theme';

export interface StripDay {
  key: string;
  weekday: string;
  day: number | string;
  label: string;
  hasStops?: boolean;
}

/** Today's stamp sits this much higher than the rest. */
const TODAY_RAISE = SHELL.dayStripRaise;
/** The past-day postmark: a 24 pt ring and three cancel lines off the right edge. */
const PAST_RING = { size: 24, right: -7, top: 4, stroke: 1.25 } as const;
const PAST_LINES = { width: 22, right: -10, top: 30, pitch: 4, count: 3, stroke: 1.25 } as const;

function PastPostmark() {
  const { colors } = useTheme();
  return (
    <>
      <Svg
        width={PAST_RING.size}
        height={PAST_RING.size}
        style={[styles.overlay, { right: PAST_RING.right, top: PAST_RING.top }]}
        pointerEvents="none"
      >
        <Circle
          cx={PAST_RING.size / 2}
          cy={PAST_RING.size / 2}
          r={(PAST_RING.size - PAST_RING.stroke) / 2}
          fill="none"
          stroke={colors.dayPostmark}
          strokeWidth={PAST_RING.stroke}
        />
      </Svg>
      <Svg
        width={PAST_LINES.width}
        height={PAST_LINES.pitch * PAST_LINES.count}
        style={[styles.overlay, { right: PAST_LINES.right, top: PAST_LINES.top }]}
        pointerEvents="none"
      >
        {Array.from({ length: PAST_LINES.count }, (_, i) => (
          <Line
            key={i}
            x1={0}
            x2={PAST_LINES.width}
            y1={i * PAST_LINES.pitch + PAST_LINES.stroke / 2}
            y2={i * PAST_LINES.pitch + PAST_LINES.stroke / 2}
            stroke={colors.dayCancel}
            strokeWidth={PAST_LINES.stroke}
          />
        ))}
      </Svg>
    </>
  );
}

function DayStamp({
  day,
  index,
  selected,
  isToday,
  isPast,
  base,
  entering,
  onPress,
}: {
  day: StripDay;
  index: number;
  selected: boolean;
  isToday: boolean;
  isPast: boolean;
  base: number;
  entering: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const keys = dropIn(dayStampRotation(index));
  const p = useEntrance(
    motion.duration.drop,
    base + motion.choreo.plan.dayStamps + index * motion.stagger.dayStamp,
    entering,
  );
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.drop),
    transform: [
      { translateY: sampleTrack(keys.translateY, p.value, motion.easing.drop) },
      { rotate: `${sampleTrack(keys.rotate, p.value, motion.easing.drop)}deg` },
    ],
  }));

  const filled = selected;
  const weekdayColor = filled ? colors.paper : isPast ? colors.ink3 : isToday ? colors.airmailBlue : colors.ink2;
  const numberColor = filled ? colors.paper : isPast ? colors.ink3 : colors.ink;
  const dotColor = filled ? colors.paper : isToday ? colors.airmailBlue : isPast ? colors.ink3 : colors.ink;

  return (
    <Animated.View style={[isToday ? styles.raised : null, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={day.label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <PerforatedStamp
          width={dayStampLayout.width}
          height={dayStampLayout.height}
          size="sm"
          tone={filled ? 'ink' : 'paper'}
        >
          <View style={styles.content}>
            {/* Always three letters (SAT, SUN, MON): the word never shrinks or
                wraps (N26). */}
            <AppText
              role="monoXs"
              numberOfLines={1}
              maxFontSizeMultiplier={STAMP_TEXT_SCALE_MAX}
              style={[styles.weekday, { color: weekdayColor }]}
            >
              {day.weekday}
            </AppText>
            <AppText
              role="dayNumber"
              numberOfLines={1}
              maxFontSizeMultiplier={STAMP_TEXT_SCALE_MAX}
              style={{ color: numberColor }}
            >
              {day.day}
            </AppText>
            <View style={[styles.stopDot, { backgroundColor: dotColor, opacity: day.hasStops ? 1 : 0 }]} />
          </View>
        </PerforatedStamp>
        {isPast && !filled ? <PastPostmark /> : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Plan's day stamps (Airmail v4 · Shared): 48 × 56 stamps hanging over the
 * header's bottom edge, today raised 4 pt, past days postmarked. The row runs
 * off the right edge to hint that it scrolls. Each stamp drops in on the tab
 * entrance, 45 ms apart.
 */
/**
 * Day stamps are fixed 48×56 pieces of art; larger text no longer fits two
 * digits. The full date is in each stamp's accessibility label.
 */
const STAMP_TEXT_SCALE_MAX = 1.2;

export function DayStrip({
  days,
  selectedKey,
  todayKey,
  base,
  entering,
  onSelect,
}: {
  days: StripDay[];
  selectedKey: string | null;
  todayKey: string;
  base: number;
  entering: boolean;
  onSelect: (key: string) => void;
}) {
  const ref = useRef<ScrollView>(null);

  // When the tab opens on a day past the edge, scroll just far enough to show
  // that day's stamp with the strip's end padding after it.
  const onLayout = (visibleWidth: number) => {
    const index = days.findIndex((d) => d.key === selectedKey);
    if (index < 0) return;
    const pitch = dayStampLayout.width + dayStampLayout.gap;
    const stampRight = spacing.s7 + index * pitch + dayStampLayout.width;
    if (stampRight <= visibleWidth) return;
    ref.current?.scrollTo({ x: stampRight + spacing.s7 - visibleWidth, animated: false });
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => onLayout(event.nativeEvent.layout.width)}
      style={styles.scroll}
      contentContainerStyle={styles.strip}
    >
      {days.map((d, index) => (
        <DayStamp
          key={d.key}
          day={d}
          index={index}
          selected={selectedKey === d.key}
          isToday={d.key === todayKey}
          isPast={d.key !== 'ANY' && d.key < todayKey}
          base={base}
          entering={entering}
          onPress={() => onSelect(d.key)}
        />
      ))}
    </ScrollView>
  );
}

/** Height the strip occupies at the top of the Plan pane. */
export const DAY_STRIP_HEIGHT = SHELL.dayStripDropRoom + TODAY_RAISE + dayStampLayout.height + STAMP_SHADOW_MARGIN;

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, height: DAY_STRIP_HEIGHT },
  strip: {
    paddingTop: SHELL.dayStripDropRoom + TODAY_RAISE,
    paddingBottom: STAMP_SHADOW_MARGIN,
    paddingHorizontal: spacing.s7,
    gap: dayStampLayout.gap,
    alignItems: 'flex-start',
  },
  raised: { marginTop: -TODAY_RAISE },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  weekday: { flexShrink: 0 },
  stopDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  overlay: { position: 'absolute' },
  pressed: { opacity: 0.7 },
});

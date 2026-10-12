import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { easing, sampleTrack, useEntrance, useMotion } from '@/components/motion';
import {
  POSTMARK_RING_ROTATION,
  postmarkRingPress,
  sheetStampPrint,
  todayLift,
} from '@/components/motion/keyframes';
import { hapticAfter } from '@/lib/haptics';
import { motion, radius, shadows, useTheme } from '@/theme';
import { DESTINATION_ART } from './destinationArt';
import type { CountryKey } from './destinations';
import type { SheetDay } from './sheet';

/** Design geometry at a 64 × 72 cell (README 05, v3 4c). */
const CELL = { width: 64, height: 72 } as const;
const COLUMNS = 5;
const ART = { side: 6, top: 6, bottom: 17 } as const;
/** Absolute children are inset from the stamp's edge, not its padding. */
const LABEL_BLEED = 5;
const RING = { size: 50, left: 8, top: 12, rule: 28 } as const;
const LINES = { firstRowLeft: 60, left: 4, top: 20, count: 4, pitch: 8, half: 8, amp: 3, stroke: 1.6 } as const;
/** Used stamps' art is washed back to read as desaturated (80%). */
const USED_WASH = 0.2;

function wavePath(width: number): string {
  let d = `M0 ${LINES.amp + 1}`;
  for (let x = 0; x < width; x += LINES.half * 2) {
    d += x === 0
      ? ` Q${LINES.half / 2} 1 ${LINES.half} ${LINES.amp + 1}`
      : ` T${x} ${LINES.amp + 1}`;
  }
  return `${d} T${width} ${LINES.amp + 1}`;
}

function SheetStamp({
  day,
  index,
  width,
  height,
  country,
  initial,
  d0,
  t1,
  usedIndex,
}: {
  day: SheetDay;
  index: number;
  width: number;
  height: number;
  country: CountryKey | null;
  initial: string;
  d0: number;
  t1: number;
  /** Order among the used stamps (the cancel line passes them in turn). */
  usedIndex: number;
}) {
  const { colors } = useTheme();
  const k = width / CELL.width;
  const keys = sheetStampPrint(index);
  const print = useEntrance(motion.choreo.sheet.print, d0 + index * motion.stagger.sheetStamp);
  const lift = useEntrance(motion.duration.drop, t1 + motion.choreo.sheet.todayAfterRing, day.today);
  const wash = useEntrance(
    motion.choreo.sheet.used,
    t1 + motion.choreo.sheet.linesAfterRing + usedIndex * motion.choreo.sheet.usedStep,
    day.used,
  );
  const style = useAnimatedStyle(() => {
    const p = print.value;
    const l = day.today ? lift.value : 0;
    return {
      opacity: sampleTrack(keys.opacity, p, motion.easing.print),
      transform: [
        {
          translateY:
            sampleTrack(keys.translateY, p, motion.easing.print) +
            (day.today ? sampleTrack(todayLift.translateY, l, motion.easing.drop) : 0),
        },
        {
          rotate: `${
            sampleTrack(keys.rotate, p, motion.easing.print) +
            (day.today ? sampleTrack(todayLift.rotate, l, motion.easing.drop) : 0)
          }deg`,
        },
        {
          scale:
            sampleTrack(keys.scale, p, motion.easing.print) *
            (day.today ? sampleTrack(todayLift.scale, l, motion.easing.drop) : 1),
        },
      ],
    };
  });
  const washStyle = useAnimatedStyle(() => ({ opacity: day.used ? USED_WASH * wash.value : 0 }));
  const art = country ? DESTINATION_ART[country] : null;
  const artBox = { left: ART.side * k, right: ART.side * k, top: ART.top * k, bottom: ART.bottom * k };

  return (
    <Animated.View style={[{ width, height, zIndex: day.today ? 2 : 1 }, day.today ? { boxShadow: shadows.todayStamp } : null, style]}>
      <PerforatedStamp width={width} height={height} size="sm" shadow={!day.today}>
        <View style={[styles.art, artBox]}>
          {art ? (
            <Image source={art.sceneStampStill} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.initial, { backgroundColor: colors.stampInk }]}>
              <AppText role="pillLabel" style={{ color: colors.stampPaper }}>
                {initial}
              </AppText>
            </View>
          )}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.stampPaper }, washStyle]} />
        </View>
        <AppText
          role="stampLabel"
          numberOfLines={1}
          style={[styles.label, { bottom: ART.top * k, color: day.today ? colors.airmailBlue : colors.stampInk }]}
        >
          {day.label}
        </AppText>
      </PerforatedStamp>
    </Animated.View>
  );
}

interface SheetOfStampsProps {
  days: SheetDay[];
  country: CountryKey | null;
  initial: string;
  header: string;
  footer: string;
  /** "KYOTO" over "3–7 X 26" on the postmark ring; empty when nothing is used. */
  city: string;
  range: string;
}

/**
 * The Trip page's sheet of stamps (Airmail v4 · 05): one stamp per trip day,
 * printed in turn; the postmark ring presses over the used days, the cancel
 * lines roll across them and wash their art back, and today's stamp lifts.
 * Runs once per open, from d0 = 380 ms.
 */
export function SheetOfStamps({ days, country, initial, header, footer, city, range }: SheetOfStampsProps) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const [innerWidth, setInnerWidth] = useState(0);
  const s = motion.choreo.sheet;
  const d0 = s.d0;
  const t1 = d0 + s.ringAt;

  const width = innerWidth > 0 ? Math.min(CELL.width, innerWidth / COLUMNS) : CELL.width;
  const height = (width * CELL.height) / CELL.width;
  const k = width / CELL.width;
  const anyUsed = days.some((d) => d.used);

  const ring = useEntrance(s.ring, t1, anyUsed);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(postmarkRingPress.opacity, ring.value, motion.easing.standard),
    transform: [
      { rotate: `${POSTMARK_RING_ROTATION}deg` },
      { scale: sampleTrack(postmarkRingPress.scale, ring.value, motion.easing.standard) },
    ],
  }));
  useEffect(() => (anyUsed ? hapticAfter('medium', ms(t1 + s.ringContact)) : undefined), [anyUsed, ms, t1, s.ringContact]);

  // Cancel lines: one band per grid row that holds used stamps, revealed left
  // to right by a clip.
  const reveal = useSharedValue(anyUsed ? 0 : 1);
  useEffect(() => {
    if (!anyUsed) return;
    reveal.value = withDelay(ms(t1 + s.linesAfterRing), withTiming(1, { duration: ms(s.lines), easing: easing('roll') }));
  }, [anyUsed, reveal, ms, t1, s.linesAfterRing, s.lines]);

  const bands: { top: number; left: number; width: number }[] = [];
  const usedOrder = new Map<string, number>();
  days.forEach((d) => {
    if (d.used) usedOrder.set(d.key, usedOrder.size);
  });
  for (let row = 0; row * COLUMNS < days.length; row++) {
    const cells = days.slice(row * COLUMNS, row * COLUMNS + COLUMNS);
    const lastUsed = cells.map((d) => d.used).lastIndexOf(true);
    if (lastUsed < 0) continue;
    const left = (row === 0 ? LINES.firstRowLeft : LINES.left) * k;
    const right = (lastUsed + 1) * width - LINES.left * k;
    if (right > left) bands.push({ top: row * height + LINES.top * k, left, width: right - left });
  }

  return (
    <View
      style={[styles.sheet, { backgroundColor: colors.stampPaper, boxShadow: shadows.postcard }]}
      onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - 2 * styles.sheet.paddingHorizontal)}
    >
      <AppText role="microLabel" style={[styles.printed, styles.header, { color: colors.stampInk }]}>
        {header}
      </AppText>
      <View
        style={[
          styles.grid,
          { width: width * COLUMNS, backgroundColor: colors.bg },
        ]}
      >
        {days.map((day, i) => (
          <SheetStamp
            key={day.key}
            day={day}
            index={i}
            width={width}
            height={height}
            country={country}
            initial={initial}
            d0={d0}
            t1={t1}
            usedIndex={usedOrder.get(day.key) ?? 0}
          />
        ))}
        {anyUsed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                left: RING.left * k,
                top: RING.top * k,
                width: RING.size * k,
                height: RING.size * k,
                borderRadius: (RING.size * k) / 2,
                borderColor: colors.postmarkRing,
              },
              ringStyle,
            ]}
          >
            <AppText role="stampLabel" style={{ color: colors.postmarkText }}>
              {city}
            </AppText>
            <View style={[styles.ringRule, { width: RING.rule * k, backgroundColor: colors.cancelInk }]} />
            <AppText role="stampLabel" style={{ color: colors.postmarkText }}>
              {range}
            </AppText>
          </Animated.View>
        ) : null}
        {bands.map((band) => (
          <CancelBand key={band.top} band={band} reveal={reveal} color={colors.cancelInk} />
        ))}
      </View>
      <View style={styles.footer}>
        <AppText role="microLabel" style={[styles.printed, styles.footerText, { color: colors.stampInk }]}>
          No. 1
        </AppText>
        <AppText role="microLabel" style={[styles.printed, styles.footerText, { color: colors.stampInk }]}>
          {footer}
        </AppText>
      </View>
    </View>
  );
}

function CancelBand({
  band,
  reveal,
  color,
}: {
  band: { top: number; left: number; width: number };
  reveal: SharedValue<number>;
  color: string;
}) {
  const height = LINES.count * LINES.pitch;
  const clip = useAnimatedStyle(() => ({ width: band.width * reveal.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.band, { top: band.top, left: band.left, height }, clip]}>
      <Svg width={band.width} height={height}>
        {Array.from({ length: LINES.count }, (_, i) => (
          <Path
            key={i}
            d={wavePath(band.width)}
            transform={`translate(0 ${i * LINES.pitch})`}
            fill="none"
            stroke={color}
            strokeWidth={LINES.stroke}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderRadius: radius.airmailInner, paddingVertical: 12, paddingHorizontal: 21 },
  printed: { opacity: 0.7 },
  header: { textAlign: 'center' },
  grid: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
  art: { position: 'absolute', overflow: 'hidden' },
  initial: { alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', left: -LABEL_BLEED, right: -LABEL_BLEED, textAlign: 'center' },
  ring: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2, zIndex: 3 },
  ringRule: { height: 1 },
  band: { position: 'absolute', overflow: 'hidden', zIndex: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footerText: { letterSpacing: 1.2 },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { Fingerprint, Lock } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { WaxSealHalf } from '@/components/airmail/KraftEnvelope';
import { easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import {
  SEAL_PRESSED_SCALE,
  letterSettle,
  sealLeftFall,
  sealRightFall,
  waxDrop,
} from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { motion, radius, shadows, spacing, typeScale, useTheme } from '@/theme';
import { letterRules, SEALED_NOTE as GEO, sealedNoteGeometry } from './geometry';

const RING_LENGTH = 2 * Math.PI * GEO.ringR;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Phase = 'sealed' | 'holding' | 'opening' | 'open' | 'resealing';

interface SealedNoteProps {
  body: string;
  /** "OCT 8": the kicker on the letter and the date on the envelope. */
  dateLabel: string;
  initial: string;
  /** The author can edit by tapping the open letter. */
  onEdit?: () => void;
}

/** The flap as a downward triangle (outside) or its lining (inside). */
function FlapShape({ color }: { color: string }) {
  return (
    <Svg width="100%" height={GEO.flap} viewBox={`0 0 100 ${GEO.flap}`} preserveAspectRatio="none">
      <Path d={`M0 0 L100 0 L50 ${GEO.flap} Z`} fill={color} />
    </Svg>
  );
}

/**
 * One wax half: pressed under the thumb while intact, falling away after the
 * crack, dropping back on when re-sealed.
 */
function SealHalf({
  side,
  initial,
  mode,
  fall,
  wax,
  pressed,
}: {
  side: 'left' | 'right';
  initial: string;
  mode: SharedValue<number>;
  fall: SharedValue<number>;
  wax: SharedValue<number>;
  pressed: SharedValue<number>;
}) {
  const keys = side === 'left' ? sealLeftFall : sealRightFall;
  const style = useAnimatedStyle(() => {
    if (mode.value === 1) {
      const p = fall.value;
      const g = motion.easing.gravity;
      return {
        opacity: sampleTrack(keys.opacity, p, g),
        transform: [
          { translateX: sampleTrack(keys.translateX, p, g) },
          { translateY: sampleTrack(keys.translateY, p, g) },
          { rotate: `${sampleTrack(keys.rotate, p, g)}deg` },
          { scale: sampleTrack(keys.scale, p, g) },
        ],
      };
    }
    const dropping = mode.value === 2;
    return {
      opacity: dropping ? sampleTrack(waxDrop.opacity, wax.value, motion.easing.standard) : 1,
      transform: [
        { translateX: 0 },
        { translateY: 0 },
        { rotate: '0deg' },
        { scale: dropping ? sampleTrack(waxDrop.scale, wax.value, motion.easing.standard) : pressed.value },
      ],
    };
  });
  return (
    <Animated.View style={[styles.half, style]} pointerEvents="none">
      <WaxSealHalf side={side} initial={initial} size={GEO.disc} />
    </Animated.View>
  );
}

/**
 * A private note as a sealed kraft envelope (Airmail v4 · 06). Holding the wax
 * seal for 600 ms fills the ring and cracks it: the halves fall away, the flap
 * folds back behind the letter and the envelope slides down to reveal it.
 * Tapping the open envelope seals it again. The note's text isn't rendered at
 * all until the seal breaks, so it stays out of the accessibility tree and
 * screenshots; it re-seals instantly when Notes loses focus or the app goes to
 * the background. With reduced motion the hold still takes 600 ms (it is a
 * privacy gesture), then the note opens at once.
 */
export function SealedNote({ body, dateLabel, initial, onEdit }: SealedNoteProps) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const { fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [phase, setPhase] = useState<Phase>('sealed');
  const phaseRef = useRef<Phase>('sealed');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [measurement, setMeasurement] = useState<{
    fontScale: number;
    body: string;
    bodyTop?: number;
    textHeight?: number;
    offsets?: number[];
  }>({ fontScale, body });
  const measured = measurement.fontScale === fontScale && measurement.body === body ? measurement : undefined;
  const geo = sealedNoteGeometry({
    fontScale,
    lineHeight: typeScale.letter.lineHeight!,
    kickerLineHeight: typeScale.tagSm.lineHeight!,
    measuredBodyTop: measured?.bodyTop,
    measuredTextHeight: measured?.textHeight,
  });
  const openHeight = useRef(geo.open);

  const height = useSharedValue<number>(GEO.sealed);
  const flap = useSharedValue(0);
  const ring = useSharedValue(0);
  const ringOpacity = useSharedValue(1);
  const pressed = useSharedValue(1);
  /** 0 intact (pressable), 1 fallen away, 2 dropping back on. */
  const halves = useSharedValue(0);
  const left = useTimeline(0);
  const right = useTimeline(0);
  const letter = useTimeline(1);
  const wax = useTimeline(1);
  const holdStart = useRef(0);

  useEffect(() => {
    openHeight.current = geo.open;
    if (phaseRef.current === 'open') {
      height.set(withTiming(geo.open, { duration: ms(motion.duration.envelope), easing: easing('envelope') }));
    }
  }, [geo.open, height, ms]);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const later = useCallback((fn: () => void, delay: number) => {
    timers.current.push(setTimeout(fn, delay));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  /** Back to sealed at once, no motion (blur, background, unmount). */
  const sealNow = useCallback(() => {
    clearTimers();
    [height, flap, ring, ringOpacity, pressed, halves].forEach((v) => cancelAnimation(v));
    height.set(GEO.sealed);
    flap.set(0);
    ring.set(0);
    ringOpacity.set(1);
    pressed.set(1);
    halves.set(0);
    letter.set(1);
    wax.set(1);
    go('sealed');
  }, [clearTimers, height, flap, ring, ringOpacity, pressed, halves, letter, wax, go]);

  useEffect(() => {
    if (!isFocused && phaseRef.current !== 'sealed') sealNow();
  }, [isFocused, sealNow]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && phaseRef.current !== 'sealed') sealNow();
    });
    return () => sub.remove();
  }, [sealNow]);
  useEffect(() => clearTimers, [clearTimers]);

  const crack = useCallback(() => {
    const s = motion.choreo.seal;
    clearTimers();
    go('opening');
    haptic('rigid');
    ringOpacity.set(withTiming(0, { duration: ms(s.ringFade) }));
    halves.set(1);
    left.run(s.leftFall);
    right.run(s.rightFall);
    flap.set(withDelay(ms(s.flapAt), withTiming(180, { duration: ms(s.flap), easing: easing('flap') })));
    later(() => {
      height.set(withTiming(openHeight.current, { duration: ms(motion.duration.envelope), easing: easing('envelope') }));
      letter.run(s.letter);
      go('open');
    }, ms(s.openAt));
  }, [clearTimers, go, ringOpacity, halves, left, right, flap, later, height, letter, ms]);

  const onPressIn = () => {
    if (phaseRef.current !== 'sealed') return;
    go('holding');
    holdStart.current = Date.now();
    // The hold is a privacy gesture: its 600 ms never shrinks, even with
    // reduced motion.
    ring.set(withTiming(1, {
      duration: motion.duration.hold,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }));
    pressed.set(withTiming(SEAL_PRESSED_SCALE, { duration: ms(motion.choreo.seal.press) }));
    later(crack, motion.duration.hold);
  };

  const onPressOut = () => {
    if (phaseRef.current !== 'holding') return;
    clearTimers();
    const held = Math.min(motion.duration.hold, Date.now() - holdStart.current);
    // The ring drains back the way it came; nothing opens.
    ring.set(withTiming(0, { duration: held, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    pressed.set(withTiming(1, { duration: ms(motion.choreo.seal.press) }));
    go('sealed');
  };

  const reseal = () => {
    if (phaseRef.current !== 'open') return;
    const s = motion.choreo.seal;
    go('resealing');
    haptic('selection');
    height.set(withTiming(GEO.sealed, { duration: ms(motion.duration.envelope), easing: easing('envelope') }));
    flap.set(withDelay(ms(s.resealFlapAt), withTiming(0, { duration: ms(s.resealFlap), easing: easing('flap') })));
    later(() => {
      halves.set(2);
      ring.set(0);
      ringOpacity.set(1);
      wax.run(s.wax);
    }, ms(s.resealFlapAt + s.resealWaxAfterFlap));
    later(() => {
      haptic('light');
      halves.set(0);
      pressed.set(1);
      go('sealed');
    }, ms(s.resealFlapAt + s.resealWaxAfterFlap + s.waxContact));
  };

  const wrapperStyle = useAnimatedStyle(() => ({ height: height.value }));
  const bodyTopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height.value - GEO.body }] }));
  const sealBoxStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height.value - GEO.body }] }));
  // The flap keeps a pure perspective + rotateX transform and is placed by
  // layout (`top`): Android approximates perspective with a camera distance
  // decomposed from the whole matrix, so a translate in the same transform
  // stretched the opened flap far above the letter.
  const flapTransform = () => {
    'worklet';
    return [{ perspective: GEO.perspective }, { rotateX: `${flap.value}deg` }];
  };
  // Past 90° the flap passes behind the letter and shows its lining.
  const flapFrontStyle = useAnimatedStyle(() => ({
    top: height.value - GEO.body,
    opacity: flap.value < 90 ? 1 : 0,
    transform: flapTransform(),
  }));
  const flapBackStyle = useAnimatedStyle(() => ({
    top: height.value - GEO.body,
    opacity: flap.value >= 90 ? 1 : 0,
    transform: flapTransform(),
  }));
  const letterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sampleTrack(letterSettle.translateY, letter.p.value, motion.easing.drop) }],
  }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - ring.value) }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value }));


  const revealed = phase === 'opening' || phase === 'open' || phase === 'resealing';
  const isOpen = phase === 'open';
  const ink = colors.kraftInk;

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle]}>
      <Animated.View pointerEvents="none" style={[styles.flap, styles.flapBack, flapBackStyle]}>
        <FlapShape color={colors.kraftInside} />
      </Animated.View>

      {revealed ? (
        <View style={styles.letterClip} pointerEvents="box-none">
        <Animated.View
          style={[styles.letter, { height: geo.openLetterHeight, backgroundColor: colors.paper, boxShadow: shadows.letter }, letterStyle]}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <View
              key={i}
              style={[styles.rule, {
                top: measured?.offsets?.[i] !== undefined
                  ? (measured.bodyTop ?? geo.bodyTop) + measured.offsets[i]
                  : geo.ruleFirst + i * geo.rulePitch,
                backgroundColor: colors.letterRule,
              }]}
            />
          ))}
          <Pressable
            accessible={isOpen}
            accessibilityElementsHidden={!isOpen}
            importantForAccessibility={isOpen ? 'yes' : 'no-hide-descendants'}
            accessibilityRole={onEdit ? 'button' : 'text'}
            accessibilityLabel={`Private note, only you. ${dateLabel}. ${body}`}
            accessibilityHint={onEdit ? 'Tap to edit the private note' : undefined}
            accessibilityActions={isOpen && onEdit ? [{ name: 'edit', label: 'Edit private note' }] : undefined}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'edit' && isOpen) onEdit?.();
            }}
            onPress={isOpen ? onEdit : undefined}
            style={styles.letterPress}
          >
            <AppText role="tagSm" tone="secondary" style={styles.letterKicker}>
              ONLY YOU · {dateLabel}
            </AppText>
            <AppText
              role="letter"
              numberOfLines={GEO.writtenLines}
              style={styles.letterBody}
              onLayout={(event) => {
                const bodyTop = event.nativeEvent.layout.y;
                setMeasurement((previous) => {
                  const current = previous.fontScale === fontScale && previous.body === body;
                  if (current && previous.bodyTop === bodyTop) return previous;
                  return { ...(current ? previous : {}), fontScale, body, bodyTop };
                });
              }}
              onTextLayout={(event) => {
                const rules = letterRules(event.nativeEvent.lines);
                setMeasurement((previous) => {
                  const current = previous.fontScale === fontScale && previous.body === body;
                  if (current && previous.textHeight === rules.textHeight &&
                    previous.offsets?.length === rules.offsets.length &&
                    previous.offsets.every((offset, i) => offset === rules.offsets[i])) return previous;
                  return { ...(current ? previous : {}), fontScale, body, ...rules };
                });
              }}
            >
              {body}
            </AppText>
          </Pressable>
        </Animated.View>
        </View>
      ) : null}

      <Animated.View
        style={[styles.body, { backgroundColor: colors.kraft, boxShadow: shadows.kraft }, bodyTopStyle]}
      >
        <Pressable
          accessibilityRole="button"
          accessible={isOpen}
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? 'yes' : 'no-hide-descendants'}
          accessibilityLabel="Seal the note again"
          onPress={reseal}
          style={StyleSheet.absoluteFill}
        >
          <Svg
            width="100%"
            height={GEO.pocket}
            viewBox={`0 0 100 ${GEO.pocket}`}
            preserveAspectRatio="none"
            style={styles.pocket}
          >
            <Polygon points={`0,${GEO.pocket} 50,${GEO.pocket * 0.06} 100,${GEO.pocket}`} fill={colors.kraftPocket} />
          </Svg>
          <View style={styles.hintRow}>
            <Fingerprint size={13} color={ink} strokeWidth={2} />
            <AppText role="tagSm" style={[styles.hint, { color: ink }]}>
              {isOpen ? 'TAP TO SEAL AGAIN' : 'HOLD THE SEAL TO OPEN'}
            </AppText>
          </View>
          <View style={styles.labelRow}>
            <View style={styles.labelLeft}>
              <Lock size={13} color={ink} strokeWidth={2.4} />
              <AppText role="kickerSm" numberOfLines={1} style={[styles.labelText, { color: ink }]}>
                {revealed ? 'OPENED · ONLY YOU' : 'SEALED · ONLY YOU'}
              </AppText>
            </View>
            <AppText role="kickerSm" style={{ color: ink }}>
              {dateLabel}
            </AppText>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.flap, styles.flapFront, flapFrontStyle]}>
        <FlapShape color={colors.kraftFlap} />
      </Animated.View>

      <Animated.View
        style={[styles.sealBox, sealBoxStyle]}
        pointerEvents={phase === 'sealed' || phase === 'holding' ? 'auto' : 'none'}
        importantForAccessibility={revealed ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={revealed}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Private sealed note, only you. ${dateLabel}. Hold the seal to open.`}
          accessibilityHint="Hold for 600 milliseconds to open the private note"
          accessibilityActions={[{ name: 'activate', label: 'Open sealed note' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') onPressIn();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.sealPress}
        >
          <Animated.View style={[StyleSheet.absoluteFill, ringStyle]} pointerEvents="none">
            <Svg width={GEO.sealBox} height={GEO.sealBox}>
              <Circle
                cx={GEO.sealBox / 2}
                cy={GEO.sealBox / 2}
                r={GEO.ringR}
                fill="none"
                stroke={colors.kraftInk}
                strokeOpacity={0.35}
                strokeWidth={GEO.ringStroke}
              />
              <AnimatedCircle
                cx={GEO.sealBox / 2}
                cy={GEO.sealBox / 2}
                r={GEO.ringR}
                fill="none"
                stroke={colors.kraftInk}
                strokeWidth={GEO.ringStroke}
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                animatedProps={ringProps}
                transform={`rotate(-90 ${GEO.sealBox / 2} ${GEO.sealBox / 2})`}
              />
            </Svg>
          </Animated.View>
          <SealHalf side="left" initial={initial} mode={halves} fall={left.p} wax={wax.p} pressed={pressed} />
          <SealHalf side="right" initial={initial} mode={halves} fall={right.p} wax={wax.p} pressed={pressed} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { transform: [{ rotate: `${GEO.tilt}deg` }] },
  letterClip: { ...StyleSheet.absoluteFill, overflow: 'hidden', zIndex: 1 },
  letter: {
    position: 'absolute',
    left: GEO.letterInset,
    right: GEO.letterInset,
    top: GEO.letterTop,
    borderRadius: radius.airmailInner,
    overflow: 'hidden',
    zIndex: 1,
  },
  rule: { position: 'absolute', left: 0, right: 0, height: 1 },
  letterPress: { flex: 1, paddingVertical: GEO.letterPadding, paddingHorizontal: 14 },
  letterKicker: { letterSpacing: 0.8 },
  letterBody: { marginTop: GEO.bodyGap },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: GEO.body,
    borderRadius: radius.card,
    overflow: 'hidden',
    zIndex: 2,
  },
  pocket: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  hintRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hint: { letterSpacing: 1 },
  labelRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Large text: the label truncates before it can run into the date.
    gap: spacing.s3,
  },
  labelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  labelText: { flexShrink: 1 },
  flap: { position: 'absolute', left: 0, right: 0, top: 0, height: GEO.flap, transformOrigin: '50% 0%' },
  flapBack: { zIndex: 0 },
  flapFront: { zIndex: 3 },
  sealBox: {
    position: 'absolute',
    top: GEO.sealTop,
    left: '50%',
    width: GEO.sealBox,
    height: GEO.sealBox,
    marginLeft: -GEO.sealBox / 2,
    zIndex: 5,
  },
  sealPress: { flex: 1 },
  half: {
    position: 'absolute',
    left: (GEO.sealBox - GEO.disc) / 2,
    top: (GEO.sealBox - GEO.disc) / 2,
    width: GEO.disc,
    height: GEO.disc,
  },
});

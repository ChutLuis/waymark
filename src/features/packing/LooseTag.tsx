import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { clamp, easing, sampleTrack, useEntrance, useMotion } from '@/components/motion';
import {
  BAG_HANDLE_SLOP,
  TAG_LEAN_MAX,
  TAG_LEAN_PER_PT,
  TAG_LIFT_SCALE,
  tagToss,
} from '@/components/motion/keyframes';
import { motion, shadows, useTheme } from '@/theme';
import { bagAt, type BagRect } from './bags';

const GEO = { height: 38, point: 13, eyelet: 7, eyeletLeft: 10, padLeft: 13, padRight: 14 } as const;

export interface ClaimTarget {
  bagId: string;
  /** "your bag", "Theo's bag". */
  label: string;
}

interface LooseTagProps {
  id: string;
  label: string;
  index: number;
  tilt: number;
  base: number;
  entering: boolean;
  /** Bag rects in window coordinates, measured as a drag starts. */
  rects: SharedValue<BagRect[]>;
  targets: ClaimTarget[];
  onDragStart: (id: string) => void;
  onHover: (bagId: string | null) => void;
  /** Dropped on a bag (claim) or released elsewhere (null; it springs home). */
  onDrop: (id: string, bagId: string | null) => void;
  onEdit: () => void;
}

/**
 * A loose packing item as a paper tag (Airmail v4 · 08): notched at the left
 * with an eyelet. Drag it into a bag to claim it; it lifts and leans with the
 * finger, and springs home if dropped anywhere else.
 */
export function LooseTag({
  id,
  label,
  index,
  tilt,
  base,
  entering,
  rects,
  targets,
  onDragStart,
  onHover,
  onDrop,
  onEdit,
}: LooseTagProps) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const hover = useSharedValue<string | null>(null);
  const toss = tagToss(index);
  const tossIn = useEntrance(motion.choreo.packing.toss, base + motion.choreo.packing.tagsAt + index * motion.stagger.tag, entering);
  const springMs = ms(motion.duration.springHome);
  const liftMs = ms(motion.duration.fast);

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      lift.value = withTiming(1, { duration: liftMs });
      hover.value = null;
      runOnJS(onDragStart)(id);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      const over = bagAt(rects.value, e.absoluteX, e.absoluteY, BAG_HANDLE_SLOP);
      if (over !== hover.value) {
        hover.value = over;
        runOnJS(onHover)(over);
      }
    })
    .onFinalize(() => {
      const over = hover.value;
      hover.value = null;
      if (!over) {
        const config = { duration: springMs, easing: easing('springHome') };
        tx.value = withTiming(0, config);
        ty.value = withTiming(0, config);
        lift.value = withTiming(0, config);
      }
      runOnJS(onDrop)(id, over);
    });
  const tap = Gesture.Tap().onEnd(() => runOnJS(onEdit)());
  const gesture = Gesture.Exclusive(pan, tap);

  const style = useAnimatedStyle(() => {
    const p = tossIn.value;
    const lean = clamp(tx.value * TAG_LEAN_PER_PT, -TAG_LEAN_MAX, TAG_LEAN_MAX);
    return {
      zIndex: lift.value > 0 ? 40 : 0,
      opacity: sampleTrack(toss.opacity, p, motion.easing.toss),
      transform: [
        { translateX: tx.value + sampleTrack(toss.translateX, p, motion.easing.toss) },
        { translateY: ty.value + sampleTrack(toss.translateY, p, motion.easing.toss) },
        { rotate: `${tilt + lean + sampleTrack(toss.rotate, p, motion.easing.toss)}deg` },
        { scale: 1 + (TAG_LIFT_SCALE - 1) * lift.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}, loose tag`}
        accessibilityHint="Drag into a bag to claim it"
        accessibilityActions={[
          { name: 'activate', label: `Edit ${label}` },
          ...targets.map((t) => ({ name: `claim:${t.bagId}`, label: `Put in ${t.label}` })),
        ]}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === 'activate') onEdit();
          else if (name.startsWith('claim:')) onDrop(id, name.slice('claim:'.length));
        }}
        style={[styles.tag, style]}
      >
        <Svg width={GEO.point} height={GEO.height} style={styles.point}>
          <Path d={`M${GEO.point} 0 L0 ${GEO.height / 2} L${GEO.point} ${GEO.height} Z`} fill={colors.paper} />
        </Svg>
        <View style={[styles.body, { backgroundColor: colors.paper, boxShadow: shadows.tag }]}>
          <View style={[styles.eyelet, { backgroundColor: colors.bg, borderColor: colors.ruleWarm }]} />
          <AppText role="tagLabel" numberOfLines={1}>
            {label}
          </AppText>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tag: { flexDirection: 'row', height: GEO.height },
  point: { marginRight: -0.5 },
  body: {
    height: GEO.height,
    justifyContent: 'center',
    paddingLeft: GEO.padLeft,
    paddingRight: GEO.padRight,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  eyelet: {
    position: 'absolute',
    left: GEO.eyeletLeft - GEO.point,
    top: (GEO.height - GEO.eyelet) / 2,
    width: GEO.eyelet,
    height: GEO.eyelet,
    borderRadius: GEO.eyelet / 2,
    borderWidth: 1,
  },
});

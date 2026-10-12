import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { sampleTrack, useTimeline } from '@/components/motion';
import { postcardFlip, postcardFlipShadow } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import type { CountryKey } from '@/features/trips/destinations';
import { iconStrokeWidth, motion, radius, shadows, useTheme } from '@/theme';

const GEO = { height: 118, perspective: 900, border: 5, stamp: { width: 32, height: 40 }, side: 78 } as const;

interface PostcardNoteProps {
  body: string;
  /** "SHARED · 4 DAYS AGO". */
  kicker: string;
  /** "You" or the sender's first name. */
  from: string;
  country: CountryKey | null;
  tripName: string;
  /** Pile tilt in degrees. */
  tilt: number;
  /** The author can edit (long press, or the screen reader's activate). */
  onEdit?: () => void;
}

/**
 * A shared note as a postcard (Airmail v4 · 07): the message side faces up;
 * tapping flips it to the trip scene's still and back, 480 ms with a lift and
 * a slight turn at the halfway point, while its shadow stretches and fades.
 */
export function PostcardNote({ body, kicker, from, country, tripName, tilt, onEdit }: PostcardNoteProps) {
  const { colors } = useTheme();
  const flip = useTimeline(1);
  const base = useSharedValue(0);
  const side = useRef(0);

  const turn = () => {
    haptic('selection');
    base.value = side.current * 180;
    side.current = (side.current + 1) % 2;
    flip.run(motion.duration.flip);
  };

  const angle = () => {
    'worklet';
    return base.value + sampleTrack(postcardFlip.rotateY, flip.p.value, motion.easing.flip);
  };
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: GEO.perspective },
      { rotateY: `${angle()}deg` },
      { rotateZ: `${sampleTrack(postcardFlip.rotateZ, flip.p.value, motion.easing.flip)}deg` },
      { scale: sampleTrack(postcardFlip.scale, flip.p.value, motion.easing.flip) },
    ],
  }));
  // Faces also swap by angle, so the hidden one never shows through where
  // backface culling is unreliable.
  const messageStyle = useAnimatedStyle(() => {
    const a = ((angle() % 360) + 360) % 360;
    return { opacity: a < 90 || a > 270 ? 1 : 0 };
  });
  const sceneStyle = useAnimatedStyle(() => {
    const a = ((angle() % 360) + 360) % 360;
    return { opacity: a >= 90 && a <= 270 ? 1 : 0 };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(postcardFlipShadow.opacity, flip.p.value, motion.easing.flip),
    transform: [{ scaleX: sampleTrack(postcardFlipShadow.scaleX, flip.p.value, motion.easing.flip) }],
  }));

  const art = country ? DESTINATION_ART[country] : null;

  return (
    <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <Animated.View pointerEvents="none" style={[styles.shadow, { boxShadow: shadows.pileShadow }, shadowStyle]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit shared note"
        accessibilityHint="Flips the postcard"
        accessibilityActions={[{ name: 'activate', label: 'Edit shared note' }, { name: 'flip', label: 'Flip postcard' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'flip') turn();
          else onEdit?.();
        }}
        onPress={turn}
        onLongPress={onEdit}
        style={styles.press}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <Animated.View
            style={[styles.face, styles.message, { backgroundColor: colors.stampPaper, boxShadow: shadows.postcardFlat }, messageStyle]}
          >
            <View style={styles.messageCol}>
              <View style={styles.kickerRow}>
                <Users size={14} color={colors.ink2} strokeWidth={iconStrokeWidth} />
                <AppText role="kickerSm" style={{ color: colors.ink2 }}>
                  {kicker}
                </AppText>
              </View>
              <AppText role="letter" numberOfLines={3} style={{ color: colors.stampInk }}>
                {body}
              </AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.rule }]} />
            <View style={styles.side}>
              {art ? (
                <PerforatedStamp width={GEO.stamp.width} height={GEO.stamp.height} size="xs">
                  <Image source={art.sceneStampStill} style={styles.stampArt} contentFit="cover" />
                </PerforatedStamp>
              ) : (
                <View />
              )}
              <View style={[styles.fromBlock, { borderBottomColor: colors.rule }]}>
                <AppText role="monoXs" style={{ color: colors.ink2, letterSpacing: 0.8 }}>
                  FROM
                </AppText>
                <AppText role="signature" numberOfLines={1} style={{ color: colors.stampInk }}>
                  {from}
                </AppText>
              </View>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.face,
              styles.scene,
              { backgroundColor: colors.stampPaper, boxShadow: shadows.postcardFlat },
              sceneStyle,
            ]}
          >
            <View style={[styles.sceneWindow, { backgroundColor: colors.artPlaceholder }]}>
              {art ? <Image source={art.sceneStill} style={styles.fill} contentFit="cover" contentPosition="center" /> : null}
              <View style={[styles.caption, { backgroundColor: colors.paper, boxShadow: shadows.chip }]}>
                <AppText role="caption" numberOfLines={1}>
                  {tripName}
                </AppText>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    bottom: -6,
    height: 20,
    borderRadius: 999,
  },
  press: { height: GEO.height },
  card: { flex: 1 },
  face: { ...StyleSheet.absoluteFill, borderRadius: radius.tag, backfaceVisibility: 'hidden' },
  message: { flexDirection: 'row', gap: 12, paddingTop: 14, paddingRight: 14, paddingBottom: 14, paddingLeft: 16 },
  messageCol: { flex: 1, minWidth: 0, gap: 8 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { width: 1 },
  side: { width: GEO.side, justifyContent: 'space-between', alignItems: 'flex-end' },
  fromBlock: { alignSelf: 'stretch', borderBottomWidth: 1, paddingBottom: 3 },
  scene: { padding: GEO.border, transform: [{ rotateY: '180deg' }] },
  sceneWindow: { flex: 1, borderRadius: 1, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  // Absolute children are inset from the stamp's edge (README: inset 5).
  stampArt: { position: 'absolute', left: 5, top: 5, right: 5, bottom: 5 },
  caption: { position: 'absolute', left: 8, bottom: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.chip },
});

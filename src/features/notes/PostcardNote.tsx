import { useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { DefaultAirmailScene, DefaultAirmailStampArt } from '@/components/airmail/DefaultAirmailArt';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { sampleTrack, useTimeline } from '@/components/motion';
import { postcardFlip, postcardFlipShadow } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import type { CountryKey } from '@/features/trips/destinations';
import { hitTargetMin, iconStrokeWidth, motion, radius, shadows, spacing, typeScale, useTheme } from '@/theme';
import { postcardNoteGeometry } from './geometry';

const GEO = { height: 118, perspective: 900, border: 5, stamp: { width: 32, height: 40 }, side: 78 } as const;

interface PostcardNoteProps {
  body: string;
  /** "SHARED · 4 DAYS AGO". */
  kicker: string;
  /** "You" or the sender's first name. */
  from: string;
  dateLabel: string;
  country: CountryKey | null;
  tripName: string;
  /** Pile tilt in degrees. */
  tilt: number;
  /** All trip members can read the full message without flipping. */
  onRead: () => void;
  /** Only the author can edit (long press or the accessibility edit action). */
  onEdit?: () => void;
}

/**
 * A shared note as a postcard (Airmail v4 · 07): the message side faces up;
 * tapping flips it to the trip scene's still and back, 480 ms with a lift and
 * a slight turn at the halfway point, while its shadow stretches and fades.
 */
export function PostcardNote({ body, kicker, from, dateLabel, country, tripName, tilt, onRead, onEdit }: PostcardNoteProps) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const geo = postcardNoteGeometry(fontScale, typeScale.letter.lineHeight!, typeScale.kickerSm.lineHeight!);
  const flip = useTimeline(1);
  // The flip track runs 0 → 180° relative to `base`; resting at the track's
  // end, the message side (0°) needs a base of −180°.
  const base = useSharedValue(-180);
  const side = useRef(0);

  const turn = () => {
    haptic('selection');
    base.value = side.current * 180;
    side.current = (side.current + 1) % 2;
    flip.run(motion.duration.flip);
  };

  // Each style reads `base` and the flip itself: Reanimated only re-runs a
  // style for the shared values it reads directly.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: GEO.perspective },
      { rotateY: `${base.value + sampleTrack(postcardFlip.rotateY, flip.p.value, motion.easing.flip)}deg` },
      { rotateZ: `${sampleTrack(postcardFlip.rotateZ, flip.p.value, motion.easing.flip)}deg` },
      { scale: sampleTrack(postcardFlip.scale, flip.p.value, motion.easing.flip) },
    ],
  }));
  // Faces swap by angle rather than backface culling, which Android applies
  // unreliably to a face that is itself turned inside a turning card.
  const messageStyle = useAnimatedStyle(() => {
    const angle = base.value + sampleTrack(postcardFlip.rotateY, flip.p.value, motion.easing.flip);
    const a = ((angle % 360) + 360) % 360;
    return { opacity: a < 90 || a > 270 ? 1 : 0 };
  });
  const sceneStyle = useAnimatedStyle(() => {
    const angle = base.value + sampleTrack(postcardFlip.rotateY, flip.p.value, motion.easing.flip);
    const a = ((angle % 360) + 360) % 360;
    return { opacity: a >= 90 && a <= 270 ? 1 : 0 };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(postcardFlipShadow.opacity, flip.p.value, motion.easing.flip),
    transform: [{ scaleX: sampleTrack(postcardFlipShadow.scaleX, flip.p.value, motion.easing.flip) }],
  }));

  const art = country ? DESTINATION_ART[country] : null;
  const cardSurface = colors.paper;

  return (
    <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Shared note from ${from}. ${dateLabel}. ${body}`}
        accessibilityHint="Tap to flip the postcard. Use Read to open the full message."
        accessibilityActions={[
          { name: 'activate', label: 'Flip postcard' },
          { name: 'read', label: 'Read full note' },
          ...(onEdit ? [{ name: 'edit', label: 'Edit shared note' }] : []),
        ]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'activate' || action === 'flip') turn();
          else if (action === 'read') onRead();
          else if (action === 'edit') onEdit?.();
        }}
        onPress={turn}
        onLongPress={onEdit}
        style={styles.press}
      >
        <Animated.View pointerEvents="none" style={[styles.shadow, { boxShadow: shadows.postcard }, shadowStyle]} />
        <Animated.View style={[styles.card, { minHeight: geo.minHeight }, cardStyle]}>
          <Animated.View
            style={[
              styles.face,
              styles.message,
              { minHeight: geo.minHeight, backgroundColor: cardSurface, borderColor: colors.rule, boxShadow: shadows.postcardFlat },
              messageStyle,
            ]}
          >
            <View style={styles.messageCol}>
              <View style={styles.kickerRow}>
                <Users size={14} color={colors.ink2} strokeWidth={iconStrokeWidth} />
                <AppText role="kickerSm" style={[styles.kicker, { color: colors.ink2 }]}>
                  {kicker}
                </AppText>
              </View>
              <AppText role="letter" numberOfLines={3} style={{ color: colors.ink }}>
                {body}
              </AppText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.rule }]} />
            <View style={styles.side}>
              <PerforatedStamp width={GEO.stamp.width} height={GEO.stamp.height} size="xs">
                {art ? (
                  <Image source={art.sceneStampStill} style={styles.stampArt} contentFit="cover" />
                ) : (
                  <View style={styles.stampArt}>
                    <DefaultAirmailStampArt label={(tripName.trim()[0] ?? 'W').toUpperCase()} compact />
                  </View>
                )}
              </PerforatedStamp>
              <View style={[styles.fromBlock, { borderBottomColor: colors.rule }]}>
                <AppText role="monoXs" style={{ color: colors.ink2, letterSpacing: 0.8 }}>
                  FROM
                </AppText>
                <AppText role="signature" numberOfLines={1} style={{ color: colors.ink }}>
                  {from}
                </AppText>
              </View>
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.face,
              styles.scene,
              { backgroundColor: colors.stampPaper, borderColor: colors.rule, boxShadow: shadows.postcardFlat },
              sceneStyle,
            ]}
          >
            <View style={[styles.sceneWindow, { backgroundColor: colors.artPlaceholder }]}>
              {art ? (
                <Image source={art.sceneStill} style={styles.fill} contentFit="cover" contentPosition="center" />
              ) : (
                <DefaultAirmailScene />
              )}
              <View style={[styles.caption, { backgroundColor: colors.paper, boxShadow: shadows.chip }]}>
                <AppText role="caption" numberOfLines={1}>
                  {tripName}
                </AppText>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read full shared note from ${from}`}
        onPress={onRead}
        style={({ pressed }) => [styles.readButton, pressed && styles.pressed]}
      >
        <AppText role="button" tone="secondary">Read</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.tag,
  },
  press: { minHeight: GEO.height },
  card: { minHeight: GEO.height },
  face: { borderRadius: radius.tag, borderWidth: 1 },
  message: { flexDirection: 'row', gap: 12, paddingTop: 14, paddingRight: 14, paddingBottom: 14, paddingLeft: 16 },
  messageCol: { flex: 1, minWidth: 0, gap: 8 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { flexShrink: 1 },
  divider: { width: 1 },
  side: { width: GEO.side, justifyContent: 'space-between', alignItems: 'flex-end' },
  fromBlock: { alignSelf: 'stretch', borderBottomWidth: 1, paddingBottom: 3 },
  scene: { ...StyleSheet.absoluteFill, padding: GEO.border, transform: [{ rotateY: '180deg' }] },
  sceneWindow: { flex: 1, borderRadius: 1, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  // Absolute children are inset from the stamp's edge (README: inset 5).
  stampArt: { position: 'absolute', left: 5, top: 5, right: 5, bottom: 5 },
  caption: { position: 'absolute', left: 8, bottom: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.chip },
  readButton: { minHeight: hitTargetMin, minWidth: hitTargetMin, paddingHorizontal: spacing.s3, alignSelf: 'flex-end', justifyContent: 'center', alignItems: 'center' },
  pressed: { opacity: 0.7 },
});

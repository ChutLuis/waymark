import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { useClockPhase } from '@/components/motion';
import { SCENE_EPOCH, scenePhaseAt } from '@/features/trips/sceneClock';
import { motion, useTheme } from '@/theme';

interface DefaultAirmailSceneProps {
  /** Animate the vintage airmail plane's gentle flight bob. */
  live?: boolean;
}

/**
 * Default Airmail panorama (800 × 500 design canvas) for destinations that do
 * not yet have a dedicated country Lottie scene. Styled in the same screenprint
 * editorial register as the ten destination scenes: warm parchment sky,
 * philatelic meridian arcs, compass rose watermark, layered coastal headlands,
 * waymark lighthouse beacon, and an airmail biplane along a dashed flight arc.
 */
export function DefaultAirmailScene({ live = false }: DefaultAirmailSceneProps) {
  const phaseAt = useCallback((now: number) => {
    'worklet';
    return scenePhaseAt(now, motion.choreo.home.bob, SCENE_EPOCH);
  }, []);
  const bob = useClockPhase(live, phaseAt);
  const planeStyle = useAnimatedStyle(() => {
    const phase = bob.value * 2 * Math.PI;
    return {
      transform: [
        { translateY: -4 * Math.cos(phase) },
        { rotate: `${1.5 * Math.sin(phase)}deg` },
      ],
    };
  });

  return (
    <View style={styles.canvas} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="airmail-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#DCE6EE" />
            <Stop offset="52%" stopColor="#F4EFE2" />
            <Stop offset="100%" stopColor="#E9DEC8" />
          </LinearGradient>
          <LinearGradient id="airmail-beam" x1="0" y1="0.5" x2="1" y2="0">
            <Stop offset="0%" stopColor="#FFFCF5" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#FFFCF5" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Warm screenprint sky */}
        <Rect x="0" y="0" width="800" height="500" fill="url(#airmail-sky)" />

        {/* Philatelic globe meridian & latitude arcs */}
        <G stroke="#24479A" strokeOpacity={0.12} strokeWidth={1.2} fill="none">
          <Circle cx="400" cy="250" r="210" />
          <Circle cx="400" cy="250" r="155" strokeDasharray="5 5" />
          <Path d="M 190 250 Q 400 180 610 250" />
          <Path d="M 215 170 Q 400 115 585 170" />
          <Path d="M 400 40 Q 330 250 400 460" />
          <Path d="M 400 40 Q 470 250 400 460" />
          <Line x1="160" y1="250" x2="640" y2="250" strokeDasharray="3 5" />
          <Line x1="400" y1="25" x2="400" y2="475" strokeDasharray="3 5" />
        </G>

        {/* Vintage compass rose watermark (upper left sky) */}
        <G transform="translate(155, 132)" opacity={0.22}>
          <Circle cx="0" cy="0" r="34" stroke="#24479A" strokeWidth="1.2" fill="none" />
          <Circle cx="0" cy="0" r="26" stroke="#24479A" strokeWidth="0.8" strokeDasharray="2 3" fill="none" />
          <Polygon points="0,-42 5,-8 0,0 -5,-8" fill="#C8323C" />
          <Polygon points="0,42 5,8 0,0 -5,8" fill="#24479A" />
          <Polygon points="-42,0 -8,-5 0,0 -8,5" fill="#24479A" />
          <Polygon points="42,0 8,-5 0,0 8,5" fill="#24479A" />
          <Circle cx="0" cy="0" r="3.5" fill="#15223B" />
        </G>

        {/* Warm sun disc behind the distant peaks */}
        <Circle cx="535" cy="182" r="56" fill="#F9E5B8" opacity={0.85} />
        <Circle cx="535" cy="182" r="64" stroke="#C8323C" strokeOpacity={0.18} strokeWidth="1" strokeDasharray="4 4" fill="none" />

        {/* Soft layered clouds */}
        <G fill="#FFFCF5" opacity={0.82}>
          <Path d="M 70 198 Q 92 182 118 192 Q 138 176 164 188 Q 184 184 196 198 Z" />
          <Path d="M 590 138 Q 612 122 638 130 Q 660 116 686 128 Q 706 124 718 138 Z" />
        </G>

        {/* Distant slate mountain range */}
        <Path
          d="M 0 318 L 88 262 L 165 292 L 268 228 L 362 278 L 458 218 L 566 272 L 664 234 L 748 268 L 800 250 L 800 360 L 0 360 Z"
          fill="#8B9DAF"
          opacity={0.55}
        />

        {/* Midground indigo ridges */}
        <Path
          d="M 0 336 L 64 294 L 154 318 L 244 268 L 348 310 L 430 274 L 520 312 L 628 264 L 722 302 L 800 284 L 800 380 L 0 380 Z"
          fill="#46536B"
        />

        {/* Lighthouse beam sweeping across the bay */}
        <Polygon points="234,218 560,136 560,256" fill="url(#airmail-beam)" />

        {/* Waymark coastal headland & lighthouse */}
        <G>
          {/* Warm kraft/ochre cliff */}
          <Path
            d="M 140 360 L 188 296 L 266 292 L 328 360 Z"
            fill="#CDB28A"
          />
          <Path
            d="M 188 296 L 232 294 L 264 360 L 140 360 Z"
            fill="#BFA06E"
          />
          {/* Lighthouse tower */}
          <Polygon points="224,296 244,296 240,226 228,226" fill="#FFFCF5" stroke="#15223B" strokeWidth="1.5" />
          {/* Red airmail stripes on tower */}
          <Polygon points="226.5,274 241.5,274 240.8,260 227.2,260" fill="#C8323C" />
          <Polygon points="227.6,246 240.4,246 239.9,234 228.1,234" fill="#C8323C" />
          {/* Lantern room & dome */}
          <Rect x="225" y="216" width="18" height="10" fill="#F9E5B8" stroke="#15223B" strokeWidth="1.5" />
          <Path d="M 223 216 Q 234 204 245 216 Z" fill="#15223B" />
          <Line x1="234" y1="202" x2="234" y2="210" stroke="#15223B" strokeWidth="1.8" />
        </G>

        {/* Deep navy sea & screenprinted wave lines */}
        <Rect x="0" y="346" width="800" height="154" fill="#1E3256" />
        <Path
          d="M 0 378 Q 100 368 200 378 T 400 378 T 600 378 T 800 378 L 800 500 L 0 500 Z"
          fill="#15223B"
        />
        <G stroke="#FFFCF5" strokeOpacity={0.38} strokeWidth={1.6} fill="none">
          <Path d="M 40 362 q 16 -4 32 0 t 32 0 32 0" />
          <Path d="M 480 364 q 16 -4 32 0 t 32 0 32 0" />
          <Path d="M 260 392 q 18 -4 36 0 t 36 0 36 0" />
          <Path d="M 560 404 q 16 -4 32 0 t 32 0" />
        </G>

        {/* Dashed crimson flight trajectory across the sky */}
        <Path
          d="M 90 254 Q 260 150 426 154"
          fill="none"
          stroke="#C8323C"
          strokeWidth="2.2"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
        {/* Departure & waypoint rings */}
        <Circle cx="90" cy="254" r="4.5" fill="#FFFCF5" stroke="#C8323C" strokeWidth="2.2" />
        <Circle cx="256" cy="186" r="3.5" fill="#FFFCF5" stroke="#24479A" strokeWidth="2" />
      </Svg>

      {/* Animated vintage airmail plane centered in both card & hero crops */}
      <Animated.View style={[styles.planeLayer, planeStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
          <G transform="translate(454, 150) rotate(-6)">
            {/* Shadow under wing */}
            <Polygon points="-34,6 32,0 -8,14" fill="#15223B" opacity={0.22} />
            {/* Fuselage */}
            <Path
              d="M -38 2 L 26 -4 C 34 -4 38 0 34 5 L -34 10 Z"
              fill="#24479A"
              stroke="#15223B"
              strokeWidth="1.5"
            />
            {/* Tail fin with airmail red-white-blue stripes */}
            <Polygon points="-38,2 -48,-15 -30,-12 -26,2" fill="#C8323C" stroke="#15223B" strokeWidth="1.4" />
            <Polygon points="-35,2 -41,-13 -35,-12 -30,2" fill="#FFFCF5" />
            {/* Upper & lower cream wings */}
            <Polygon points="-12,-14 22,-16 14,-4 -18,-3" fill="#FFFCF5" stroke="#15223B" strokeWidth="1.4" />
            <Polygon points="-16,7 16,5 10,13 -20,14" fill="#FFFCF5" stroke="#15223B" strokeWidth="1.4" />
            {/* Wing struts */}
            <Line x1="-6" y1="-4" x2="-8" y2="7" stroke="#15223B" strokeWidth="1.4" />
            <Line x1="10" y1="-5" x2="8" y2="6" stroke="#15223B" strokeWidth="1.4" />
            {/* Red nose cowling & propeller disc */}
            <Path d="M 26 -4 L 35 -2 L 34 5 L 25 6 Z" fill="#C8323C" stroke="#15223B" strokeWidth="1.2" />
            <Line x1="38" y1="-12" x2="38" y2="12" stroke="#15223B" strokeWidth="1.8" strokeLinecap="round" opacity={0.7} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

interface DefaultAirmailStampArtProps {
  /** 1-3 character initial or ISO country code displayed in the emblem. */
  label?: string;
  /** Optional subtitle printed in the bottom strip of the art window. */
  subtitle?: string | null;
  /** Compact mode for mini/xs stamps (32x40, 40x48). */
  compact?: boolean;
}

/**
 * Engraved philatelic stamp art for any country without a dedicated scene
 * illustration. Features a deep-navy & airmail-blue sky, inner ruled frame,
 * compass meridian arcs, a crimson-and-cream airmail wing emblem, and the
 * destination's initial or ISO code.
 */
export function DefaultAirmailStampArt({
  label = 'W',
  subtitle = null,
  compact = false,
}: DefaultAirmailStampArtProps) {
  const { colors } = useTheme();
  const displayLabel = label.trim().slice(0, 3).toUpperCase() || 'W';

  return (
    <View style={[StyleSheet.absoluteFill, styles.stampRoot, { backgroundColor: colors.stampInk }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 66 71"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="stamp-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#15223B" />
            <Stop offset="65%" stopColor="#24479A" />
            <Stop offset="100%" stopColor="#15223B" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="66" height="71" fill="url(#stamp-sky)" />
        {/* Inner philatelic frame & corner ticks */}
        <Rect
          x="3.5"
          y="3.5"
          width="59"
          height="64"
          rx="1"
          fill="none"
          stroke="#F4F0E8"
          strokeOpacity={0.38}
          strokeWidth="1"
        />
        {/* Globe meridian rings */}
        <Circle cx="33" cy="36" r="21" fill="none" stroke="#F4F0E8" strokeOpacity={0.18} strokeWidth="0.9" />
        <Circle cx="33" cy="36" r="15" fill="none" stroke="#F4F0E8" strokeOpacity={0.22} strokeWidth="0.8" strokeDasharray="2 2" />
        <Path d="M 12 36 Q 33 27 54 36" fill="none" stroke="#F4F0E8" strokeOpacity={0.18} strokeWidth="0.9" />
        {/* Crimson & cream airmail wing chevron at top */}
        <Polygon points="33,10 21,15 25,17 33,13.5 41,17 45,15" fill="#C8323C" />
        <Polygon points="33,7.5 25,11 28,12.5 33,10 38,12.5 41,11" fill="#F4F0E8" />
        {/* Horizon sea waves at bottom */}
        <Path d="M 6 58 Q 19 54 33 58 T 60 58" fill="none" stroke="#CDB28A" strokeOpacity={0.55} strokeWidth="1.1" />
        <Path d="M 9 62 Q 21 59 33 62 T 57 62" fill="none" stroke="#F4F0E8" strokeOpacity={0.35} strokeWidth="0.9" />
      </Svg>
      <View style={styles.stampCenter}>
        <AppText
          role={compact ? (displayLabel.length > 1 ? 'tag' : 'time') : (displayLabel.length > 1 ? 'wordmark' : 'initialLg')}
          numberOfLines={1}
          style={{ color: colors.stampPaper, paddingRight: 1 }}
        >
          {displayLabel}
        </AppText>
        {subtitle && !compact ? (
          <AppText
            role="stampLabel"
            numberOfLines={1}
            style={[styles.stampSubtitle, { color: colors.stampPaper }]}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  planeLayer: {
    ...StyleSheet.absoluteFill,
  },
  stampRoot: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stampSubtitle: {
    marginTop: 1,
    paddingRight: 1,
  },
});

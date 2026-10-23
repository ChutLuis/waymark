import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useIsFocused } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type AnimatedStyle } from 'react-native-reanimated';
import { useAppActive } from '@/components/useAppActive';
import { DefaultAirmailScene } from '@/components/airmail/DefaultAirmailArt';
import { useReducedMotion } from '@/components/useReducedMotion';
import { useSignedUrl } from '@/lib/supabase/storage';
import { motion, useTheme } from '@/theme';
import { DESTINATION_ART } from './destinationArt';
import { SCENE_FRAMES, sceneFrameAt } from './sceneClock';
import { cropTransform, CROPS, SCENE_HEIGHT, SCENE_WIDTH, type CountryKey, type SceneCrop } from './destinations';

interface TripSceneProps {
  /** null for an unknown destination (caller supplies the fallback banner). */
  country: CountryKey | null;
  /** A cover photo wins over the scene art. */
  coverImagePath?: string | null;
  crop?: SceneCrop;
  width: number;
  height: number;
  /** Play the Lottie (only one scene per screen may play). */
  live?: boolean;
  /** Pause the Lottie while off-screen or behind other cards. */
  paused?: boolean;
  /**
   * Overrides the screen-focus check: the Home card's scene picks up while the
   * trip collapses back onto it, before Home regains focus.
   */
  active?: boolean;
  /** Fill the parent instead of a fixed width × height (an animated frame). */
  fill?: boolean;
  /**
   * An animated art box (the 800 × 500 canvas's size and offset) that replaces
   * the static crop, so a growing frame keeps a cover crop all the way.
   */
  artStyle?: AnimatedStyle<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Destination scene art: a live Lottie (when `live`), otherwise a still. Cover
 * photos replace the art. Uses the README crop rule so the 800x500 canvas
 * covers the window, centred, never showing outside.
 *
 * The Lottie stays mounted and is paused/resumed rather than unmounted, so the
 * art never flashes back to the placeholder and the scene isn't re-parsed. A
 * paused scene holds its frame; the live scene crossfades over the still the
 * first time it takes over.
 *
 * Playback is phase-locked to the shared scene clock: whenever a scene starts
 * or resumes it seeks to the clock's frame, so two scenes of the same trip
 * (the Home card and the trip header) always show the same moment and the
 * expand between them never restarts the loop.
 */
export function TripScene({
  country,
  coverImagePath = null,
  crop = 'hero',
  width,
  height,
  live = false,
  paused = false,
  active,
  fill = false,
  artStyle,
  style,
}: TripSceneProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const ref = useRef<LottieView>(null);
  const appActive = useAppActive();
  const [loadedSource, setLoadedSource] = useState<unknown>(null);

  const coverUrl = useSignedUrl('trip-covers', coverImagePath);
  const art = country ? DESTINATION_ART[country] : null;
  const { scale, left, top } = cropTransform(CROPS[crop], width, height);

  const onScreen = active ?? isFocused;
  const showLive = live && !reducedMotion && !paused && onScreen && appActive;
  const lottieReady = art !== null && loadedSource === art.scene;
  // Shown once loaded unless the scene must hold the frame-0 still.
  const lottieShown = live && !reducedMotion && lottieReady;

  const playing = showLive && lottieReady;
  const playingRef = useRef(playing);

  // Control playback imperatively so the same mounted animation is paused on
  // blur / background / off-screen and resumed, in phase, when it should play.
  // Native players loop the segment they are given, so native plays the clock
  // frame to the end and restarts from 0 on finish; the web player's
  // play(frame) seeks and keeps looping the whole comp.
  useEffect(() => {
    playingRef.current = playing;
    if (!art) return;
    if (!playing) {
      ref.current?.pause();
      return;
    }
    const frame = sceneFrameAt(Date.now());
    if (Platform.OS === 'web') ref.current?.play(frame);
    else ref.current?.play(frame, SCENE_FRAMES);
  }, [playing, art]);

  const onFinish = (isCancelled: boolean) => {
    if (isCancelled || !playingRef.current || Platform.OS === 'web') return;
    ref.current?.play(0, SCENE_FRAMES);
  };

  const lottieOpacity = useSharedValue(0);
  useEffect(() => {
    lottieOpacity.value = withTiming(lottieShown ? 1 : 0, {
      duration: lottieShown && !reducedMotion ? motion.choreo.expand.sceneFade : 0,
    });
  }, [lottieShown, reducedMotion, lottieOpacity]);
  const lottieStyle = useAnimatedStyle(() => ({ opacity: lottieOpacity.value }));

  const staticArt = {
    position: 'absolute' as const,
    width: SCENE_WIDTH * scale,
    height: SCENE_HEIGHT * scale,
    left,
    top,
  };

  return (
    <View
      style={[
        fill ? StyleSheet.absoluteFill : { width, height },
        { backgroundColor: colors.artPlaceholder },
        styles.window,
        style,
      ]}
    >
      {coverImagePath && coverUrl.data ? (
        <Animated.View style={artStyle ?? staticArt}>
          <Image
            source={{ uri: coverUrl.data }}
            style={styles.fill}
            contentFit="cover"
            transition={reducedMotion ? 0 : motion.choreo.expand.sceneFade}
            accessibilityLabel="Trip cover photo"
          />
        </Animated.View>
      ) : art ? (
        <Animated.View style={artStyle ?? staticArt} pointerEvents="none">
          {/* The still sits under the Lottie and covers the load gap. Decoded
              at full size, so the Home card and the trip header share one
              cached bitmap and the header has it on its first frame. */}
          <Image
            source={art.sceneStill}
            style={styles.fill}
            contentFit="cover"
            transition={0}
            allowDownscaling={false}
          />
          <Animated.View style={[styles.fill, lottieStyle]}>
            <LottieView
              ref={ref}
              source={art.scene}
              loop={Platform.OS === 'web'}
              autoPlay={false}
              onAnimationLoaded={() => setLoadedSource(art.scene)}
              onAnimationFinish={onFinish}
              style={styles.fill}
            />
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View style={artStyle ?? staticArt} pointerEvents="none">
          <DefaultAirmailScene live={showLive} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
  },
  preload: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});

/**
 * Loads a destination's scene, hidden and paused, so the trip header that
 * opens next finds it already parsed: Android caches a scene's composition by
 * its JSON, so the header's own view starts on the live frame instead of the
 * still (README 02). Home mounts it behind an envelope card, which has no
 * live scene of its own, while Home is focused.
 */
export function ScenePreload({ country }: { country: CountryKey }) {
  return (
    <View style={styles.preload} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView source={DESTINATION_ART[country].scene} autoPlay={false} loop={false} style={styles.fill} />
    </View>
  );
}

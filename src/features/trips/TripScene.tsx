import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type AppStateStatus, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useIsFocused } from 'expo-router';
import { useReducedMotion } from '@/components/useReducedMotion';
import { useSignedUrl } from '@/lib/supabase/storage';
import { useTheme } from '@/theme';
import { DESTINATION_ART } from './destinationArt';
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
  /** Pause the Lottie while off-screen. */
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Destination scene art: a live Lottie (when `live`), otherwise a still. Cover
 * photos replace the art. Uses the README crop rule so the 800x500 canvas
 * covers the window, centred, never showing outside.
 *
 * The Lottie stays mounted and is paused/resumed rather than unmounted, so the
 * art never flashes back to the placeholder and the scene isn't re-parsed.
 */
export function TripScene({
  country,
  coverImagePath = null,
  crop = 'hero',
  width,
  height,
  live = false,
  paused = false,
  style,
}: TripSceneProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const ref = useRef<LottieView>(null);
  const [appActive, setAppActive] = useState(true);
  const [loadedSource, setLoadedSource] = useState<unknown>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) =>
      setAppActive(state === 'active'),
    );
    return () => sub.remove();
  }, []);

  const coverUrl = useSignedUrl('trip-covers', coverImagePath);
  const art = country ? DESTINATION_ART[country] : null;
  const { scale, left, top } = cropTransform(CROPS[crop], width, height);

  const showLive = live && !reducedMotion && !paused && isFocused && appActive;
  const lottieReady = art !== null && loadedSource === art.scene;

  // Control playback imperatively so the same mounted animation is paused on
  // blur / background / off-screen and resumed when it should play.
  useEffect(() => {
    if (!art) return;
    if (showLive && lottieReady) ref.current?.resume();
    else ref.current?.pause();
  }, [showLive, lottieReady, art]);

  const artStyle = {
    position: 'absolute' as const,
    width: SCENE_WIDTH * scale,
    height: SCENE_HEIGHT * scale,
    left,
    top,
  };

  return (
    <View style={[{ width, height, backgroundColor: colors.artPlaceholder }, styles.window, style]}>
      {coverImagePath && coverUrl.data ? (
        <Image source={{ uri: coverUrl.data }} style={artStyle} contentFit="cover" transition={150} accessibilityLabel="Trip cover photo" />
      ) : art ? (
        <>
          {/* The still sits under the Lottie and covers the load gap. */}
          <Image source={art.sceneStill} style={artStyle} contentFit="cover" transition={0} />
          <View style={artStyle} pointerEvents="none">
            <LottieView
              ref={ref}
              source={art.scene}
              loop
              autoPlay={false}
              onAnimationLoaded={() => setLoadedSource(art.scene)}
              style={[styles.lottie, showLive && lottieReady ? null : styles.hidden]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
  },
});
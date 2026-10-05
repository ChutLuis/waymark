import { useEffect, useState } from 'react';
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
 * covers the window, centred, never showing outside. Shows the still until the
 * Lottie has loaded so nothing flashes.
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
  const [lottieReady, setLottieReady] = useState(false);
  const [appActive, setAppActive] = useState(true);

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

  return (
    <View style={[{ width, height, backgroundColor: colors.artPlaceholder }, styles.window, style]}>
      {coverImagePath && coverUrl.data ? (
        <Image
          source={{ uri: coverUrl.data }}
          style={{
            position: 'absolute',
            width: SCENE_WIDTH * scale,
            height: SCENE_HEIGHT * scale,
            left,
            top,
          }}
          contentFit="cover"
          transition={150}
          accessibilityLabel="Trip cover photo"
        />
      ) : art ? (
        <>
          {/* Still underneath: shown until (and behind) the live Lottie. */}
          {(!lottieReady || !showLive) && (
            <Image
              source={art.sceneStill}
              style={{
                position: 'absolute',
                width: SCENE_WIDTH * scale,
                height: SCENE_HEIGHT * scale,
                left,
                top,
              }}
              contentFit="cover"
              transition={0}
            />
          )}
          {showLive ? (
            <View
              style={{
                position: 'absolute',
                width: SCENE_WIDTH * scale,
                height: SCENE_HEIGHT * scale,
                left,
                top,
              }}
              pointerEvents="none"
            >
              <LottieView
                source={art.scene}
                loop
                autoPlay
                onAnimationLoaded={() => setLottieReady(true)}
                style={styles.lottie}
              />
            </View>
          ) : null}
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
});
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/components/useReducedMotion';
import type { ItineraryStatus } from '@/lib/types';
import { DESTINATION_ART, NEUTRAL_STOP_STAMP } from './destinationArt';
import type { CountryKey } from './destinations';

/** The stamp animation runs 96x112 at 30 fps, 36 frames (stamp then postmark). */
const FPS = 30;
/** Frame each status lands on, read from the stamp's confirm/done markers. */
const STATUS_FRAME: Record<ItineraryStatus, number> = {
  planned: 0,
  confirmed: 18,
  done: 36,
};
/** Haptic accents: the stamp lands ~frame 10, the postmark ~5 frames into done. */
const HAPTIC_FRAMES = { stamp: 10, postmark: 23 };

/** Display width/height in a list row. */
export const STOP_STAMP_WIDTH = 30;
export const STOP_STAMP_HEIGHT = 35;

interface StopStampProps {
  status: ItineraryStatus;
  /** Destination drives which stamp plays; unknown → neutral. */
  country: CountryKey | null;
  /** Size override; the Lottie keeps its 96x112 aspect (6/7). */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Marker-driven stop stamp (LottieView, loop={false}). Seeks to the frame for
 * the current status without playing on mount; plays the transition when the
 * status changes forward; seeks instantly when it moves backwards. Haptics fire
 * as the stamp and postmark land. All seeking details live here.
 *
 * Seeking uses the imperative `play(start, end)`; `play(f, f)` jumps to a frame.
 */
export function StopStamp({
  status,
  country,
  width = STOP_STAMP_WIDTH,
  height = STOP_STAMP_HEIGHT,
  style,
}: StopStampProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<LottieView>(null);
  const prevFrame = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const source = country ? DESTINATION_ART[country].stopStamp : NEUTRAL_STOP_STAMP;
  const targetFrame = STATUS_FRAME[status];

  useEffect(() => {
    const from = prevFrame.current;
    prevFrame.current = targetFrame;
    const seek = (frame: number) => ref.current?.play(frame, frame);

    if (reducedMotion) {
      seek(targetFrame);
      return;
    }
    if (from === null || targetFrame <= from) {
      // Mount, or a backwards move (e.g. done → planned): seek, don't animate.
      seek(targetFrame);
      return;
    }

    const startFrame = from;
    ref.current?.play(startFrame, targetFrame);
    const frameAt = (frame: number) => ((frame - startFrame) / FPS) * 1000;
    const timersForRun: ReturnType<typeof setTimeout>[] = [];
    if (startFrame < HAPTIC_FRAMES.stamp && HAPTIC_FRAMES.stamp <= targetFrame) {
      timersForRun.push(
        setTimeout(
          () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          frameAt(HAPTIC_FRAMES.stamp),
        ),
      );
    }
    if (startFrame < HAPTIC_FRAMES.postmark && HAPTIC_FRAMES.postmark <= targetFrame) {
      timersForRun.push(
        setTimeout(
          () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
          frameAt(HAPTIC_FRAMES.postmark),
        ),
      );
    }
    timers.current = timersForRun;
    return () => timersForRun.forEach(clearTimeout);
  }, [targetFrame, reducedMotion]);

  return (
    <View style={[{ width, height }, style]} pointerEvents="none" accessibilityElementsHidden>
      <LottieView ref={ref} source={source} loop={false} autoPlay={false} style={styles.lottie} />
    </View>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: '100%',
    height: '100%',
  },
});
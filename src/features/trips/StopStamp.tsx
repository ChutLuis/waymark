import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { useMotion, useTimeline, sampleTrack } from '@/components/motion';
import { postmarkSquash } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { motion, useTheme } from '@/theme';
import type { ItineraryStatus } from '@/lib/types';
import { DESTINATION_ART, NEUTRAL_STOP_STAMP } from './destinationArt';
import type { CountryKey } from './destinations';

/** The stamp animation runs 96x112 at 30 fps, 36 frames (stamp then postmark). */
const FPS = 30;
/**
 * Frame each status lands on, from the stamp's markers: `confirm` runs 0–17 and
 * `done` runs 18–35 (op is 36), so each status holds on the LAST frame of its
 * marker. Frame 36 is out of range and renders nothing on web (N17); frame 18
 * is the first frame of the done marker, not a confirmed postmark.
 */
const STATUS_FRAME: Record<ItineraryStatus, number> = {
  planned: 0,
  confirmed: 17,
  done: 35,
};

/** Display width/height on the Plan route (README 03: 36 × 42). */
export const STOP_STAMP_WIDTH = 36;
export const STOP_STAMP_HEIGHT = 42;

interface StopStampProps {
  status: ItineraryStatus;
  /** Destination drives which stamp plays; unknown → neutral. */
  country: CountryKey | null;
  /** Size override; the Lottie keeps its 96x112 aspect (6/7). */
  width?: number;
  height?: number;
  /**
   * Local changes deliver their contact frame; incoming data settles at once
   * with `local` false, without stamping the row's status tag.
   */
  onContact?: (status: ItineraryStatus, local: boolean) => void;
  /**
   * When the press that set `status` happened (ms since epoch): contact times
   * run from the tap, not from when the change reached the stamp (README 03).
   */
  pressedAt?: number | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Marker-driven stop stamp (LottieView, loop={false}). Seeks to the frame for
 * the current status without playing on mount; plays the transition when the
 * user presses it forward; incoming data and rollbacks seek silently. Haptics fire
 * on contact (README 03/04): the stamp lands 300 ms into `confirm` (light),
 * the postmark bottoms out 200 ms into `done` (medium) and the stamp squashes.
 *
 * Seeking uses the imperative `play(start, end)`; `play(f, f)` jumps to a frame.
 */
export function StopStamp({
  status,
  country,
  width = STOP_STAMP_WIDTH,
  height = STOP_STAMP_HEIGHT,
  onContact,
  pressedAt = null,
  style,
}: StopStampProps) {
  const { reduced, ms } = useMotion();
  const { scheme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const ref = useRef<LottieView>(null);
  const prevFrame = useRef<number | null>(null);
  const prevSource = useRef<unknown>(null);
  const handledPress = useRef<number | null>(null);
  /** While a segment plays, nothing may seek the stamp (README 03 v4.1.1). */
  const playingUntil = useRef(0);
  const squash = useTimeline(1);
  const contactRef = useRef(onContact);
  const pressedRef = useRef(pressedAt);
  useLayoutEffect(() => {
    contactRef.current = onContact;
    pressedRef.current = pressedAt;
  }, [onContact, pressedAt]);

  const source = country ? DESTINATION_ART[country].stopStamp : NEUTRAL_STOP_STAMP;
  const targetFrame = STATUS_FRAME[status];

  const apply = useCallback(() => {
    if (Date.now() < playingUntil.current) return;
    const frame = prevFrame.current ?? STATUS_FRAME.planned;
    ref.current?.play(frame, frame);
    ref.current?.pause();
  }, []);

  // A layout effect, so the segment starts in the commit that carries the
  // change rather than after it paints.
  useLayoutEffect(() => {
    const from = prevFrame.current;
    const sourceChanged = prevSource.current !== source;
    prevSource.current = source;
    prevFrame.current = targetFrame;
    // Static seek: play(f, f) jumps to the frame; pause() then holds it (the web
    // player's play(f, f) does setFrame + play, so the pause is what stops it).
    const seek = (frame: number) => {
      ref.current?.play(frame, frame);
      ref.current?.pause();
    };

    const press = pressedRef.current;
    const local = press !== null && press !== handledPress.current && !sourceChanged && from !== null;
    if (local) handledPress.current = press;
    if (from === null || sourceChanged || targetFrame < from || !local) {
      playingUntil.current = 0;
      seek(targetFrame);
      if (from !== null && (targetFrame !== from || sourceChanged)) contactRef.current?.(status, false);
      return;
    }
    if (targetFrame === from) return;

    // Contact times run from the start of each marker segment.
    const frameMs = (frame: number) => ((frame - from) / FPS) * 1000;
    const contacts: { status: ItineraryStatus; at: number }[] = [];
    if (from < STATUS_FRAME.confirmed && targetFrame >= STATUS_FRAME.confirmed) {
      contacts.push({ status: 'confirmed', at: frameMs(STATUS_FRAME.planned) + motion.choreo.stamp.confirmContact });
    }
    if (targetFrame === STATUS_FRAME.done) {
      contacts.push({ status: 'done', at: frameMs(STATUS_FRAME.confirmed) + motion.choreo.stamp.doneContact });
    }

    if (reduced) seek(targetFrame);
    else {
      playingUntil.current = Date.now() + frameMs(targetFrame);
      ref.current?.play(from, targetFrame);
    }

    // Time already spent since the tap comes off every contact.
    const lag = Math.max(0, Date.now() - press!);
    const timers = contacts.map(({ status: landed, at }) =>
      setTimeout(() => {
        // Haptics still fire under Reduce Motion; the frame jumps to the end.
        haptic(landed === 'done' ? 'medium' : 'light');
        if (landed === 'done') squash.run(motion.choreo.stamp.squash);
        contactRef.current?.(landed, true);
      }, Math.max(0, ms(at) - lag)),
    );
    // A segment command sent before Lottie loads can be lost. Always settle
    // after its end; the load retries alone may both fall inside the segment.
    timers.push(setTimeout(() => {
      playingUntil.current = 0;
      apply();
    }, ms(frameMs(targetFrame))));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFrame, source, apply]);

  // A freshly loaded animation starts at frame 0 (mount, or a destination
  // change). Seek it to the right frame without playing — this is also the web
  // player's only static-seek path, since it isn't ready during the first
  // effect run. A segment in play is left alone.
  // The web player does not consistently fire onAnimationLoaded for a mount
  // that starts on a non-zero frame, so seek on a short timer as well (N17).
  // Retry after native configuration changes too, but never seek a playing
  // segment; its own end timer settles it if these retries both arrive early.
  useEffect(() => {
    const timers = [setTimeout(apply, 50), setTimeout(apply, 250)];
    return () => timers.forEach(clearTimeout);
  }, [source, scheme, fontScale, apply]);

  useEffect(() => {
    if (reduced) {
      playingUntil.current = 0;
      apply();
    }
  }, [reduced, apply]);

  const squashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sampleTrack(postmarkSquash.scale, squash.p.value, motion.easing.standard) }],
  }));

  return (
    <Animated.View
      style={[{ width, height }, squashStyle, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={apply}
    >
      <LottieView
        ref={ref}
        source={source}
        loop={false}
        autoPlay={false}
        onAnimationLoaded={apply}
        style={styles.lottie}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: '100%',
    height: '100%',
  },
});

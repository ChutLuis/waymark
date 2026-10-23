import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { sampleTrack, useMotion, useTimeline } from '@/components/motion';
import { useAppActive } from '@/components/useAppActive';
import { cardPress, dealCard, frontBump } from '@/components/motion/keyframes';
import { hapticAfter } from '@/lib/haptics';
import { motion } from '@/theme';
import { EnvelopeFace } from './EnvelopeFace';
import { OnNowPostcard, type OnNowPostcardHandle } from './OnNowPostcard';
import { ScenePreload } from './TripScene';
import { matchDestination } from './destinations';
import type { Rect } from './expandStore';
import type { TripListItem } from './hooks';

/** The deal plays once per app session, not on every focus. */
let dealtThisSession = false;

/** True until the session's first Home card has dealt; read once per mount. */
export function shouldDeal(): boolean {
  return !dealtThisSession;
}

/** The trip Home shows: kept while the app runs, back to on-now at launch. */
let sessionHomeTrip: string | null = null;

export function getSessionHomeTrip(): string | null {
  return sessionHomeTrip;
}

export function setSessionHomeTrip(id: string): void {
  sessionHomeTrip = id;
}

/** Envelopes have no scene window: the trip header grows from their top band. */
const ENVELOPE_WINDOW = 150;

export type ExpandRects = { paper: Rect; window: Rect };

export interface CardActions {
  bump: (then: () => void) => void;
  press: () => void;
  measure: (done: (rects: ExpandRects | null) => void) => void;
}

interface TripFaceHandle {
  measure: (done: (rects: ExpandRects | null) => void) => void;
}

interface TripFaceProps {
  trip: TripListItem;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  /** Fully shown on a focused screen: the on-now scene and idle loops run. */
  live: boolean;
  collapsing: boolean;
}

/** One trip card: the on-now postcard, or an envelope face. */
const TripFace = forwardRef<TripFaceHandle, TripFaceProps>(function TripFace(
  { trip, onNow, viewerId, paperIndex, live, collapsing },
  ref,
) {
  const postcard = useRef<OnNowPostcardHandle>(null);
  const envelope = useRef<View>(null);
  const country = matchDestination(trip.destination);
  useImperativeHandle(ref, () => ({
    measure: (done) => {
      if (onNow) {
        if (postcard.current) postcard.current.measure(done);
        else done(null);
        return;
      }
      // An envelope's paper is the whole card; the header grows from its top.
      if (!envelope.current) {
        done(null);
        return;
      }
      envelope.current.measureInWindow((x, y, width, height) => {
        if (!width) done(null);
        else done({ paper: { x, y, width, height }, window: { x, y, width, height: ENVELOPE_WINDOW } });
      });
    },
  }));
  return onNow ? (
    <OnNowPostcard ref={postcard} trip={trip} viewerId={viewerId} front={live} collapsing={collapsing} />
  ) : (
    <View ref={envelope} collapsable={false}>
      {live && country ? <ScenePreload country={country} /> : null}
      <EnvelopeFace
        trip={trip}
        others={trip.memberProfiles.filter((m) => m.id !== viewerId).map((m) => m.displayName)}
        paperIndex={paperIndex}
      />
    </View>
  );
});

/** Press, bump and measure for one card, shared by Home and the stack. */
function useCardActions(face: RefObject<TripFaceHandle | null>) {
  const { ms } = useMotion();
  const bump = useTimeline(1);
  const press = useTimeline(1);
  const actions: CardActions = {
    bump: (then) => {
      bump.run(motion.choreo.home.bump);
      setTimeout(then, ms(motion.choreo.home.bump));
    },
    press: () => press.run(motion.choreo.home.press),
    measure: (done) => {
      if (!face.current) done(null);
      else face.current.measure(done);
    },
  };
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: sampleTrack(frontBump.translateY, bump.p.value, motion.easing.standard) },
      { rotate: `${sampleTrack(frontBump.rotate, bump.p.value, motion.easing.standard)}deg` },
      { scale: sampleTrack(cardPress.scale, press.p.value, motion.easing.standard) },
    ],
  }));
  return { actions, style };
}

/** How a Home card arrives: the session's deal, a pick from the rail, or not at all. */
export type HomeDeal = 'launch' | 'pick' | null;

export interface HomeCardHandle {
  /** Finish an interrupted deal before this card moves underneath another. */
  settle: () => void;
}

interface HomeCardProps {
  trip: TripListItem;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  focused: boolean;
  collapsing: boolean;
  /** Read once, on mount. */
  deal: HomeDeal;
  onPress: (actions: CardActions) => void;
}

/**
 * The one card Home shows (Airmail v4.1 · 01): the on-now postcard or the
 * picked trip's envelope face. Tapping it opens the trip, expanding from the
 * card. It deals in on the session's first mount (150 ms in, `light` at 600)
 * and when picked from the rail (at once, `light` at 450), landing on top of
 * the card it replaces.
 */
export const HomeCard = forwardRef<HomeCardHandle, HomeCardProps>(function HomeCard(
  { trip, onNow, viewerId, paperIndex, focused, collapsing, deal, onPress },
  ref,
) {
  const { ms } = useMotion();
  const appActive = useAppActive();
  const face = useRef<TripFaceHandle>(null);
  const cancelDealHaptic = useRef<(() => void) | null>(null);
  const { actions, style } = useCardActions(face);
  const dealt = useTimeline(deal ? 0 : 1);
  const keys = useMemo(() => dealCard(0), []);

  useImperativeHandle(ref, () => ({
    settle: () => {
      dealt.set(1);
      cancelDealHaptic.current?.();
      cancelDealHaptic.current = null;
    },
  }));

  useEffect(() => {
    if (!deal) return;
    const { home } = motion.choreo;
    if (deal === 'launch') dealtThisSession = true;
    const delay = deal === 'launch' ? home.dealBase : 0;
    const contact = deal === 'launch' ? home.dealBase + home.dealContact : home.pickContact;
    dealt.run(motion.duration.deal, delay);
    const cancel = hapticAfter('light', ms(contact));
    cancelDealHaptic.current = cancel;
    return cancel;
    // Mount only: a card deals once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, dealt.p.value, motion.easing.settle),
    transform: [
      { translateY: sampleTrack(keys.translateY, dealt.p.value, motion.easing.settle) },
      { rotate: `${sampleTrack(keys.rotate, dealt.p.value, motion.easing.settle)}deg` },
      { scale: sampleTrack(keys.scale, dealt.p.value, motion.easing.settle) },
    ],
  }));

  return (
    <Animated.View style={dealStyle}>
      <Animated.View style={style}>
        <Pressable accessibilityRole="button" accessibilityLabel={trip.name} accessibilityHint="Opens the trip" onPress={() => onPress(actions)}>
          <TripFace
            ref={face}
            trip={trip}
            onNow={onNow}
            viewerId={viewerId}
            paperIndex={paperIndex}
            live={focused && appActive}
            collapsing={collapsing && appActive}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { clamp, easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import {
  PASS_DISTANCE,
  PASS_FLY,
  PASS_LEAN_MAX,
  PASS_LEAN_PER_PT,
  PASS_SLOP,
  PASS_VELOCITY,
  cardPress,
  dealCard,
  frontBump,
  shuffleLift,
} from '@/components/motion/keyframes';
import { hapticAfter } from '@/lib/haptics';
import { motion, spacing } from '@/theme';
import { EnvelopeFace } from './EnvelopeFace';
import { OnNowPostcard, type OnNowPostcardHandle } from './OnNowPostcard';
import {
  STACK_VISIBLE,
  backToFront,
  bringToFront,
  passToBack,
  reconcileOrder,
  stackHeight,
  stackPosition,
} from './stack';
import type { Rect } from './expandStore';
import type { TripListItem } from './hooks';

/** The deal plays once per app session, not on every focus. */
let dealtThisSession = false;

/** True until the session's first stack has dealt; read once per mount. */
export function shouldDeal(): boolean {
  return !dealtThisSession;
}

interface StackCardProps {
  trip: TripListItem;
  depth: number;
  count: number;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  /** The screen is focused (scene and idle loops may run at the front). */
  focused: boolean;
  collapsing: boolean;
  /** Deal order from the back (0 = back), or null when not dealing. */
  dealIndex: number | null;
  /** Bumped when this card was just tapped from behind. */
  liftKey: number;
  onPress: (trip: TripListItem, actions: CardActions) => void;
  /** The front card was swiped off: pass it to the back. */
  onPass: () => void;
  /** Screen reader: bring the back card to the front. */
  onPrevious: () => void;
}

export interface CardActions {
  bump: (then: () => void) => void;
  press: () => void;
  measure: (done: (rects: { paper: Rect; window: Rect } | null) => void) => void;
}

function StackCard({
  trip,
  depth,
  count,
  onNow,
  viewerId,
  paperIndex,
  focused,
  collapsing,
  dealIndex,
  liftKey,
  onPress,
  onPass,
  onPrevious,
}: StackCardProps) {
  const { ms } = useMotion();
  const pos = stackPosition(depth, count);
  const top = useSharedValue(pos.top);
  const inset = useSharedValue(pos.inset);
  const shown = useSharedValue(pos.hidden ? 0 : 1);
  const swipe = useSharedValue(0);
  const width = useSharedValue(0);
  const postcard = useRef<OnNowPostcardHandle>(null);

  const deal = useTimeline(dealIndex === null ? 1 : 0);
  const lift = useTimeline(1);
  const bump = useTimeline(1);
  const press = useTimeline(1);
  const keys = useMemo(() => dealCard(dealIndex ?? 0), [dealIndex]);

  // Every card slides to its new depth over 520 ms (stack easing).
  useEffect(() => {
    const config = { duration: ms(motion.duration.drop), easing: easing('stack') };
    top.value = withTiming(pos.top, config);
    inset.value = withTiming(pos.inset, config);
  }, [pos.top, pos.inset, top, inset, ms]);

  // Cards past the fourth depth wait hidden and fade in as they come forward.
  useEffect(() => {
    shown.value = withTiming(pos.hidden ? 0 : 1, { duration: ms(motion.choreo.home.reveal) });
  }, [pos.hidden, shown, ms]);

  // A passed card flew off the side; now at the back, it slides in behind the
  // stack and lands with a light tap.
  const firstDepth = useRef(true);
  useEffect(() => {
    if (firstDepth.current) {
      firstDepth.current = false;
      return;
    }
    if (swipe.value === 0) return;
    swipe.value = withTiming(0, { duration: ms(motion.choreo.home.passTuck), easing: easing('standard') });
    return hapticAfter('light', ms(motion.choreo.home.passTuck));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);

  useEffect(() => {
    if (dealIndex === null) return;
    const delay = motion.choreo.home.dealBase + dealIndex * motion.stagger.deal;
    deal.run(motion.duration.deal, delay);
    return hapticAfter('light', ms(delay + motion.choreo.home.dealContact));
    // Mount only: the deal plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The tapped letter lifts out of the stack and lands on top.
  const firstLift = useRef(true);
  useEffect(() => {
    if (firstLift.current) {
      firstLift.current = false;
      return;
    }
    lift.run(motion.duration.shuffle);
    return hapticAfter('light', ms(motion.choreo.home.shuffleContact));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftKey]);

  const style = useAnimatedStyle(() => {
    const d = deal.p.value;
    const l = lift.p.value;
    const b = bump.p.value;
    const pr = press.p.value;
    return {
      top: top.value,
      left: inset.value,
      right: inset.value,
      opacity: sampleTrack(keys.opacity, d, motion.easing.settle) * shown.value,
      transform: [
        { translateX: swipe.value },
        {
          translateY:
            sampleTrack(keys.translateY, d, motion.easing.settle) +
            sampleTrack(shuffleLift.translateY, l, motion.easing.drop) +
            sampleTrack(frontBump.translateY, b, motion.easing.standard),
        },
        {
          rotate: `${
            sampleTrack(keys.rotate, d, motion.easing.settle) +
            sampleTrack(shuffleLift.rotate, l, motion.easing.drop) +
            sampleTrack(frontBump.rotate, b, motion.easing.standard) +
            clamp(swipe.value * PASS_LEAN_PER_PT, -PASS_LEAN_MAX, PASS_LEAN_MAX)
          }deg`,
        },
        {
          scale:
            sampleTrack(keys.scale, d, motion.easing.settle) *
            sampleTrack(shuffleLift.scale, l, motion.easing.drop) *
            sampleTrack(cardPress.scale, pr, motion.easing.standard),
        },
      ],
    };
  });

  const actions: CardActions = {
    bump: (then) => {
      bump.run(motion.choreo.home.bump);
      setTimeout(then, ms(motion.choreo.home.bump));
    },
    press: () => press.run(motion.choreo.home.press),
    measure: (done) => {
      if (!postcard.current) done(null);
      else postcard.current.measure(done);
    },
  };

  // Swipe the front card sideways to pass it to the back of the stack. The
  // swipe only takes over from a mostly horizontal drag, so Home still scrolls.
  // Easings resolve on the JS thread; the worklets below only capture them.
  const passOut = { duration: ms(motion.choreo.home.passOut), easing: easing('exit') };
  const springBack = { duration: ms(motion.duration.springHome), easing: easing('springHome') };
  const pan = Gesture.Pan()
    .enabled(depth === 0 && count > 1)
    .activeOffsetX([-PASS_SLOP, PASS_SLOP])
    .failOffsetY([-PASS_SLOP, PASS_SLOP])
    .onUpdate((e) => {
      swipe.value = e.translationX;
    })
    .onEnd((e) => {
      const passed = Math.abs(e.translationX) > width.value * PASS_DISTANCE || Math.abs(e.velocityX) > PASS_VELOCITY;
      if (!passed) {
        swipe.value = withTiming(0, springBack);
        return;
      }
      const side = (e.translationX !== 0 ? e.translationX : e.velocityX) < 0 ? -1 : 1;
      swipe.value = withTiming(side * width.value * PASS_FLY, passOut, (done) => {
        if (done) runOnJS(onPass)();
      });
    });

  const behind = depth > 0;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { zIndex: pos.z }, style]}
        pointerEvents={pos.hidden ? 'none' : 'auto'}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={trip.name}
          accessibilityHint={behind ? 'Brings this envelope to the front' : count > 1 ? 'Swipe sideways to pass it' : undefined}
          accessibilityElementsHidden={pos.hidden}
          importantForAccessibility={pos.hidden ? 'no-hide-descendants' : 'auto'}
          accessibilityActions={
            !behind && count > 1
              ? [
                  { name: 'next', label: 'Next trip' },
                  { name: 'previous', label: 'Previous trip' },
                ]
              : undefined
          }
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'next') onPass();
            if (e.nativeEvent.actionName === 'previous') onPrevious();
          }}
          onPress={() => onPress(trip, actions)}
        >
          {onNow ? (
            <OnNowPostcard
              ref={postcard}
              trip={trip}
              viewerId={viewerId}
              front={!behind && focused}
              collapsing={collapsing}
            />
          ) : (
            <EnvelopeFace
              trip={trip}
              others={trip.memberProfiles.filter((m) => m.id !== viewerId).map((m) => m.displayName)}
              paperIndex={paperIndex}
            />
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

interface MailStackProps {
  /** Every current trip, in the default order (on-now first). */
  trips: TripListItem[];
  onNowIds: Set<string>;
  viewerId: string | null;
  focused: boolean;
  collapsing: boolean;
  /** Deal this mount (the session's first stack). */
  dealing: boolean;
  /** Tapping the on-now postcard at the front: expand into the trip. */
  onOpenOnNow: (trip: TripListItem, actions: CardActions) => void;
  /** Tapping any other front card, after its bump. */
  onOpenTrip: (trip: TripListItem) => void;
}

/**
 * The Home mail stack (Airmail v4 · 01). Cards sit by depth with only the 38 pt
 * header of each card behind showing; past four, the rest wait hidden behind
 * the last. They deal in back to front on the session's first mount. Swiping
 * the front card passes it to the back, tapping a card behind brings it to
 * the front with a lift, and tapping the front card opens it.
 */
export function MailStack({
  trips,
  onNowIds,
  viewerId,
  focused,
  collapsing,
  dealing,
  onOpenOnNow,
  onOpenTrip,
}: MailStackProps) {
  const defaults = useMemo(() => trips.map((t) => t.id), [trips]);
  const [order, setOrder] = useState(defaults);
  const [lifts, setLifts] = useState<Record<string, number>>({});
  const current = useMemo(() => reconcileOrder(order, defaults), [order, defaults]);

  useEffect(() => {
    if (dealing) dealtThisSession = true;
  }, [dealing]);

  // Envelope papers follow each trip's place in the default order.
  const paperIndex = useMemo(() => {
    const envelopes = trips.filter((t) => !onNowIds.has(t.id)).map((t) => t.id);
    return (id: string) => Math.max(0, envelopes.indexOf(id));
  }, [trips, onNowIds]);

  const byId = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);
  const count = current.length;

  const pass = () => setOrder(passToBack(current));
  const previous = () => {
    const next = backToFront(current);
    setOrder(next);
    setLifts((prev) => ({ ...prev, [next[0]]: (prev[next[0]] ?? 0) + 1 }));
  };
  const visible = Math.min(count, STACK_VISIBLE);
  const frontNumber = defaults.indexOf(current[0]) + 1;

  const onPress = (trip: TripListItem, actions: CardActions) => {
    const depth = current.indexOf(trip.id);
    if (depth > 0) {
      setOrder(bringToFront(current, trip.id));
      setLifts((prev) => ({ ...prev, [trip.id]: (prev[trip.id] ?? 0) + 1 }));
      return;
    }
    if (onNowIds.has(trip.id)) onOpenOnNow(trip, actions);
    else actions.bump(() => onOpenTrip(trip));
  };

  return (
    <View>
      <View style={[styles.stack, { height: stackHeight(count) }]}>
      {current.map((id, depth) => {
        const trip = byId.get(id);
        if (!trip) return null;
        const dealtFrom = defaults.indexOf(id);
        return (
          <StackCard
            key={id}
            trip={trip}
            depth={depth}
            count={count}
            onNow={onNowIds.has(id)}
            viewerId={viewerId}
            paperIndex={paperIndex(id)}
            focused={focused}
            collapsing={collapsing}
            dealIndex={dealing && dealtFrom < STACK_VISIBLE ? visible - 1 - dealtFrom : null}
            liftKey={lifts[id] ?? 0}
            onPress={onPress}
            onPass={pass}
            onPrevious={previous}
          />
        );
      })}
      </View>
      {count > 1 ? (
        <View style={styles.counter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppText role="kickerSm" tone="muted">
            SWIPE TO PASS
          </AppText>
          <AppText role="kickerSm" tone="secondary">
            {frontNumber} OF {count}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'relative' },
  card: { position: 'absolute' },
  counter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.s5,
    paddingHorizontal: spacing.s1,
  },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import { cardPress, dealCard, frontBump, shuffleLift } from '@/components/motion/keyframes';
import { hapticAfter } from '@/lib/haptics';
import { motion } from '@/theme';
import { EnvelopeFace } from './EnvelopeFace';
import { OnNowPostcard, type OnNowPostcardHandle } from './OnNowPostcard';
import { bringToFront, reconcileOrder, stackHeight, stackPosition } from './stack';
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
}: StackCardProps) {
  const { ms } = useMotion();
  const pos = stackPosition(depth, count);
  const top = useSharedValue(pos.top);
  const inset = useSharedValue(pos.inset);
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
      opacity: sampleTrack(keys.opacity, d, motion.easing.settle),
      transform: [
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
            sampleTrack(frontBump.rotate, b, motion.easing.standard)
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

  const behind = depth > 0;
  return (
    <Animated.View style={[styles.card, { zIndex: pos.z }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trip.name}
        accessibilityHint={behind ? 'Brings this envelope to the front' : undefined}
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
  );
}

interface MailStackProps {
  /** Up to four current trips, in the default order (on-now first). */
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
 * header of each card behind showing. They deal in back to front on the
 * session's first mount; tapping a card behind brings it to the front with a
 * lift, and tapping the front card opens it.
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
    <View style={[styles.stack, { height: stackHeight(count) }]}>
      {current.map((id, depth) => {
        const trip = byId.get(id);
        if (!trip) return null;
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
            dealIndex={dealing ? count - 1 - defaults.indexOf(id) : null}
            liftKey={lifts[id] ?? 0}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'relative' },
  card: { position: 'absolute' },
});

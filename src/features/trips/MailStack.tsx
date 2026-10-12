import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import { cardPress, dealCard, frontBump } from '@/components/motion/keyframes';
import { haptic, hapticAfter } from '@/lib/haptics';
import { motion } from '@/theme';
import { EnvelopeFace } from './EnvelopeFace';
import { OnNowPostcard, type OnNowPostcardHandle } from './OnNowPostcard';
import { selectedLayout, stackHeight, walletScrollOffset, walletTop, type CardSlot } from './stack';
import type { Rect } from './expandStore';
import type { TripListItem } from './hooks';

/** The deal plays once per app session, not on every focus. */
let dealtThisSession = false;

/** True until the session's first stack has dealt; read once per mount. */
export function shouldDeal(): boolean {
  return !dealtThisSession;
}

export interface CardActions {
  bump: (then: () => void) => void;
  press: () => void;
  measure: (done: (rects: { paper: Rect; window: Rect } | null) => void) => void;
}

type CardRole = 'stack' | 'front' | 'selected' | 'pile';

interface WalletCardProps {
  trip: TripListItem;
  index: number;
  count: number;
  slot: CardSlot;
  /** Delay before moving to a new slot (the pile drops in card by card). */
  slotDelay: number;
  z: number;
  role: CardRole;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  focused: boolean;
  collapsing: boolean;
  /** 0 = resting stack (scroll effects on), 1 = a card is selected. */
  mode: SharedValue<number>;
  scrollY: SharedValue<number>;
  /** The stack's top inside the scroll content. */
  stackY: number;
  /** Deal order from the top (0 = back), or null when not dealing. */
  dealIndex: number | null;
  onPress: (trip: TripListItem, actions: CardActions) => void;
}

const HINTS: Record<CardRole, string | undefined> = {
  stack: 'Shows this trip',
  front: undefined,
  selected: 'Opens the trip',
  pile: 'Back to all your trips',
};

function WalletCard({
  trip,
  index,
  count,
  slot,
  slotDelay,
  z,
  role,
  onNow,
  viewerId,
  paperIndex,
  focused,
  collapsing,
  mode,
  scrollY,
  stackY,
  dealIndex,
  onPress,
}: WalletCardProps) {
  const { ms } = useMotion();
  const top = useSharedValue(slot.top);
  const inset = useSharedValue(slot.inset);
  const postcard = useRef<OnNowPostcardHandle>(null);
  const deal = useTimeline(dealIndex === null ? 1 : 0);
  const bump = useTimeline(1);
  const press = useTimeline(1);
  const keys = useMemo(() => dealCard(dealIndex ?? 0), [dealIndex]);
  const restTop = walletTop(index);
  const frontTop = walletTop(count - 1);

  // Every move between the stack, the top and the pile takes 520 ms (stack).
  useEffect(() => {
    const config = { duration: ms(motion.duration.drop), easing: easing('stack') };
    top.value = withDelay(ms(slotDelay), withTiming(slot.top, config));
    inset.value = withDelay(ms(slotDelay), withTiming(slot.inset, config));
  }, [slot.top, slot.inset, slotDelay, top, inset, ms]);

  useEffect(() => {
    if (dealIndex === null) return;
    const delay = motion.choreo.home.dealBase + dealIndex * motion.stagger.deal;
    deal.run(motion.duration.deal, delay);
    return hapticAfter('light', ms(delay + motion.choreo.home.dealContact));
    // Mount only: the deal plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const d = deal.p.value;
    const b = bump.p.value;
    // Resting, the stack follows the scroll: cards stick at the top and pile
    // up, or fan apart when pulled down. Selected, it holds still.
    const scrolled = walletScrollOffset(index, restTop, scrollY.value - stackY, frontTop);
    return {
      top: top.value + (1 - mode.value) * scrolled,
      left: inset.value,
      right: inset.value,
      opacity: sampleTrack(keys.opacity, d, motion.easing.settle),
      transform: [
        {
          translateY:
            sampleTrack(keys.translateY, d, motion.easing.settle) +
            sampleTrack(frontBump.translateY, b, motion.easing.standard),
        },
        {
          rotate: `${
            sampleTrack(keys.rotate, d, motion.easing.settle) + sampleTrack(frontBump.rotate, b, motion.easing.standard)
          }deg`,
        },
        {
          scale:
            sampleTrack(keys.scale, d, motion.easing.settle) *
            sampleTrack(cardPress.scale, press.p.value, motion.easing.standard),
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

  const shown = role === 'front' || role === 'selected';
  return (
    <Animated.View style={[styles.card, { zIndex: z }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trip.name}
        accessibilityHint={HINTS[role]}
        onPress={() => onPress(trip, actions)}
      >
        {onNow ? (
          <OnNowPostcard
            ref={postcard}
            trip={trip}
            viewerId={viewerId}
            front={shown && focused}
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
  /** Every current trip, in the default order (on-now first). */
  trips: TripListItem[];
  onNowIds: Set<string>;
  viewerId: string | null;
  focused: boolean;
  collapsing: boolean;
  /** Deal this mount (the session's first stack). */
  dealing: boolean;
  scrollY: SharedValue<number>;
  /** The stack's top inside the scroll content. */
  stackY: number;
  /** Viewport height below the stack's top when a card is selected. */
  room: number;
  /** A card was selected (true) or the stack came back (false). */
  onSelectedChange: (selected: boolean) => void;
  /** Opening the on-now postcard: expand into the trip. */
  onOpenOnNow: (trip: TripListItem, actions: CardActions) => void;
  /** Opening any other trip, after its bump. */
  onOpenTrip: (trip: TripListItem) => void;
}

/**
 * The Home mail stack, Wallet style (Airmail v4 · 01). Every current trip is
 * stacked with only its 38 pt header row peeking, the front card fully shown
 * at the bottom; Home scrolls through it, with the cards sticking and piling
 * at the top as they go. Tapping a card lifts it to the top fully shown and
 * drops the rest into a pile at the bottom of the screen; tapping it again
 * opens the trip, and tapping the pile (or back) returns to the stack. The
 * stack deals in back to front on the session's first mount.
 */
export function MailStack({
  trips,
  onNowIds,
  viewerId,
  focused,
  collapsing,
  dealing,
  scrollY,
  stackY,
  room,
  onSelectedChange,
  onOpenOnNow,
  onOpenTrip,
}: MailStackProps) {
  const { ms } = useMotion();
  // Top to bottom: the front card (on now, else the soonest) is last.
  const cards = useMemo(() => [...trips].reverse(), [trips]);
  const count = cards.length;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? cards.findIndex((t) => t.id === selectedId) : -1;
  const mode = useSharedValue(0);

  useEffect(() => {
    if (dealing) dealtThisSession = true;
  }, [dealing]);

  useEffect(() => {
    mode.value = withTiming(selected >= 0 ? 1 : 0, { duration: ms(motion.duration.drop), easing: easing('stack') });
  }, [selected, mode, ms]);

  // A trip that disappears (deleted, left) can't stay selected.
  useEffect(() => {
    if (selectedId && selected < 0) {
      setSelectedId(null);
      onSelectedChange(false);
    }
  }, [selectedId, selected, onSelectedChange]);

  const choose = (id: string | null) => {
    haptic('selection');
    setSelectedId(id);
    onSelectedChange(id !== null);
  };

  // Android back puts a selected card back in the stack.
  useEffect(() => {
    if (selected < 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      choose(null);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Envelope papers follow each trip's place in the default order.
  const paperIndex = useMemo(() => {
    const envelopes = trips.filter((t) => !onNowIds.has(t.id)).map((t) => t.id);
    return (id: string) => Math.max(0, envelopes.indexOf(id));
  }, [trips, onNowIds]);

  const slots =
    selected >= 0 ? selectedLayout(count, selected, room) : cards.map((_, i) => ({ top: walletTop(i), inset: 0 }));

  const open = (trip: TripListItem, actions: CardActions) => {
    if (onNowIds.has(trip.id)) onOpenOnNow(trip, actions);
    else actions.bump(() => onOpenTrip(trip));
  };

  const onPress = (trip: TripListItem, actions: CardActions) => {
    const index = cards.indexOf(trip);
    if (selected < 0) {
      // The front card is already fully shown: open it straight away.
      if (index === count - 1) open(trip, actions);
      else choose(trip.id);
      return;
    }
    if (index === selected) open(trip, actions);
    else choose(null);
  };

  let pilePlace = 0;
  return (
    <View style={[styles.stack, { height: stackHeight(count) }]}>
      {cards.map((trip, index) => {
        const role: CardRole =
          selected < 0 ? (index === count - 1 ? 'front' : 'stack') : index === selected ? 'selected' : 'pile';
        const place = role === 'pile' ? pilePlace++ : 0;
        return (
          <WalletCard
            key={trip.id}
            trip={trip}
            index={index}
            count={count}
            slot={slots[index]}
            slotDelay={role === 'pile' ? place * motion.choreo.home.pileStagger : 0}
            z={role === 'selected' ? count * 2 : role === 'pile' ? count + place : index}
            role={role}
            onNow={onNowIds.has(trip.id)}
            viewerId={viewerId}
            paperIndex={paperIndex(trip.id)}
            focused={focused}
            collapsing={collapsing}
            mode={mode}
            scrollY={scrollY}
            stackY={stackY}
            dealIndex={dealing ? index : null}
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

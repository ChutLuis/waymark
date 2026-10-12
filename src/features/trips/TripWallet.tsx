import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type RefObject } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Layers, Plus, X } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import { cardPress, dealCard, frontBump } from '@/components/motion/keyframes';
import { haptic, hapticAfter } from '@/lib/haptics';
import { iconStrokeWidth, motion, radius, shadows, spacing, useTheme } from '@/theme';
import { EnvelopeFace } from './EnvelopeFace';
import { OnNowPostcard, type OnNowPostcardHandle } from './OnNowPostcard';
import { STACK_CARD_HEIGHT, riseDelay, walletHeight, walletTop } from './stack';
import type { Rect } from './expandStore';
import type { TripListItem } from './hooks';

/** The deal plays once per app session, not on every focus. */
let dealtThisSession = false;

/** True until the session's first Home card has dealt; read once per mount. */
export function shouldDeal(): boolean {
  return !dealtThisSession;
}

/** Envelopes have no scene window: the trip header grows from their top band. */
const ENVELOPE_WINDOW = 150;
const CLOSE_SIZE = 44;

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

export interface HomeCardHandle {
  /** Window y of the Home card, where the stack rises from. */
  measureTop: (done: (y: number | null) => void) => void;
}

interface HomeCardProps {
  trip: TripListItem;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  focused: boolean;
  collapsing: boolean;
  /** Every current trip, for the hint under the card. */
  count: number;
  /** Hidden while the raised stack shows its own copy of this card. */
  hidden: boolean;
  dealing: boolean;
  onPress: (actions: CardActions) => void;
}

/**
 * The one card Home shows (on now, else the soonest trip). With more than one
 * trip, tapping it raises the whole stack; on its own, it opens the trip.
 */
export const HomeCard = forwardRef<HomeCardHandle, HomeCardProps>(function HomeCard(
  { trip, onNow, viewerId, paperIndex, focused, collapsing, count, hidden, dealing, onPress },
  ref,
) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const face = useRef<TripFaceHandle>(null);
  const wrap = useRef<View>(null);
  const { actions, style } = useCardActions(face);
  const deal = useTimeline(dealing ? 0 : 1);
  const keys = useMemo(() => dealCard(0), []);

  useEffect(() => {
    if (!dealing) return;
    dealtThisSession = true;
    deal.run(motion.duration.deal, motion.choreo.home.dealBase);
    return hapticAfter('light', ms(motion.choreo.home.dealBase + motion.choreo.home.dealContact));
    // Mount only: the deal plays once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    measureTop: (done) => {
      if (!wrap.current) done(null);
      else wrap.current.measureInWindow((_x, y, width) => done(width ? y : null));
    },
  }));

  const dealStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, deal.p.value, motion.easing.settle),
    transform: [
      { translateY: sampleTrack(keys.translateY, deal.p.value, motion.easing.settle) },
      { rotate: `${sampleTrack(keys.rotate, deal.p.value, motion.easing.settle)}deg` },
      { scale: sampleTrack(keys.scale, deal.p.value, motion.easing.settle) },
    ],
  }));

  return (
    <View>
      <Animated.View ref={wrap} collapsable={false} style={[dealStyle, hidden ? styles.hidden : null]}>
        <Animated.View style={style}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trip.name}
            accessibilityHint={count > 1 ? `Shows all ${count} trips` : undefined}
            onPress={() => onPress(actions)}
          >
            <TripFace
              ref={face}
              trip={trip}
              onNow={onNow}
              viewerId={viewerId}
              paperIndex={paperIndex}
              live={focused && !hidden}
              collapsing={collapsing}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
      {count > 1 ? (
        <View style={[styles.hint, hidden ? styles.hidden : null]}>
          <Layers size={14} color={colors.ink2} strokeWidth={iconStrokeWidth} />
          <AppText role="kickerSm" tone="secondary">
            {count} TRIPS · TAP TO SEE ALL
          </AppText>
        </View>
      ) : null}
    </View>
  );
});

function RisingCard({
  trip,
  index,
  count,
  fromTop,
  closing,
  onNow,
  viewerId,
  paperIndex,
  live,
  collapsing,
  onPress,
}: {
  trip: TripListItem;
  index: number;
  count: number;
  /** Where the Home card sits, relative to the top of the stack. */
  fromTop: number;
  closing: boolean;
  onNow: boolean;
  viewerId: string | null;
  paperIndex: number;
  live: boolean;
  collapsing: boolean;
  onPress: (trip: TripListItem, actions: CardActions) => void;
}) {
  const { ms } = useMotion();
  const face = useRef<TripFaceHandle>(null);
  const { actions, style: pressStyle } = useCardActions(face);
  const up = useSharedValue(0);
  const isFront = index === count - 1;
  // Every card starts where the Home card sits, behind it.
  const rise = fromTop - walletTop(index);

  useEffect(() => {
    const delay = ms(riseDelay(index, count, motion.choreo.home.riseStagger));
    up.value = closing
      ? withTiming(0, { duration: ms(motion.duration.pop), easing: easing('exit') })
      : withDelay(delay, withTiming(1, { duration: ms(motion.duration.drop), easing: easing('stack') }));
  }, [closing, index, count, up, ms]);

  // The front card travels from the Home card to the bottom of the stack; the
  // ones above it come up from behind it and fade in as they clear it.
  const style = useAnimatedStyle(() => ({
    opacity: isFront ? 1 : Math.min(1, up.value * 3),
    transform: [{ translateY: (1 - up.value) * rise }],
  }));

  return (
    <Animated.View style={[styles.card, { top: walletTop(index), zIndex: index }, style]}>
      <Animated.View style={pressStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={trip.name} accessibilityHint="Opens the trip" onPress={() => onPress(trip, actions)}>
          <TripFace
            ref={face}
            trip={trip}
            onNow={onNow}
            viewerId={viewerId}
            paperIndex={paperIndex}
            live={live && isFront}
            collapsing={collapsing}
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

interface TripStackProps {
  /** Every current trip, in the default order (on-now first). */
  trips: TripListItem[];
  onNowIds: Set<string>;
  viewerId: string | null;
  paperIndex: (id: string) => number;
  focused: boolean;
  collapsing: boolean;
  /** Window y of the Home card the stack rises from. */
  fromY: number;
  onOpen: (trip: TripListItem, actions: CardActions) => void;
  onNewTrip: () => void;
  /** The stack has fully put itself away. */
  onClosed: () => void;
}

/**
 * Every current trip raised out of the Home card, Wallet style: the cards
 * rise from behind it into a vertical stack, each peeking above the next and
 * the front card fully shown at the bottom. Tapping a trip opens it,
 * expanding from its card; the close button (or back) lowers them again.
 */
export function TripStack({
  trips,
  onNowIds,
  viewerId,
  paperIndex,
  focused,
  collapsing,
  fromY,
  onOpen,
  onNewTrip,
  onClosed,
}: TripStackProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { ms } = useMotion();
  const [closing, setClosing] = useState(false);
  const shade = useSharedValue(0);
  // Top to bottom: the front card (on now, else the soonest) is last.
  const cards = useMemo(() => [...trips].reverse(), [trips]);
  const count = cards.length;
  const contentTop = insets.top + CLOSE_SIZE + spacing.s3;

  useEffect(() => {
    haptic('selection');
    shade.value = withTiming(1, { duration: ms(motion.duration.base), easing: easing('standard') });
  }, [shade, ms]);

  const close = () => {
    if (closing) return;
    haptic('selection');
    setClosing(true);
    shade.value = withDelay(
      ms(motion.duration.pop - motion.duration.base),
      withTiming(0, { duration: ms(motion.duration.base) }, (done) => {
        if (done) runOnJS(onClosed)();
      }),
    );
  };

  // Android back lowers the stack, but only while Home is the focused screen.
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, closing]);

  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={closing ? 'none' : 'auto'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, shadeStyle]} />
      <Animated.View style={[styles.topBar, { paddingTop: insets.top }, shadeStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close all trips"
          onPress={close}
          style={({ pressed }) => [styles.close, { backgroundColor: colors.paper, boxShadow: shadows.pill }, pressed && styles.pressed]}
        >
          <X size={22} color={colors.ink} strokeWidth={iconStrokeWidth} />
        </Pressable>
        <AppText role="kicker" tone="secondary">
          ALL TRIPS · {count}
        </AppText>
        <View style={styles.close} />
      </Animated.View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: contentTop, paddingBottom: insets.bottom + spacing.s12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.stack, { height: walletHeight(count) }]}>
          {cards.map((trip, index) => (
            <RisingCard
              key={trip.id}
              trip={trip}
              index={index}
              count={count}
              fromTop={fromY - contentTop}
              closing={closing}
              onNow={onNowIds.has(trip.id)}
              viewerId={viewerId}
              paperIndex={paperIndex(trip.id)}
              live={focused}
              collapsing={collapsing}
              onPress={onOpen}
            />
          ))}
        </View>
        <Animated.View style={shadeStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New trip"
            onPress={onNewTrip}
            style={({ pressed }) => [styles.newTrip, pressed && styles.pressed]}
          >
            <Plus size={16} color={colors.ink} strokeWidth={2.4} />
            <AppText role="link">New trip</AppText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.s5,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
    paddingHorizontal: spacing.s7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  stack: { marginHorizontal: spacing.cardGutter },
  card: { position: 'absolute', left: 0, right: 0, height: STACK_CARD_HEIGHT },
  newTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: spacing.s7,
  },
  pressed: { opacity: 0.7 },
});

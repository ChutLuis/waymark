import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { BrandMark } from '@/components/BrandMark';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { easing, sampleTrack, useEntrance, useMotion } from '@/components/motion';
import { greetingRise } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { AvatarStamp } from '@/features/trips/SceneStamp';
import { MailStack, shouldDeal, type CardActions } from '@/features/trips/MailStack';
import { Shoebox } from '@/features/trips/Shoebox';
import { WALLET } from '@/features/trips/stack';
import { TripCardSkeleton } from '@/features/trips/TripCardSkeleton';
import { homeCovered, isCollapsing, onCollapsingChange, setExpandOrigin } from '@/features/trips/expandStore';
import { markShellOpening } from '@/features/trips/shellMotion';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { splitTrips } from '@/features/trips/sort';
import { greetingFor } from '@/features/trips/destinations';
import { useMyProfile } from '@/features/auth/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { motion, radius, shadows, spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';

/** Home underneath an open trip: scaled to .93 about (50%, 45%), dimmed 12%. */
const HOME_COVERED_SCALE = 0.07;
const HOME_COVERED_DIM = 0.12;

function isOnNow(trip: TripListItem, today: string): boolean {
  if (!trip.startDate || !trip.endDate) return false;
  return trip.startDate <= today && today <= trip.endDate;
}

function Greeting({ firstName, dealing }: { firstName: string; dealing: boolean }) {
  const p = useEntrance(motion.duration.rise, 0, dealing);
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(greetingRise.opacity, p.value, motion.easing.standard),
    transform: [{ translateY: sampleTrack(greetingRise.translateY, p.value, motion.easing.standard) }],
  }));
  return (
    <Animated.View style={[styles.titleBlock, style]}>
      <AppText role="display">Your trips</AppText>
      <AppText role="meta" tone="secondary" style={styles.greeting}>
        {greetingFor(new Date(), firstName)}
      </AppText>
    </Animated.View>
  );
}

export default function TripsListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useAuth();
  const isFocused = useIsFocused();
  const trips = useTrips();
  const profile = useMyProfile();
  const [collapsing, setCollapsingState] = useState(isCollapsing);
  useEffect(() => onCollapsingChange(setCollapsingState), []);

  const isWide = width >= 720;
  const today = toDateOnly(new Date());

  const { stack, onNowIds, past } = useMemo(() => {
    const all = trips.data ?? [];
    const { current, past } = splitTrips(all, today);
    const onNow = current.filter((t) => isOnNow(t, today));
    const upcoming = current.filter((t) => !isOnNow(t, today));
    const ordered = [...onNow, ...upcoming];
    return {
      stack: ordered,
      onNowIds: new Set(onNow.map((t) => t.id)),
      past,
    };
  }, [trips.data, today]);

  const firstName = (profile.data?.displayName ?? '').split(' ')[0] || 'traveler';
  const hasTrips = stack.length > 0 || past.length > 0;
  // Deal once per session, when the stack first shows with data.
  const [dealing] = useState(shouldDeal);

  const openOnNow = (trip: TripListItem, actions: CardActions) => {
    haptic('selection');
    actions.press();
    actions.measure((rects) => {
      if (rects) setExpandOrigin({ tripId: trip.id, ...rects, at: Date.now() });
      markShellOpening();
      router.push(`/trips/${trip.id}` as never);
    });
  };

  const openTrip = (trip: TripListItem) => {
    markShellOpening();
    router.push(`/trips/${trip.id}` as never);
  };

  // The wallet: the stack follows the scroll, and a selected card locks it,
  // with the stack's top just under the top of the screen and the rest of
  // Home faded behind the pile.
  const { ms } = useMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [viewport, setViewport] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [stackY, setStackY] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const below = useSharedValue(1);
  // Scroll as far as the content allows towards the stack's top; the pile
  // goes in whatever room that leaves below it.
  const selectScroll = Math.max(0, Math.min(stackY - WALLET.selectedMargin, contentHeight - viewport));
  const room = viewport - (stackY - selectScroll);
  const onSelectedChange = useCallback(
    (on: boolean) => {
      setSelecting(on);
      below.value = withTiming(on ? 0 : 1, { duration: ms(motion.duration.base), easing: easing('standard') });
      if (on) scrollRef.current?.scrollTo({ y: selectScroll, animated: true });
    },
    [below, ms, scrollRef, selectScroll],
  );
  const belowStyle = useAnimatedStyle(() => ({ opacity: below.value }));

  const coveredStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - HOME_COVERED_SCALE * homeCovered.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: homeCovered.value * HOME_COVERED_DIM }));

  return (
    <Animated.View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }, coveredStyle]}>
      <ScreenStatusBar />
      <View style={[styles.column, isWide && styles.columnWide]}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark />
            <AppText role="wordmark">Waymark</AppText>
          </View>
          <View style={styles.headerActions}>
            {hasTrips ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New trip"
                onPress={() => router.push('/trips/new')}
                style={({ pressed }) => [
                  styles.newTrip,
                  { backgroundColor: colors.ink, boxShadow: shadows.pill },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={18} color={colors.paper} strokeWidth={2.4} />
                <AppText role="pillLabel" style={{ color: colors.paper }}>
                  New trip
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile and settings"
              onPress={() => router.push('/profile')}
              style={({ pressed }) => [styles.avatarTarget, pressed && styles.pressed]}
            >
              <AvatarStamp
                size="sm"
                initial={(firstName[0] ?? '?').toUpperCase()}
                avatarPath={profile.data?.avatarPath ?? null}
              />
            </Pressable>
          </View>
        </View>

        <Greeting firstName={firstName} dealing={dealing && hasTrips} />

        <OfflineBanner />

        {trips.isPending ? (
          <View style={styles.list}>
            <TripCardSkeleton withCover />
            <View style={styles.skeletonGap} />
            <TripCardSkeleton />
            <View style={styles.skeletonGap} />
            <TripCardSkeleton />
          </View>
        ) : trips.isError ? (
          <ErrorState title="Couldn't load your trips" onRetry={() => trips.refetch()} />
        ) : !hasTrips ? (
          <EmptyState
            title="Somewhere to be?"
            body="Start a trip and invite the person you're going with — or join theirs with an invite code."
            actionLabel="Start a trip"
            onAction={() => router.push('/trips/new')}
          >
            <Button
              label="I have an invite code"
              variant="quiet"
              onPress={() => router.push('/join')}
              style={styles.emptySecondary}
            />
          </EmptyState>
        ) : (
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollEnabled={!selecting}
            onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setContentHeight(h)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.s12 }]}
            showsVerticalScrollIndicator={false}
          >
            {stack.length > 0 ? (
              <View style={styles.stackWrap} onLayout={(e) => setStackY(e.nativeEvent.layout.y)}>
                <MailStack
                  trips={stack}
                  onNowIds={onNowIds}
                  viewerId={userId}
                  focused={isFocused}
                  collapsing={collapsing}
                  dealing={dealing}
                  scrollY={scrollY}
                  stackY={stackY}
                  room={room}
                  onSelectedChange={onSelectedChange}
                  onOpenOnNow={openOnNow}
                  onOpenTrip={openTrip}
                />
              </View>
            ) : null}
            <Animated.View style={belowStyle} pointerEvents={selecting ? 'none' : 'auto'}>
            <Shoebox past={past} dealing={dealing} onOpen={openTrip} />
            <View style={styles.inviteRow}>
              <AppText role="bodySm" tone="secondary">
                Have an invite code?
              </AppText>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Enter an invite code"
                onPress={() => router.push('/join')}
                hitSlop={12}
              >
                <AppText role="link" style={styles.inviteLink}>
                  Enter it
                </AppText>
              </Pressable>
            </View>
            </Animated.View>
          </Animated.ScrollView>
        )}
      </View>
      <Animated.View pointerEvents="none" style={[styles.dim, { backgroundColor: colors.ink }, dimStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, transformOrigin: '50% 45%' },
  column: { flex: 1 },
  columnWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: {
    height: 52,
    paddingLeft: 22,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newTrip: {
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarTarget: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  titleBlock: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  greeting: { marginTop: 2, fontSize: 17, lineHeight: 22 },
  list: { paddingHorizontal: spacing.cardGutter, paddingTop: spacing.s7 },
  skeletonGap: { height: spacing.s5 },
  listContent: { paddingTop: spacing.s10 },
  // Above the shoebox, so the pile can sit over it while a card is selected.
  stackWrap: { marginHorizontal: spacing.cardGutter, zIndex: 1 },
  emptySecondary: { marginTop: spacing.s3 },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    paddingTop: spacing.s12,
  },
  inviteLink: { textDecorationLine: 'underline' },
  dim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});

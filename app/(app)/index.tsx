import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { BrandMark } from '@/components/BrandMark';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { sampleTrack, useEntrance, useMotion } from '@/components/motion';
import { greetingRise } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { AvatarStamp } from '@/features/trips/SceneStamp';
import {
  HomeCard,
  getSessionHomeTrip,
  setSessionHomeTrip,
  shouldDeal,
  type CardActions,
  type HomeDeal,
} from '@/features/trips/TripWallet';
import { TripRail } from '@/features/trips/TripRail';
import { Shoebox } from '@/features/trips/Shoebox';
import { TripCardSkeleton } from '@/features/trips/TripCardSkeleton';
import {
  albumSheet,
  homeCovered,
  isCollapsing,
  onCollapsingChange,
  primeShell,
  setExpandOrigin,
} from '@/features/trips/expandStore';
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
/** Under the shoebox album Home slides 80 pt left and dims to 86%. */
const ALBUM_SHIFT = 80;
const ALBUM_DIM = 0.14;

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

  // Opening a trip from a card: it expands out of that card.
  const openFromCard = (trip: TripListItem, actions: CardActions) => {
    haptic('selection');
    actions.press();
    actions.measure((rects) => {
      if (rects) setExpandOrigin({ tripId: trip.id, ...rects, at: Date.now() });
      primeShell(rects !== null);
      markShellOpening();
      // On the next frame, so the card shows its press before building the
      // trip's views holds off drawing.
      requestAnimationFrame(() => router.push(`/trips/${trip.id}` as never));
    });
  };

  // Home shows one trip; the rail picks another. The pick lasts while the app
  // runs; each launch starts on the on-now (else the soonest) trip.
  const { ms } = useMotion();
  const [picked, setPicked] = useState<string | null>(getSessionHomeTrip);
  const [under, setUnder] = useState<string | null>(null);
  const lastPick = useRef<string | null>(null);
  const underTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (underTimer.current) clearTimeout(underTimer.current);
  }, []);
  const front = stack.find((t) => t.id === picked) ?? stack[0];
  const underTrip = under && under !== front?.id ? stack.find((t) => t.id === under) : undefined;

  // A pick deals the new card onto the old one, which stays underneath until
  // it is covered at 640 ms. A pick mid-deal leaves the dealing card at rest.
  const pick = (trip: TripListItem) => {
    if (!front || trip.id === front.id) return;
    haptic('selection');
    if (underTimer.current) clearTimeout(underTimer.current);
    lastPick.current = trip.id;
    setUnder(front.id);
    setPicked(trip.id);
    setSessionHomeTrip(trip.id);
    underTimer.current = setTimeout(() => setUnder(null), ms(motion.duration.deal));
  };
  const frontDeal: HomeDeal = front && lastPick.current === front.id ? 'pick' : dealing ? 'launch' : null;

  // Envelope papers follow each trip's place in the default order.
  const paperIndex = useMemo(() => {
    const envelopes = stack.filter((t) => !onNowIds.has(t.id)).map((t) => t.id);
    return (id: string) => Math.max(0, envelopes.indexOf(id));
  }, [stack, onNowIds]);

  const coveredStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -ALBUM_SHIFT * albumSheet.value },
      { scale: 1 - HOME_COVERED_SCALE * homeCovered.value },
    ],
  }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: Math.max(homeCovered.value * HOME_COVERED_DIM, albumSheet.value * ALBUM_DIM),
  }));

  const openAlbum = () => {
    haptic('selection');
    router.push('/shoebox' as never);
  };

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
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.s12 }]}
            showsVerticalScrollIndicator={false}
          >
            {front ? (
              <View style={styles.stackWrap}>
                {/* One keyed list, so the card being replaced stays mounted as it is. */}
                {[underTrip, front].map((trip) => {
                  if (!trip) return null;
                  const isFront = trip.id === front.id;
                  return (
                    <View
                      key={trip.id}
                      style={isFront ? undefined : styles.under}
                      pointerEvents={isFront ? 'auto' : 'none'}
                    >
                      <HomeCard
                        trip={trip}
                        onNow={onNowIds.has(trip.id)}
                        viewerId={userId}
                        paperIndex={paperIndex(trip.id)}
                        focused={isFocused}
                        collapsing={isFront && collapsing}
                        deal={isFront ? frontDeal : null}
                        onPress={(actions) => openFromCard(trip, actions)}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
            {front && stack.length > 1 ? (
              <View style={styles.rail}>
                <TripRail trips={stack} onNowIds={onNowIds} pickedId={front.id} dealing={dealing} onPick={pick} />
              </View>
            ) : null}
            <Shoebox past={past} dealing={dealing} onOpen={openAlbum} />
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
          </ScrollView>
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
  stackWrap: { marginHorizontal: spacing.cardGutter },
  // The card being replaced waits under the one being dealt.
  under: { position: 'absolute', left: 0, right: 0, top: 0 },
  rail: { marginTop: spacing.s7 },
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

import { useEffect, useMemo } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { PatternBand } from '@/components/airmail/PatternBand';
import { useReducedMotion } from '@/components/useReducedMotion';
import { useLazyAnimatedValue } from '@/components/useLazyAnimatedValue';
import { TripScene } from '@/features/trips/TripScene';
import { TripTabBar, type TripTab } from '@/features/trips/TripTabBar';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import {
  DESTINATION_INFO,
  matchDestination,
  type CountryKey,
} from '@/features/trips/destinations';
import { fontFamilies, radius, useTheme } from '@/theme';

/**
 * Trip detail shell: one shared header scene and the bottom tab bar stay
 * mounted while the tab panes swap underneath, so a failing pane never takes
 * the header down and the Lottie never remounts between tabs. On wide (web)
 * layouts the whole shell becomes a centered column.
 */
export default function TripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);

  const activeTab: TripTab = pathname.endsWith('/packing')
    ? 'packing'
    : pathname.endsWith('/notes')
      ? 'notes'
      : pathname.endsWith('/settings')
        ? 'trip'
        : 'plan';

  const isPlan = activeTab === 'plan';
  const country = useMemo(
    () => matchDestination(trip.data?.destination ?? null),
    [trip.data?.destination],
  );

  const isWide = width >= 720;

  const screenWidth = isWide ? Math.min(680, width) : width;

  // No art for this trip: show the README fallback banner on every tab.
  const hasArt = country !== null || Boolean(trip.data?.coverImagePath);

  // Scale the design's 196/104 hero heights by the column width so wide (web)
  // layouts don't show mostly sky; the safe-area floor keeps the header row
  // clear of the notch on native.
  const heroHeight = Math.max((196 / 390) * screenWidth, insets.top + 149);
  const collapsedHeight = hasArt
    ? Math.max((104 / 390) * screenWidth, insets.top + 57)
    : insets.top + 104;

  // Animate the header height without remounting the Lottie: it is a pure clip
  // over one mounted hero scene. The fallback banner never animates.
  const headerHeight = useLazyAnimatedValue(isPlan ? heroHeight : collapsedHeight);
  useEffect(() => {
    Animated.timing(headerHeight, {
      toValue: isPlan ? heroHeight : collapsedHeight,
      duration: reducedMotion || !hasArt ? 0 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isPlan, headerHeight, reducedMotion, heroHeight, collapsedHeight, hasArt]);

  const statusBarStyle: 'light' | 'dark' = country
    ? DESTINATION_INFO[country].statusBar
    : 'dark';

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.column, isWide && styles.columnWide]}>
        {trip.isPending ? (
          <View style={{ paddingTop: insets.top }}>
            <LoadingState />
          </View>
        ) : trip.isError && !trip.data ? (
          <View style={{ paddingTop: insets.top }}>
            <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />
          </View>
        ) : trip.data ? (
          <>
            <StatusBar style={statusBarStyle} />
            <Animated.View
              style={[styles.header, { height: headerHeight, backgroundColor: hasArt ? undefined : colors.paper }]}
            >
              {/* One hero scene, mounted once; the animated container clips it to
                  the collapsed height on the non-Plan tabs so the Lottie never
                  remounts. Positioned absolutely so the back row and avatars sit
                  over it. Unknown destinations show the README paper fallback. */}
              {hasArt ? (
                <TripScene
                  country={country}
                  coverImagePath={trip.data.coverImagePath}
                  crop="hero"
                  width={screenWidth}
                  height={heroHeight}
                  live
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={{ height: insets.top }} />
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to your trips"
                  onPress={() => router.replace('/')}
                  style={({ pressed }) => [
                    styles.backPill,
                    { backgroundColor: hasArt ? colors.glass : colors.bg },
                    pressed && styles.pressed,
                  ]}
                >
                  <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
                  <AppText role="body" style={{ fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 20 }}>
                    Trips
                  </AppText>
                </Pressable>
                <AvatarStack
                  profiles={(members.data ?? []).map((m) => m.profile)}
                  size={36}
                  surfaceColor={hasArt ? colors.glass : colors.paper}
                />
              </View>
              {hasArt && country ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.captionChip,
                    {
                      backgroundColor: colors.paper,
                      opacity: headerHeight.interpolate({
                        inputRange: [collapsedHeight, heroHeight],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  <AppText role="tag" style={{ letterSpacing: 0.8 }}>
                    {DESTINATION_INFO[country].chip}
                  </AppText>
                </Animated.View>
              ) : null}
            </Animated.View>
            <PatternBand
              pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'}
              height={isPlan ? 12 : 10}
            />
            <OfflineBanner />
            <View style={styles.pane}>
              <Slot />
            </View>
            <TripTabBar tripId={tripId} active={activeTab} />
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Destination art for the shell scene is resolved here; exported for the tab. */
export function destinationArt(country: CountryKey | null) {
  return country ? DESTINATION_ART[country] : null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1 },
  columnWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { overflow: 'hidden' },
  headerRow: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    height: 40,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  captionChip: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.chip,
  },
  pane: { flex: 1 },
  pressed: { opacity: 0.7 },
});
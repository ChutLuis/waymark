import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { fontFamilies, iconStrokeWidth, radius, spacing, useTheme } from '@/theme';

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

  // Animate the header height between 196 (Plan) and 104 (every other tab)
  // without remounting the Lottie: it is a pure clip over one mounted scene.
  const headerHeight = useLazyAnimatedValue(196);
  useEffect(() => {
    Animated.timing(headerHeight, {
      toValue: isPlan ? 196 : 104,
      duration: reducedMotion ? 0 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isPlan, headerHeight, reducedMotion]);

  const isWide = width >= 720;

  const screenWidth = isWide ? Math.min(680, width) : width;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.column, isWide && styles.columnWide]}>
        {trip.isPending ? (
          <View style={{ paddingTop: insets.top }}>
            <LoadingState />
          </View>
        ) : trip.isError ? (
          <View style={{ paddingTop: insets.top }}>
            <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />
          </View>
        ) : (
          <>
            <Animated.View style={[styles.header, { height: headerHeight }]}>
              <TripScene
                country={country}
                coverImagePath={trip.data.coverImagePath}
                crop={isPlan ? 'hero' : 'banner'}
                width={screenWidth}
                height={isPlan ? 196 : 104}
                live
              />
              <View style={{ height: insets.top }} />
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to your trips"
                  onPress={() => router.replace('/')}
                  style={({ pressed }) => [
                    styles.backPill,
                    { backgroundColor: colors.glass },
                    pressed && styles.pressed,
                  ]}
                >
                  <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
                  <AppText role="body" style={{ fontFamily: fontFamilies.semibold }}>
                    Trips
                  </AppText>
                </Pressable>
                <AvatarStack
                  profiles={(members.data ?? []).map((m) => m.profile)}
                  size={36}
                  surfaceColor={colors.glass}
                />
              </View>
              {isPlan && country ? (
                <View style={[styles.captionChip, { backgroundColor: colors.paper }]}>
                  <AppText role="tag" style={{ letterSpacing: 0.8 }}>
                    {DESTINATION_INFO[country].chip}
                  </AppText>
                </View>
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
        )}
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
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useIsFocused, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { PatternBand } from '@/components/airmail/PatternBand';
import { easing, useMotion } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { ShellTopBar } from '@/features/trips/ShellTopBar';
import { TripScene } from '@/features/trips/TripScene';
import { TripTabBar, type TripTab } from '@/features/trips/TripTabBar';
import { SHELL } from '@/features/trips/shellLayout';
import { setLastTab } from '@/features/trips/shellMotion';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import { DESTINATION_INFO, matchDestination, type CountryKey } from '@/features/trips/destinations';
import { motion, useTheme } from '@/theme';

/**
 * Trip detail shell: one shared header scene, the top bar and the floating
 * tab stub stay mounted while the tab panes swap underneath, so a failing pane
 * never takes the header down and the Lottie never remounts between tabs. On
 * wide (web) layouts the whole shell becomes a centered column.
 */
export default function TripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const { ms } = useMotion();

  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);

  const activeTab: TripTab = pathname.endsWith('/packing')
    ? 'packing'
    : pathname.endsWith('/notes')
      ? 'notes'
      : 'plan';
  useEffect(() => setLastTab(activeTab), [activeTab]);

  const isPlan = activeTab === 'plan';
  const country = useMemo(
    () => matchDestination(trip.data?.destination ?? null),
    [trip.data?.destination],
  );

  // The shell is always a centred column capped at 680, not only at ≥720: at
  // 680 (a tablet/desktop window) the full-bleed layout pushed the tab labels
  // to the window edges (N16). `screenWidth` is the column width the content
  // and hero must fit into.
  const screenWidth = Math.min(680, width);

  // No art for this trip: show the README fallback banner on every tab.
  const hasArt = country !== null || Boolean(trip.data?.coverImagePath);

  // Scale the design's 196/104 header heights by the column width so wide
  // (web) layouts don't show mostly sky; the safe-area floor keeps the top bar
  // clear of the notch on native.
  const heroHeight = Math.max((SHELL.heroHeight / 390) * screenWidth, insets.top + 149);
  // The 104 banner already includes the status bar. Without art every tab uses
  // this collapsed height (no 196 hero, no animation) so a Berlin/Narnia trip
  // doesn't open on a blank block.
  const collapsedHeight = Math.max((SHELL.bannerHeight / 390) * screenWidth, insets.top + 57);
  const targetHeight = hasArt && isPlan ? heroHeight : collapsedHeight;

  // On Plan the pane rides up over the header so the day stamps hang across
  // its bottom edge (y 156 of 196), but never over the top bar's buttons: the
  // short paper banner (no art) only lends the stamps' drop-in room, if that.
  const topBarBottom = insets.top + SHELL.topBarHeight;
  const planOverlap = !isPlan
    ? 0
    : [SHELL.dayStripOverhang + SHELL.dayStripDropRoom, SHELL.dayStripDropRoom].find(
        (overlap) => targetHeight - overlap >= topBarBottom,
      ) ?? 0;

  // Animate the header height on the UI thread without remounting the Lottie:
  // it is a pure clip over one mounted hero scene. The fallback banner never
  // animates.
  const headerHeight = useSharedValue(targetHeight);
  useEffect(() => {
    headerHeight.value = withTiming(targetHeight, {
      duration: hasArt ? ms(motion.duration.header) : 0,
      easing: easing('standard'),
    });
  }, [targetHeight, headerHeight, hasArt, ms]);
  const headerStyle = useAnimatedStyle(() => ({ height: headerHeight.value }));

  // Over art, follow the scene. Without art, follow the theme (dark icons in
  // light mode, light icons in dark) — the paper banner is light in light mode
  // and navy in dark mode (item 08, correction 2).
  const statusBarStyle: 'light' | 'dark' = country
    ? DESTINATION_INFO[country].statusBar
    : scheme === 'dark'
      ? 'light'
      : 'dark';

  const openTrip = () => {
    haptic('selection');
    router.push(`/trips/${tripId}/settings` as never);
  };

  return (
    <View
      testID="trip-shell"
      style={[
        styles.screen,
        { backgroundColor: colors.bg },
        // On web the root must equal the window height exactly so the tab bar's
        // bottom edge sits on the window's bottom edge (N16).
        Platform.OS === 'web' ? { height, maxHeight: height } : null,
      ]}
    >
      <View testID="trip-column" style={[styles.column, styles.columnClamped]}>
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
            {/* Only while focused, so the style doesn't outlive the screen. */}
            {isFocused ? <StatusBar style={statusBarStyle} /> : null}
            <Animated.View
              style={[styles.header, headerStyle, { backgroundColor: hasArt ? undefined : colors.paper }]}
            >
              {/* One hero scene, mounted once; the animated container clips it to
                  the collapsed height on Packing and Notes so the Lottie never
                  remounts. Unknown destinations show the README paper fallback.
                  It pauses while the Trip page covers the shell (unfocused). */}
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
              <ShellTopBar
                tripName={trip.data.name}
                members={(members.data ?? []).map((m) => m.profile)}
                overArt={hasArt}
                onBack={() => router.replace('/')}
                onOpenTrip={openTrip}
              />
              <PatternBand
                pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'}
                height={SHELL.bandHeight}
                style={styles.band}
              />
            </Animated.View>
            <OfflineBanner />
            <View testID="trip-scroll-area" style={[styles.pane, { marginTop: -planOverlap }]}>
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
  // overflow hidden: anything taller than the window is clipped here, and the
  // tab's own ScrollView does the scrolling, so the tab bar never leaves the
  // window's bottom edge (N16).
  screen: { flex: 1, minHeight: 0, overflow: 'hidden' },
  column: { flex: 1, minHeight: 0 },
  // Keep the shell inside a centred 680 column at every width so the tab bar
  // and content never run past the window (N16).
  columnClamped: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // minHeight 0 lets the tab's scroller shrink below its content on web, so the
  // tab bar stays on the window's bottom edge (N16).
  pane: { flex: 1, minHeight: 0 },
});

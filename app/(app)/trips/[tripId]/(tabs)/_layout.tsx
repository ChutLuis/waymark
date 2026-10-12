import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useIsFocused, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { PatternBand } from '@/components/airmail/PatternBand';
import { easing, sampleTrack, useMotion, useTimeline } from '@/components/motion';
import { tabBarRise, topBarSettle } from '@/components/motion/keyframes';
import { haptic } from '@/lib/haptics';
import { ShellTopBar } from '@/features/trips/ShellTopBar';
import { TripScene } from '@/features/trips/TripScene';
import { TripTabBar, type TripTab } from '@/features/trips/TripTabBar';
import { SHELL } from '@/features/trips/shellLayout';
import { setLastTab } from '@/features/trips/shellMotion';
import {
  clearExpandOrigin,
  homeCovered,
  registerShellCloser,
  reveal,
  setCollapsing,
  shellContent,
  shellPush,
  takeFreshOrigin,
  tripSheet,
} from '@/features/trips/expandStore';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import {
  CROPS,
  DESTINATION_INFO,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  cropTransform,
  matchDestination,
  type CountryKey,
} from '@/features/trips/destinations';
import { motion, radius, useTheme } from '@/theme';

/** Under the Trip page the shell slides 80 pt left and dims to 86%. */
const SHEET_SHIFT = 80;
const SHEET_DIM = 0.14;

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/**
 * Trip detail shell: one shared header scene, the top bar and the floating
 * tab stub stay mounted while the tab panes swap underneath, so a failing pane
 * never takes the header down and the Lottie never remounts between tabs. On
 * wide (web) layouts the whole shell becomes a centered column.
 *
 * Opened from the Home postcard (Airmail v4 · 02), the shell grows out of the
 * card: its clip runs from the card's paper to the screen, the paper turns to
 * the airmail ground, and the header grows from the card's scene window with a
 * cover crop all the way, while Home scales back underneath. Going back runs
 * the same morph in reverse. Opened any other way it pushes and pops.
 */
export default function TripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const { width: winW, height: winH } = useWindowDimensions();
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
  const screenWidth = Math.min(680, winW);
  const columnX = (winW - screenWidth) / 2;

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

  // ——— Opening: expand from the Home postcard, or push. ———
  const [origin] = useState(() => takeFreshOrigin(tripId));
  const topBarIn = useTimeline(origin ? 0 : 1);
  const bandIn = useTimeline(origin ? 0 : 1);
  const tabBarIn = useTimeline(origin ? 0 : 1);

  // The transition starts on the shell's first layout rather than on mount,
  // so a slow first paint can't eat the expand: Home primed its first frame
  // at the card (or off-screen right).
  const started = useRef(false);
  const startOpening = () => {
    if (started.current) return;
    started.current = true;
    const { expand } = motion.choreo;
    if (origin) {
      const config = { duration: ms(motion.duration.expand), easing: easing('standard') };
      reveal.value = 0;
      shellContent.value = 0;
      shellPush.value = 1;
      reveal.value = withTiming(1, config);
      homeCovered.value = withTiming(1, config);
      shellContent.value = withDelay(ms(expand.contentAt), withTiming(1, { duration: ms(expand.content) }));
      topBarIn.run(expand.topBar, expand.topBarAt);
      bandIn.run(expand.band, expand.bandAt);
      tabBarIn.run(expand.tabBar, expand.tabBarAt);
    } else {
      reveal.value = 1;
      shellContent.value = 1;
      shellPush.value = 0;
      shellPush.value = withTiming(1, { duration: ms(motion.duration.push), easing: easing('standard') });
    }
  };

  // ——— Closing: collapse back onto the card, or pop. ———
  useEffect(
    () =>
      registerShellCloser((finish) => {
        haptic('selection');
        const done = () => {
          finish();
          setCollapsing(false);
          clearExpandOrigin();
        };
        if (origin) {
          const config = { duration: ms(motion.duration.collapse), easing: easing('exit') };
          setCollapsing(true);
          shellContent.value = withTiming(0, { duration: ms(motion.choreo.expand.collapseContent) });
          homeCovered.value = withTiming(0, config);
          reveal.value = withTiming(0, config, (finished) => {
            if (finished) runOnJS(done)();
          });
        } else {
          shellPush.value = withTiming(
            0,
            { duration: ms(motion.duration.pop), easing: easing('exit') },
            (finished) => {
              if (finished) runOnJS(done)();
            },
          );
        }
      }),
    [origin, ms],
  );

  const paperColor = colors.paper;
  const bgColor = colors.bg;
  const clipStyle = useAnimatedStyle(() => {
    const e = reveal.value;
    const x = origin ? lerp(origin.paper.x, 0, e) : 0;
    const y = origin ? lerp(origin.paper.y, 0, e) : 0;
    return {
      left: x,
      top: y,
      width: origin ? lerp(origin.paper.width, winW, e) : winW,
      height: origin ? lerp(origin.paper.height, winH, e) : winH,
      borderRadius: origin ? lerp(radius.airmailInner, 0, e) : 0,
      transform: [{ translateX: (1 - shellPush.value) * winW - SHEET_SHIFT * tripSheet.value }],
    };
  });
  const sheetDimStyle = useAnimatedStyle(() => ({ opacity: SHEET_DIM * tripSheet.value }));
  const stageStyle = useAnimatedStyle(() => {
    const e = reveal.value;
    return {
      left: origin ? -lerp(origin.paper.x, 0, e) : 0,
      top: origin ? -lerp(origin.paper.y, 0, e) : 0,
      backgroundColor: interpolateColor(e, [0, 1], [paperColor, bgColor]),
    };
  });
  const headerStyle = useAnimatedStyle(() => {
    const e = origin ? reveal.value : 1;
    return {
      left: origin ? lerp(origin.window.x - columnX, 0, e) : 0,
      top: origin ? lerp(origin.window.y, 0, e) : 0,
      width: origin ? lerp(origin.window.width, screenWidth, e) : screenWidth,
      height: origin ? lerp(origin.window.height, headerHeight.value, e) : headerHeight.value,
    };
  });
  const spacerStyle = useAnimatedStyle(() => ({ height: headerHeight.value }));
  // The art keeps a cover crop of the growing frame, from the card's crop to
  // the hero's, so it never jumps at either end.
  const artStyle = useAnimatedStyle(() => {
    const e = origin ? reveal.value : 1;
    const frameW = origin ? lerp(origin.window.width, screenWidth, e) : screenWidth;
    const frameH = origin ? lerp(origin.window.height, heroHeight, e) : heroHeight;
    const from = CROPS.card;
    const to = CROPS.hero;
    const crop = {
      x: lerp(from.x, to.x, e),
      y: lerp(from.y, to.y, e),
      w: lerp(from.w, to.w, e),
      h: lerp(from.h, to.h, e),
    };
    const { scale, left, top } = cropTransform(crop, frameW, frameH);
    return { position: 'absolute', left, top, width: SCENE_WIDTH * scale, height: SCENE_HEIGHT * scale };
  });
  const contentStyle = useAnimatedStyle(() => ({ opacity: shellContent.value }));
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: shellContent.value,
    transform: [{ translateY: sampleTrack(topBarSettle.translateY, topBarIn.p.value, motion.easing.standard) }],
  }));
  const bandStyle = useAnimatedStyle(() => ({ opacity: bandIn.p.value }));
  const tabBarStyle = useAnimatedStyle(() => ({
    opacity: shellContent.value,
    transform: [{ translateY: sampleTrack(tabBarRise.translateY, tabBarIn.p.value, motion.easing.overshoot) }],
  }));

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

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View testID="trip-shell" style={styles.screen}>
      <Animated.View style={[styles.clip, clipStyle]} onLayout={startOpening}>
        <Animated.View
          style={[
            styles.stage,
            { width: winW, height: winH },
            // On web the root must equal the window height exactly so the tab
            // bar's bottom edge sits on the window's bottom edge (N16).
            Platform.OS === 'web' ? { maxHeight: winH } : null,
            stageStyle,
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
                <Animated.View style={spacerStyle} />
                <Animated.View
                  style={[styles.header, headerStyle, { backgroundColor: hasArt ? undefined : colors.paper }]}
                >
                  {/* One hero scene, mounted once; the animated container clips
                      it to the collapsed height on Packing and Notes so the
                      Lottie never remounts. Unknown destinations show the README
                      paper fallback. It pauses while the Trip page covers the
                      shell (unfocused). */}
                  {hasArt ? (
                    <TripScene
                      country={country}
                      coverImagePath={trip.data.coverImagePath}
                      crop="hero"
                      width={screenWidth}
                      height={heroHeight}
                      live
                      fill
                      artStyle={artStyle}
                    />
                  ) : null}
                  <View style={{ height: insets.top }} />
                  <ShellTopBar
                    tripName={trip.data.name}
                    members={(members.data ?? []).map((m) => m.profile)}
                    overArt={hasArt}
                    onBack={goHome}
                    onOpenTrip={openTrip}
                    style={topBarStyle}
                  />
                  <Animated.View style={[styles.band, bandStyle]}>
                    <PatternBand
                      pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'}
                      height={SHELL.bandHeight}
                    />
                  </Animated.View>
                </Animated.View>
                <Animated.View
                  testID="trip-scroll-area"
                  style={[styles.pane, { marginTop: -planOverlap }, contentStyle]}
                >
                  <OfflineBanner />
                  <View style={styles.slot}>
                    <Slot />
                  </View>
                </Animated.View>
                <Animated.View pointerEvents="box-none" style={[styles.tabBarLayer, tabBarStyle]}>
                  <TripTabBar tripId={tripId} active={activeTab} />
                </Animated.View>
              </>
            ) : null}
          </View>
          <Animated.View pointerEvents="none" style={[styles.dim, { backgroundColor: colors.ink }, sheetDimStyle]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Destination art for the shell scene is resolved here; exported for the tab. */
export function destinationArt(country: CountryKey | null) {
  return country ? DESTINATION_ART[country] : null;
}

const styles = StyleSheet.create({
  // The shell covers Home (a transparent modal) and draws its own ground.
  screen: { flex: 1, minHeight: 0 },
  clip: { position: 'absolute', overflow: 'hidden' },
  stage: { position: 'absolute' },
  column: { flex: 1, minHeight: 0 },
  // Keep the shell inside a centred 680 column at every width so the tab bar
  // and content never run past the window (N16).
  columnClamped: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { position: 'absolute', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // minHeight 0 lets the tab's scroller shrink below its content on web, so the
  // tab bar stays on the window's bottom edge (N16).
  pane: { flex: 1, minHeight: 0 },
  slot: { flex: 1, minHeight: 0 },
  tabBarLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  dim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});

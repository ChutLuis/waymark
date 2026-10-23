import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { useLazyAnimatedValue } from './useLazyAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { revealOffset } from './sheetReveal';
import { useReducedMotion } from './useReducedMotion';
import { confirmDestructive } from '@/lib/confirm';
import { hairlineWidth, hitTargetMin, motion, radius, shadows, spacing, useTheme } from '@/theme';

export interface DiscardConfirm {
  title: string;
  message: string;
  confirmLabel: string;
}

type Reveal = (target: View | null) => void;

const SheetRevealContext = createContext<Reveal>(() => {});

/**
 * Scrolls part of the surrounding sheet into view, e.g. a dropdown or calendar
 * that just opened, and keeps it there while the keyboard settles. Null
 * forgets the last target. Does nothing outside a scrolling sheet.
 */
export function useSheetReveal(): Reveal {
  return useContext(SheetRevealContext);
}

/**
 * The header's title is centred between Cancel and the action pill; past this
 * text scale the three no longer fit across a phone and the title vanishes.
 */
const HEADER_TEXT_SCALE_MAX = 1.15;

/** Room kept around a revealed field. */
const REVEAL_MARGIN = spacing.s5;
/** A reveal also follows the viewport changes (the keyboard) this soon after. */
const REVEAL_SETTLE_MS = 800;

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /**
   * After the sheet has fully closed and its modal is gone. Open the next
   * sheet from here, not from onClose: iOS can't present a modal while another
   * one is still dismissing.
   */
  onClosed?: () => void;
  /**
   * While set, Cancel, the scrim and the system back ask before closing, so a
   * form with changes is not lost to a stray tap.
   */
  discardConfirm?: DiscardConfirm | null;
  /** A picker uses Back; a read-only sheet may use Done. */
  cancelLabel?: string;
  /** Lists own their scrolling, so they must not sit inside the form ScrollView. */
  bodyMode?: 'scroll' | 'static';
  /** Right-side header action, e.g. Save / Add / Create. */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** Paint the header action in the wax-red destructive colour (N20). */
  actionDestructive?: boolean;
  /** Confirmation sheets put a full-width title above their body actions. */
  headerLayout?: 'inline' | 'stacked';
  /**
   * `fit` sizes the card to its content (up to 92%). `tall` (New trip, design
   * 05) starts the card 9 pt under the status bar and runs it to the bottom,
   * with the empty space under the content. Wide layouts keep the centred card.
   */
  size?: 'fit' | 'tall';
  children: ReactNode;
}

/**
 * Bottom sheet used for all create/edit forms. On wide (web) layouts it
 * becomes a centered modal card per the design's web adaptation note.
 */
export function Sheet({
  visible,
  title,
  onClose,
  onClosed,
  discardConfirm = null,
  cancelLabel = 'Cancel',
  bodyMode = 'scroll',
  actionLabel,
  onAction,
  actionDisabled = false,
  actionDestructive = false,
  headerLayout = 'inline',
  size = 'fit',
  children,
}: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const isWide = width >= 720;
  const tall = size === 'tall' && !isWide;

  const progress = useLazyAnimatedValue(0);
  const [mounted, setMounted] = useState(visible);
  // Widths of the header's side buttons, so the centred title can clear them.
  const [sides, setSides] = useState({ left: 0, right: 0 });
  const sideWidth = Math.max(sides.left, sides.right);
  const onSideLayout = useCallback(
    (side: 'left' | 'right') => (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setSides((prev) => (prev[side] === width ? prev : { ...prev, [side]: width }));
    },
    [],
  );
  const closedRef = useRef(onClosed);
  useEffect(() => {
    closedRef.current = onClosed;
  }, [onClosed]);
  // After the commit that removed the modal, so the next sheet presents only
  // once this one is gone.
  const wasMounted = useRef(mounted);
  useEffect(() => {
    if (wasMounted.current && !mounted) closedRef.current?.();
    wasMounted.current = mounted;
  }, [mounted]);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  // Hairline under the header once the body scrolls beneath it (N39).
  const [scrolled, setScrolled] = useState(false);
  if (visible && !mounted) setMounted(true);
  if (!mounted && scrolled) setScrolled(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      // The fade and rise are decorative: Reduce Motion shows the sheet at once.
      duration: reducedMotion ? 0 : motion.duration.base,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!visible && finished) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress, reducedMotion]);

  const scrollRef = useRef<ScrollView | null>(null);
  const contentRef = useRef<View>(null);
  const scrollMetrics = useRef({ offset: 0, height: 0, contentHeight: 0 });
  const revealing = useRef<{ target: View; until: number } | null>(null);

  // The body's scroll view remounts when the sheet reopens or swaps between a
  // form and a static list: start its bookkeeping over each time.
  const attachScroll = useCallback((node: ScrollView | null) => {
    scrollRef.current = node;
    scrollMetrics.current = { offset: 0, height: 0, contentHeight: 0 };
    revealing.current = null;
  }, []);

  const scrollToTarget = useCallback(
    (target: View) => {
      const content = contentRef.current;
      if (!content) return;
      target.measureLayout(
        content,
        (_left, top, _width, height) => {
          const next = revealOffset({ top, height }, scrollMetrics.current, REVEAL_MARGIN);
          if (next !== null) scrollRef.current?.scrollTo({ y: next, animated: !reducedMotion });
        },
        () => {},
      );
    },
    [reducedMotion],
  );

  const reveal = useCallback<Reveal>(
    (target) => {
      revealing.current = target ? { target, until: Date.now() + REVEAL_SETTLE_MS } : null;
      if (target) requestAnimationFrame(() => scrollToTarget(target));
    },
    [scrollToTarget],
  );

  // A shrinking body can pull the offset back without a scroll event.
  const clampOffset = () => {
    const metrics = scrollMetrics.current;
    metrics.offset = Math.min(metrics.offset, Math.max(0, metrics.contentHeight - metrics.height));
  };

  const confirming = useRef(false);
  const requestClose = () => {
    if (!discardConfirm) {
      onClose();
      return;
    }
    if (confirming.current) return;
    confirming.current = true;
    void confirmDestructive(discardConfirm.title, discardConfirm.message, discardConfirm.confirmLabel).then(
      (discard) => {
        confirming.current = false;
        if (discard) onClose();
      },
    );
  };

  if (!mounted) return null;

  const translateY = reducedMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={requestClose}>
      {/* Light status text over the scrim while the sheet is open. Gated on the
          owning route's focus: a Modal left mounted under a pushed route (warm
          invite link, Plan → Add → invite) would otherwise keep light icons on
          the route above. When the route loses focus this entry unmounts and the
          root's theme style applies again (N24). */}
      {isFocused ? <StatusBar style="light" /> : null}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}
      >
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={requestClose} />
      </Animated.View>
      <KeyboardAvoidingView
        // Edge-to-edge (SDK 57) ignores adjustResize; Android needs an explicit
        // behaviour so the sheet's focused field clears the keyboard.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.host, isWide && styles.hostWide]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.bg,
              // Keep content above the gesture handle when the keyboard is
              // closed. When it is open, the card meets the keyboard (N19).
              paddingBottom: isWide
                ? spacing.s11
                : Platform.OS === 'ios'
                  ? Math.max(insets.bottom, spacing.s11) + spacing.s7
                  : keyboardVisible
                    ? 0
                    : insets.bottom + spacing.s3,
              opacity: progress,
              transform: [{ translateY }],
            },
            isWide ? styles.cardWide : styles.cardSheet,
            isWide && bodyMode === 'static' && styles.cardWideList,
            // The top stays put; with the keyboard up the host shrinks from the
            // bottom, so the card's bottom rises with it.
            tall ? [styles.cardTall, { marginTop: insets.top + TALL_TOP_GAP }] : styles.cardFit,
          ]}
        >
          {!isWide && <View style={[styles.grabber, { backgroundColor: colors.border }]} />}
          <View
            style={[
              styles.header,
              headerLayout === 'stacked' && styles.headerStacked,
              { borderBottomColor: scrolled && bodyMode === 'scroll' ? colors.divider : 'transparent' },
            ]}
          >
            {headerLayout === 'stacked' ? (
              <AppText role="sheetTitle" numberOfLines={1} maxFontSizeMultiplier={HEADER_TEXT_SCALE_MAX}>{title}</AppText>
            ) : (
              <>
                {/* The title is centred on the whole header and padded clear of the
                    wider side button, so it never wraps or pushes Create onto
                    two lines; a long title truncates instead. */}
                <View
                  pointerEvents="none"
                  style={[styles.headerTitleSlot, { paddingHorizontal: spacing.gutter + sideWidth + spacing.s3 }]}
                >
                  <AppText role="sheetTitle" numberOfLines={1} maxFontSizeMultiplier={HEADER_TEXT_SCALE_MAX}>
                    {title}
                  </AppText>
                </View>
                <View style={styles.headerSlot} onLayout={onSideLayout('left')}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={cancelLabel}
                    onPress={requestClose}
                    hitSlop={12}
                    style={({ pressed }) => [styles.headerCancel, pressed && styles.pressed]}
                  >
                    <AppText role="sheetCancel" numberOfLines={1} maxFontSizeMultiplier={HEADER_TEXT_SCALE_MAX}>{cancelLabel}</AppText>
                  </Pressable>
                </View>
                <View style={[styles.headerSlot, styles.headerSlotRight]} onLayout={onSideLayout('right')}>
                  {actionLabel && onAction ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={actionLabel}
                      accessibilityState={{ disabled: actionDisabled }}
                      disabled={actionDisabled}
                      onPress={onAction}
                      hitSlop={12}
                      style={({ pressed }) => [
                        styles.headerAction,
                        { backgroundColor: actionDisabled ? colors.divider : actionDestructive ? colors.wax : colors.ink },
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText role="sheetAction" numberOfLines={1} maxFontSizeMultiplier={HEADER_TEXT_SCALE_MAX} style={{ color: actionDisabled ? colors.ink2 : colors.paper }}>
                        {actionLabel}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </View>
          {bodyMode === 'static' ? (
            <View style={[styles.body, styles.bodyStatic, { paddingBottom: isWide ? spacing.s4 : spacing.s8 }]}>
              {children}
            </View>
          ) : (
            <ScrollView
              ref={attachScroll}
              style={tall && styles.bodyTall}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              // Keep the focused field above the keyboard: iOS adjusts insets, and
              // the extra scroll space below lets a bottom field scroll fully into
              // view (N19).
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollMetrics.current.offset = event.nativeEvent.contentOffset.y;
                const next = event.nativeEvent.contentOffset.y > 0;
                if (next !== scrolled) setScrolled(next);
              }}
              onScrollBeginDrag={() => {
                revealing.current = null;
              }}
              onContentSizeChange={(_width, height) => {
                scrollMetrics.current.contentHeight = height;
                clampOffset();
                // A field that just opened (the calendar) grows the content after
                // asking to be revealed; the first try was clamped to the old height.
                const pending = revealing.current;
                if (pending && Date.now() < pending.until) scrollToTarget(pending.target);
              }}
              onLayout={(event) => {
                scrollMetrics.current.height = event.nativeEvent.layout.height;
                clampOffset();
                const pending = revealing.current;
                if (pending && Date.now() < pending.until) scrollToTarget(pending.target);
              }}
            >
              <View
                ref={contentRef}
                collapsable={false}
                style={[styles.body, { paddingBottom: isWide ? spacing.s4 : spacing.s8 }]}
              >
                <SheetRevealContext.Provider value={reveal}>{children}</SheetRevealContext.Provider>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The tall card's top sits this far under the status bar (design 05: top 56 under a 47 pt bar). */
const TALL_TOP_GAP = 9;

const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  hostWide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    paddingTop: 0,
  },
  cardFit: {
    maxHeight: '92%',
  },
  cardTall: {
    flex: 1,
  },
  cardSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  cardWide: {
    // Room above the header row; the phone sheet has its grabber there.
    paddingTop: spacing.s7,
    width: 480,
    maxWidth: '92%',
    borderRadius: radius.sheet,
    boxShadow: shadows.cardRaised,
  },
  cardWideList: { height: '85%' },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: spacing.s3,
    marginBottom: spacing.s3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.gutter,
    // Always reserved so the body does not shift when the line appears.
    borderBottomWidth: hairlineWidth,
  },
  headerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerSlotRight: {
    justifyContent: 'flex-end',
  },
  headerTitleSlot: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCancel: {
    height: hitTargetMin,
    justifyContent: 'center',
  },
  headerAction: {
    minHeight: 44,
    paddingHorizontal: spacing.s9,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fills the tall card, so its content stays at the top.
  bodyTall: {
    flex: 1,
  },
  body: {
    gap: spacing.s6,
    paddingTop: spacing.s3,
    paddingHorizontal: spacing.gutter,
  },
  bodyStatic: { flex: 1, minHeight: 0 },
  pressed: {
    opacity: 0.7,
  },
});

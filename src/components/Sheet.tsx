import { useEffect, useState, type ReactNode } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { useLazyAnimatedValue } from './useLazyAnimatedValue';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useReducedMotion } from './useReducedMotion';
import { fontFamilies, hairlineWidth, hitTargetMin, motion, radius, shadows, spacing, useTheme } from '@/theme';

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
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
      duration: reducedMotion ? motion.duration.fast : motion.duration.base,
      easing: Easing.bezier(0.2, 0, 0, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!visible && finished) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress, reducedMotion]);

  if (!mounted) return null;

  const translateY = reducedMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {/* Light status text over the scrim while the sheet is open. Gated on the
          owning route's focus: a Modal left mounted under a pushed route (warm
          invite link, Plan → Add → invite) would otherwise keep light icons on
          the route above. When the route loses focus this entry unmounts and the
          root's theme style applies again (N24). */}
      {isFocused ? <StatusBar style="light" /> : null}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: progress }]}
      >
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
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
              { borderBottomColor: scrolled ? colors.divider : 'transparent' },
            ]}
          >
            {headerLayout === 'stacked' ? (
              <AppText numberOfLines={1} style={styles.headerTitle}>{title}</AppText>
            ) : (
              <>
                <View style={styles.headerSlot}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    onPress={onClose}
                    hitSlop={12}
                    style={({ pressed }) => [styles.headerCancel, pressed && styles.pressed]}
                  >
                    <AppText style={styles.headerCancelText}>{'Cancel'}</AppText>
                  </Pressable>
                </View>
                <View style={styles.headerTitleSlot}>
                  <AppText style={styles.headerTitle}>{title}</AppText>
                </View>
                <View style={[styles.headerSlot, styles.headerSlotRight]}>
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
                        { backgroundColor: actionDisabled ? colors.border : actionDestructive ? colors.wax : colors.ink },
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText style={[styles.headerActionText, { color: colors.paper }]}>
                        {actionLabel}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </View>
          <ScrollView
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
              const next = event.nativeEvent.contentOffset.y > 0;
              if (next !== scrolled) setScrolled(next);
            }}
            contentContainerStyle={[styles.body, { paddingBottom: isWide ? spacing.s4 : spacing.s8 }]}
          >
            {children}
          </ScrollView>
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
    minHeight: 52,
    paddingHorizontal: spacing.gutter,
    // Always reserved so the body does not shift when the line appears.
    borderBottomWidth: hairlineWidth,
  },
  headerSlot: {
    flex: 1,
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
    flex: 1,
    alignItems: 'center',
  },
  headerCancel: {
    height: hitTargetMin,
    justifyContent: 'center',
  },
  headerCancelText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    lineHeight: 22,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  headerAction: {
    minHeight: 44,
    paddingHorizontal: spacing.s9,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
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
  pressed: {
    opacity: 0.7,
  },
});

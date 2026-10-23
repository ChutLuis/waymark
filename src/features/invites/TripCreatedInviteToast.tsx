import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check, Copy, Share as ShareIcon, X } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { PatternBand } from '@/components/airmail/PatternBand';
import { easing, useMotion } from '@/components/motion';
import { codeLength, typedCode } from '@/features/trips/sheet';
import { haptic } from '@/lib/haptics';
import { hitTargetMin, iconStrokeWidth, motion, radius, shadows, spacing, typeScale, useTheme } from '@/theme';
import { inviteShareMessage, useTripInvite } from './hooks';

let justCreatedTripId: string | null = null;

/** Mark a newly created trip so its shell shows the quick-share toast once. */
export function markTripJustCreated(tripId: string) {
  justCreatedTripId = tripId;
}

/** Check without consuming (StrictMode-safe). */
export function peekTripJustCreated(tripId: string): boolean {
  return justCreatedTripId === tripId;
}

/** Consume the newly-created flag for `tripId`. */
export function consumeTripJustCreated(tripId: string): boolean {
  if (justCreatedTripId === tripId) {
    justCreatedTripId = null;
    return true;
  }
  return false;
}

const AUTO_DISMISS_MS = 12_000;
/** Grows the code's one line to a 44 pt target, into the gaps above and below it. */
const CODE_SLOP = Math.max(0, (hitTargetMin - (typeScale.codeSm.lineHeight ?? hitTargetMin)) / 2);
const CODE_HIT_SLOP = { top: CODE_SLOP, bottom: CODE_SLOP };
const ANNOUNCEMENT = 'Trip created. Copy or share its invite code from the card at the bottom of the screen.';

/**
 * Whether a screen reader is on. Web can't tell (react-native-web always
 * answers yes), so the web keeps the timed dismissal.
 */
function screenReaderEnabled(): Promise<boolean> {
  return Platform.OS === 'web' ? Promise.resolve(false) : AccessibilityInfo.isScreenReaderEnabled();
}

interface TripCreatedInviteToastProps {
  tripId: string;
  tripName: string;
  bottomOffset: number;
  onDismiss: () => void;
}

/**
 * Registered-mail quick-share toast shown after creating a trip. Uses a
 * two-row layout on fixed light `stampPaper` with `stampInk` (#15223B) so both
 * the 8-character code and the "Copy code" / "Share link" buttons have 13.8:1
 * contrast in both Light and Dark mode. It dismisses itself after 12 s, except
 * with a screen reader on: then it is announced and stays until closed.
 */
export function TripCreatedInviteToast({
  tripId,
  tripName,
  bottomOffset,
  onDismiss,
}: TripCreatedInviteToastProps) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const invite = useTripInvite(tripId);
  const [copied, setCopied] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenReader = useRef(false);
  // The timers outlive renders, so they call the latest onDismiss through a ref.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const progress = useSharedValue(0);

  const clearDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  };

  const scheduleDismiss = (delay = AUTO_DISMISS_MS) => {
    clearDismiss();
    if (screenReader.current) return;
    dismissTimer.current = setTimeout(() => {
      progress.value = withTiming(0, { duration: ms(motion.duration.base), easing: easing('exit') });
      fadeTimer.current = setTimeout(() => onDismissRef.current(), ms(motion.duration.base));
    }, delay);
  };

  useEffect(() => {
    progress.value = withTiming(1, { duration: ms(motion.duration.slow), easing: easing('overshoot') });
    let mounted = true;
    screenReaderEnabled()
      .then((enabled) => {
        if (!mounted) return;
        screenReader.current = enabled;
        if (enabled) AccessibilityInfo.announceForAccessibility(ANNOUNCEMENT);
        else scheduleDismiss(AUTO_DISMISS_MS);
      })
      .catch(() => {
        if (mounted) scheduleDismiss(AUTO_DISMISS_MS);
      });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (enabled: boolean) => {
      screenReader.current = enabled;
      if (enabled) clearDismiss();
      else scheduleDismiss(AUTO_DISMISS_MS);
    });
    return () => {
      mounted = false;
      subscription.remove();
      clearDismiss();
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 28 }],
  }));

  const code = invite.data?.code ?? '';
  const formattedCode = code ? typedCode(code, codeLength(code)) : '';
  const stampSurface = colors.stampPaper;
  const stampInk = colors.stampInk;
  const copiedBg = colors.parAvion;

  const handleCopyCode = async () => {
    if (!code) return;
    haptic('light');
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      scheduleDismiss(6000);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable.
    }
  };

  const handleShare = async () => {
    if (!code) return;
    haptic('selection');
    scheduleDismiss(8000);
    const message = inviteShareMessage(tripName, code);
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else {
          await Clipboard.setStringAsync(code);
          setCopied(true);
        }
      } else {
        await Share.share({ message });
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  const handleClose = () => {
    haptic('selection');
    clearDismiss();
    onDismissRef.current();
  };

  return (
    <Animated.View
      testID="trip-created-invite-toast"
      accessibilityLiveRegion="polite"
      style={[
        styles.host,
        {
          bottom: bottomOffset,
          backgroundColor: stampSurface,
          borderColor: stampInk,
          boxShadow: shadows.cardRaised,
        },
        animatedStyle,
      ]}
    >
      <PatternBand pattern="airmail" height={6} tile={6} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View
            // The registered-mail "R" is decoration; screen readers read "capital R".
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            accessibilityElementsHidden
            style={[styles.rBox, { borderColor: stampInk }]}
          >
            <AppText role="initialLg" style={{ color: stampInk }}>
              R
            </AppText>
          </View>

          <View style={styles.copyCol}>
            <AppText role="monoXs" style={[styles.kicker, { color: stampInk }]}>
              TRIP CREATED · INVITE CODE
            </AppText>
            {invite.isPending ? (
              <View style={styles.loadingRow}>
                {invite.isPaused ? null : <ActivityIndicator size="small" color={stampInk} />}
                <AppText role="metaSm" style={{ color: stampInk }}>
                  {invite.isPaused ? 'Waiting for a connection…' : 'Printing invite code…'}
                </AppText>
              </View>
            ) : code ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Copy invite code ${code}`}
                onPress={handleCopyCode}
                hitSlop={CODE_HIT_SLOP}
                style={styles.codePress}
              >
                <AppText role="codeSm" numberOfLines={1} style={{ color: stampInk }}>
                  {formattedCode}
                </AppText>
              </Pressable>
            ) : (
              <AppText role="metaSm" style={{ color: stampInk }}>
                Tap Invite above to share
              </AppText>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss invite toast"
            onPress={handleClose}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <X size={18} color={stampInk} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        {code ? (
          <View style={[styles.actionsRow, { borderTopColor: colors.postmarkFaint }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copied code' : 'Copy code'}
              onPress={handleCopyCode}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: copied ? copiedBg : stampSurface,
                  borderColor: copied ? copiedBg : stampInk,
                  borderWidth: 2,
                },
                pressed && styles.pressed,
              ]}
            >
              {copied ? (
                <Check size={16} color={stampSurface} strokeWidth={iconStrokeWidth + 0.4} />
              ) : (
                <Copy size={16} color={stampInk} strokeWidth={iconStrokeWidth} />
              )}
              <AppText role="pillLabel" numberOfLines={1} style={{ color: copied ? stampSurface : stampInk }}>
                {copied ? 'Copied code' : 'Copy code'}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share code"
              onPress={handleShare}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: stampInk,
                  borderColor: stampInk,
                  borderWidth: 2,
                },
                pressed && styles.pressed,
              ]}
            >
              <ShareIcon size={16} color={stampSurface} strokeWidth={iconStrokeWidth} />
              <AppText role="pillLabel" numberOfLines={1} style={{ color: stampSurface }}>
                Share code
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.cardGutter,
    right: spacing.cardGutter,
    borderRadius: radius.codeBox,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: 20,
  },
  body: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rBox: {
    width: 38,
    height: 44,
    borderWidth: 2,
    borderRadius: radius.airmailInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  kicker: {
    letterSpacing: 0.9,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  codePress: {
    alignSelf: 'flex-start',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  actionsRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: hitTargetMin,
    paddingHorizontal: 12,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  pressed: {
    opacity: 0.7,
  },
});

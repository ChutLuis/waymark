import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { AppText } from './AppText';
import { useSheetReveal } from './Sheet';
import { iconSizes, iconStrokeWidth, radius, spacing, useTheme } from '@/theme';

/**
 * Item, note and trip editors: their saves and deletes wait for the
 * connection, kept on the device so closing the app doesn't lose them.
 */
export const EDITOR_OFFLINE_HINT = 'You’re offline. What you save is sent when you’re back online, even if you close Waymark.';
export const EDITOR_OFFLINE_QUEUED = 'You’re offline — this will be sent when you’re back online, even if you close Waymark.';
/** A private note's text is never stored on the device, so its queued save lasts only while the app is open. */
export const PRIVATE_NOTE_OFFLINE_HINT =
  'You’re offline. A private note is sent when you’re back online, as long as Waymark stays open: it isn’t kept on this device.';
export const PRIVATE_NOTE_OFFLINE_QUEUED =
  'You’re offline — this private note will be sent when you’re back online. Keep Waymark open: it isn’t kept on this device.';

/**
 * Why a sheet's action waits: shown while offline, and scrolled into view
 * (and announced to screen readers) when it matters, i.e. once the action has
 * been queued.
 */
export function OfflineNotice({ message, reveal: shouldReveal = false }: { message: string; reveal?: boolean }) {
  const { colors } = useTheme();
  const reveal = useSheetReveal();
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!shouldReveal) return;
    reveal(ref.current);
    AccessibilityInfo.announceForAccessibility(message);
  }, [shouldReveal, reveal, message]);
  return (
    <View
      ref={ref}
      collapsable={false}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: colors.paper, borderColor: colors.fieldBorder }]}
    >
      <WifiOff size={iconSizes.sm} color={colors.ink2} strokeWidth={iconStrokeWidth} />
      <AppText role="bodySm" tone="secondary" style={styles.noticeText}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s5,
  },
  noticeText: { flex: 1 },
});

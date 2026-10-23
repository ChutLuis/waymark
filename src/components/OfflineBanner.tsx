import { useEffect } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { AppText } from './AppText';
import { iconSizes, iconStrokeWidth, radius, spacing, useTheme } from '@/theme';
import { useIsOnline } from '@/lib/useIsOnline';

const MESSAGE = 'You’re offline. Changes you make will be sent when you’re back online.';

// Spoken once each time the connection drops, however many screens show the
// banner; reset when it comes back.
let announced = false;
onlineManager.subscribe((online) => {
  if (online) announced = false;
});

/**
 * Offline notice (STATE-2). Cached data stays on screen and TanStack Query
 * holds writes until the connection returns; this says so, in the flow of the
 * page under its header (never over the status bar). Only the focused
 * screen's banner speaks: Android through a polite live region, iOS (no live
 * regions) through a single announcement.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const online = useIsOnline();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (online || !isFocused || announced) return;
    announced = true;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(MESSAGE);
  }, [online, isFocused]);

  if (online) return null;

  return (
    <View style={styles.host}>
      <View
        accessible
        accessibilityLabel={MESSAGE}
        accessibilityLiveRegion={isFocused ? 'polite' : 'none'}
        style={[styles.banner, { backgroundColor: colors.paper, borderColor: colors.border }]}
      >
        <WifiOff size={iconSizes.md} color={colors.ink2} strokeWidth={iconStrokeWidth} />
        <AppText role="bodySm" tone="secondary" style={styles.label}>
          {MESSAGE}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.s3,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s6,
  },
  label: {
    flex: 1,
  },
});

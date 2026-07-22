import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react-native';
import { AppText } from './AppText';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';

function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(() => onStoreChange()),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/**
 * Unobtrusive offline pill (STATE-2). Cached data stays on screen; this
 * just explains why nothing new is arriving.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const online = useIsOnline();
  if (online) return null;

  return (
    <View style={styles.host}>
      <View
        accessibilityRole="alert"
        style={[
          styles.pill,
          { backgroundColor: colors.surface.sunken, borderColor: colors.hairline.default },
        ]}
      >
        <WifiOff size={13} color={colors.text.secondary} strokeWidth={1.8} />
        <AppText role="caption" tone="secondary" style={styles.label}>
          Offline — showing what you have
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: 'center',
    paddingVertical: spacing.s3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    borderRadius: radius.full,
    borderWidth: hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: spacing.s3 + 2,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
});

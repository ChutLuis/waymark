import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBanner } from '@/components/ErrorBanner';
import { radius, shadows, spacing } from '@/theme';
import { dismissQueuedFailure, useQueuedFailures } from './queuedErrors';

/**
 * App-wide report of a change made offline that failed once it was sent: the
 * inline error banner, pinned to the bottom of the screen until dismissed,
 * because the sheet that made the change may be long gone. One at a time;
 * dismissing shows the next.
 */
export function QueuedChangeErrors() {
  const insets = useSafeAreaInsets();
  const failures = useQueuedFailures();
  const first = failures[0] ?? null;
  const more = failures.length - 1;

  useEffect(() => {
    if (first) AccessibilityInfo.announceForAccessibility(first.message);
  }, [first]);

  if (!first) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + spacing.s6 }]}>
      <View style={[styles.card, { boxShadow: shadows.card }]}>
        <ErrorBanner
          message={first.message}
          action={{
            label: 'Dismiss',
            accessibilityLabel: more > 0 ? `Dismiss. ${more} more` : 'Dismiss',
            onPress: () => dismissQueuedFailure(first.id),
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.cardGutter, right: spacing.cardGutter },
  card: { borderRadius: radius.card },
});

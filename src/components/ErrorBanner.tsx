import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from './AppText';
import { hitTargetMin, pressedOpacity, radius, spacing, useTheme } from '@/theme';

/**
 * Inline error banner (wax) used above forms, per the auth spec. `action` adds
 * a text button at its end (the app-wide report's Dismiss).
 */
export function ErrorBanner({
  message,
  action,
}: {
  message: string;
  action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.paper, borderColor: colors.danger }]}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.icon}>
        <Circle cx={12} cy={12} r={9} fill="none" stroke={colors.danger} strokeWidth={2} />
        <Path d="M12 8v5M12 16.5v.5" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <AppText role="bodySm" style={[styles.message, { color: colors.danger }]}>
        {message}
      </AppText>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <AppText role="link" style={styles.actionLabel}>
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s3,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingVertical: spacing.s5,
    paddingHorizontal: spacing.s6,
  },
  icon: {
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  // 44 pt, reaching into the banner's padding so the banner keeps its height.
  action: {
    minHeight: hitTargetMin,
    minWidth: hitTargetMin,
    marginVertical: -(hitTargetMin - 19) / 2,
    marginRight: -spacing.s3,
    paddingHorizontal: spacing.s3,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { textDecorationLine: 'underline' },
  pressed: { opacity: pressedOpacity },
});
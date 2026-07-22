import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from './AppText';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';

/** Inline error banner (danger wash) used above forms, per the auth spec. */
export function ErrorBanner({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: colors.semantic.danger.wash,
          borderColor: colors.semantic.danger.base,
        },
      ]}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.icon}>
        <Circle
          cx={12}
          cy={12}
          r={9}
          fill="none"
          stroke={colors.semantic.danger.base}
          strokeWidth={1.8}
        />
        <Path
          d="M12 8v5M12 16.5v.5"
          stroke={colors.semantic.danger.base}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
      <AppText
        style={[styles.message, { color: colors.semantic.danger.pressed }]}
      >
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s2,
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s3 + 2,
  },
  icon: {
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
});

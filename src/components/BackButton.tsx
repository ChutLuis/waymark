import { router, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { hitTargetMin, iconStrokeWidth, radius, shadows, useTheme } from '@/theme';

interface BackButtonProps {
  /** The visible label beside the chevron. */
  label?: string;
  /** Defaults to "Back" or "Back to <label>". */
  accessibilityLabel?: string;
  /**
   * `row`: a bare chevron and label, for screens on the page ground (auth,
   * Join, Profile, legal pages). `pill`: a bordered paper pill, for pages
   * pushed over art or another page (the album, the Trip page).
   */
  variant?: 'row' | 'pill';
  /** Defaults to going back, or to `fallbackHref` when there is no history (a deep link). */
  onPress?: () => void;
  fallbackHref?: Href;
  style?: StyleProp<ViewStyle>;
}

/** The one back control: both variants give at least a 44 pt target. */
export function BackButton({
  label = 'Back',
  accessibilityLabel,
  variant = 'row',
  onPress,
  fallbackHref = '/',
  style,
}: BackButtonProps) {
  const { colors } = useTheme();
  const goBack = onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(fallbackHref)));
  const a11yLabel = accessibilityLabel ?? (label === 'Back' ? 'Back' : `Back to ${label}`);

  if (variant === 'pill') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={goBack}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: colors.paper, borderColor: colors.divider, boxShadow: shadows.pill },
          pressed && styles.pressed,
          style,
        ]}
      >
        <ChevronLeft size={20} color={colors.ink} strokeWidth={iconStrokeWidth} />
        <AppText role="backLabel">{label}</AppText>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={goBack}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
      <AppText role="backLabel">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
    paddingRight: 12,
  },
  pill: {
    minHeight: hitTargetMin,
    alignSelf: 'flex-start',
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.codeBox,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: { opacity: 0.7 },
});

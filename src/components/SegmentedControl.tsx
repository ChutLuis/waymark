import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { radius, spacing, useTheme } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** Track surface: `paper` on the page, `bg` on a paper card. */
  track?: 'paper' | 'bg';
  /** 44 pt segments by default; 34 pt for the profile Appearance row. */
  size?: 'default' | 'compact';
  /** Let each segment size to its content instead of equal columns. */
  stretch?: boolean;
}

/** Pill segmented control; selected segment is ink on paper. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  track = 'paper',
  size = 'default',
  stretch = true,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const height = size === 'compact' ? 34 : 44;
  const padding = size === 'compact' ? 3 : 4;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        {
          backgroundColor: track === 'paper' ? colors.paper : colors.bg,
          padding,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              stretch && styles.segmentStretch,
              { height, paddingHorizontal: size === 'compact' ? 11 : 14 },
              selected && { backgroundColor: colors.ink },
              pressed && !selected ? { opacity: 0.7 } : null,
            ]}
          >
            <AppText
              role={selected ? 'button' : 'link'}
              style={[
                { color: selected ? colors.paper : colors.ink },
                size === 'compact' && { fontSize: 14, lineHeight: 18 },
              ]}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    gap: spacing.s1,
    alignSelf: 'flex-start',
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  segmentStretch: {
    flex: 1,
  },
});
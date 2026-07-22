import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { hairlineWidth, radius, useTheme } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Sunken track with a raised active chip; used for itinerary status. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: colors.surface.sunken, borderColor: colors.hairline.default },
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
              selected && {
                backgroundColor: colors.surface.raised,
                borderColor: colors.hairline.default,
                borderWidth: hairlineWidth,
              },
              pressed && !selected ? { opacity: 0.7 } : null,
            ]}
          >
            <AppText
              role={selected ? 'label' : 'body'}
              tone={selected ? 'primary' : 'secondary'}
              style={styles.label}
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
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
});

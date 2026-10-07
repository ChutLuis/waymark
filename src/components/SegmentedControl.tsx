import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { fontFamilies, radius, spacing, useTheme } from '@/theme';

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
  /** Track styling, e.g. `alignSelf: 'center'` inside a vertical stack. */
  style?: StyleProp<ViewStyle>;
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
  style,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  // Measure the track itself, not the screen: a filter control sits inside page
  // padding, so it is narrower than the window (item 11).
  const [trackWidth, setTrackWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);
  const height = size === 'compact' ? 34 : 44;
  const padding = size === 'compact' ? 3 : 4;
  // When the track cannot fit the default 15/20 labels on one line
  // ("Only you · 1"), drop to 14/18 and tighten the padding (item 11).
  const narrow = trackWidth > 0 && trackWidth < 360 && size === 'default';
  const labelSize = size === 'compact' ? 14 : narrow ? 14 : 15;
  const labelLine = size === 'compact' ? 18 : narrow ? 18 : 20;
  const segmentPad = size === 'compact' ? 11 : narrow ? 9 : 14;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={[
        styles.track,
        {
          backgroundColor: track === 'paper' ? colors.paper : colors.bg,
          padding,
        },
        style,
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
              { height, paddingHorizontal: segmentPad },
              selected && { backgroundColor: colors.ink },
              pressed && !selected ? { opacity: 0.7 } : null,
            ]}
          >
            <AppText
              numberOfLines={1}
              // One size for both states so labels don't jump on tap; only the
              // weight and colour change.
              style={{
                alignSelf: 'stretch',
                textAlign: 'center',
                color: selected ? colors.paper : colors.ink,
                fontFamily: selected ? fontFamilies.bold : fontFamilies.semibold,
                fontSize: labelSize,
                lineHeight: labelLine,
              }}
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
    // No alignSelf here: it pinned the track to the top of Profile's row
    // (item N6). Callers align it where they place it.
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
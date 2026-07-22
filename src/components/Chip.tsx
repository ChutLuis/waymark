import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { hairlineWidth, hitTargetMin, radius, spacing, useTheme } from '@/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional leading element (e.g. an avatar for assignment chips). */
  leading?: ReactNode;
}

/** Selectable pill used for reminder offsets and packing assignment. */
export function Chip({ label, selected, onPress, leading }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        leading ? styles.chipWithLeading : null,
        {
          backgroundColor: selected ? colors.accent.wash : 'transparent',
          borderColor: selected ? colors.accent.base : colors.hairline.strong,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {leading}
      <AppText
        role={selected ? 'label' : 'body'}
        tone={selected ? 'accent' : 'secondary'}
        style={styles.label}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    paddingVertical: spacing.s2 - 1,
    paddingHorizontal: spacing.s3 + 1,
    borderRadius: radius.full,
    borderWidth: hairlineWidth,
    minHeight: Math.max(34, hitTargetMin - 10),
  },
  chipWithLeading: {
    paddingLeft: spacing.s2,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
});

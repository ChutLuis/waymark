import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { radius, useTheme } from '@/theme';

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
          backgroundColor: selected ? colors.ink : 'transparent',
          borderColor: selected ? colors.ink : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {leading}
      <AppText role="link" style={{ color: selected ? colors.paper : colors.ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    minHeight: 44,
  },
  chipWithLeading: {
    paddingLeft: 8,
  },
});
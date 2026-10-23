import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { disabledOpacity, hitTargetMin, pressedOpacity, radius, useTheme } from '@/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional leading element (e.g. an avatar for assignment chips). */
  leading?: ReactNode;
  disabled?: boolean;
}

/** Selectable pill used for reminder offsets and packing assignment. */
export function Chip({ label, selected, onPress, leading, disabled = false }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        leading ? styles.chipWithLeading : null,
        {
          backgroundColor: selected ? colors.ink : 'transparent',
          borderColor: selected ? colors.ink : colors.border,
          opacity: disabled ? disabledOpacity : pressed ? pressedOpacity : 1,
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
    // A full target on its own: no hit slop to overlap the next chip in a row.
    minHeight: hitTargetMin,
    minWidth: hitTargetMin,
  },
  chipWithLeading: {
    paddingLeft: 8,
  },
});
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { floatingShadow, radius, spacing, useTheme } from '@/theme';

interface FabProps {
  onPress: () => void;
  accessibilityLabel: string;
}

/** Floating add button — the only floating-elevation element on a screen. */
export function Fab({ onPress, accessibilityLabel }: FabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        floatingShadow,
        {
          backgroundColor: pressed ? colors.accent.pressed : colors.accent.base,
          bottom: insets.bottom + spacing.s5,
        },
      ]}
    >
      <Plus size={22} color={colors.accent.onAccent} strokeWidth={2} absoluteStrokeWidth />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.screenGutter,
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

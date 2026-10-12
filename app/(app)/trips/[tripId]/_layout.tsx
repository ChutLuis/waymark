import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/**
 * A trip is its tab shell plus the Trip page (the sheet of stamps), which the
 * shell's title pill pushes over it.
 */
export default function TripLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1, minHeight: 0 },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

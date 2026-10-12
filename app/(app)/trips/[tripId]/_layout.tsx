import { useEffect, useRef } from 'react';
import { Stack, useNavigation } from 'expo-router';
import { runShellCloser } from '@/features/trips/expandStore';
import { useTheme } from '@/theme';

/**
 * A trip is its tab shell plus the Trip page (the sheet of stamps), which the
 * shell's title pill pushes over it. Going back to Home first runs the
 * shell's collapse onto the Home postcard (or its pop), then lets the
 * navigation through; replacing or resetting the stack skips the motion.
 */
export default function TripLayout() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const closing = useRef(false);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        const type = event.data.action.type;
        if (closing.current || type === 'REPLACE' || type === 'RESET') return;
        event.preventDefault();
        closing.current = true;
        runShellCloser(() => navigation.dispatch(event.data.action));
      }),
    [navigation],
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1, minHeight: 0 },
      }}
    >
      {/* The shell draws its own ground, so Home shows around it mid-expand. */}
      <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: 'transparent', flex: 1 } }} />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

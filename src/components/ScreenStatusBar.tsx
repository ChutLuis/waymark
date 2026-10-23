import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenStatusBarProps {
  /**
   * Pins an opaque, page-coloured band over the top inset, so content that
   * scrolls (or is pushed up by the keyboard) passes under it and never under
   * the clock (N18). Render it as a direct child of the screen's root, before
   * the scroll view.
   */
  band?: boolean;
}

/** A page owns its theme style only while focused; an open Sheet can override it. */
export function ScreenStatusBar({ band = false }: ScreenStatusBarProps) {
  const isFocused = useIsFocused();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
      {isFocused ? <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /> : null}
      {band ? (
        <View
          pointerEvents="none"
          style={[styles.band, { height: insets.top, backgroundColor: colors.bg }]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
});

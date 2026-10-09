import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

/** A page owns its theme style only while focused; an open Sheet can override it. */
export function ScreenStatusBar() {
  const isFocused = useIsFocused();
  const { scheme } = useTheme();
  return isFocused ? <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /> : null;
}

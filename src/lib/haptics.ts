import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * The four haptics of the Airmail v4 table. Fire them on the frame the paper
 * makes contact, never when the gesture starts. They still fire with reduced
 * motion on (DESIGN_DECISIONS §5); on web they are a no-op.
 */
export type HapticKind = 'selection' | 'light' | 'medium' | 'rigid';

const IMPACT: Record<Exclude<HapticKind, 'selection'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  const fired = kind === 'selection' ? Haptics.selectionAsync() : Haptics.impactAsync(IMPACT[kind]);
  fired.catch(() => {
    // No haptics engine (simulator, old device): nothing to feel.
  });
}

/** Fires `kind` after `delayMs` (0 fires now). Returns a cancel function. */
export function hapticAfter(kind: HapticKind, delayMs: number): () => void {
  if (delayMs <= 0) {
    haptic(kind);
    return () => {};
  }
  const id = setTimeout(() => haptic(kind), delayMs);
  return () => clearTimeout(id);
}

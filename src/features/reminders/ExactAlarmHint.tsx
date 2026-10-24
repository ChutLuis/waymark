import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { openExactAlarmSettings, useExactAlarmAccess } from '@/lib/notifications';
import { hitTargetMin, pressedOpacity } from '@/theme';

const HINT = 'Reminders may arrive a little late.';
const ACTION = 'Allow exact alarms';

/**
 * One caption under a reminder switch while Android won't set exact alarms:
 * reminders still work, but may come late. The whole line opens the system
 * setting; it never blocks anything.
 */
export function ExactAlarmHint({ style }: { style?: StyleProp<ViewStyle> }) {
  const access = useExactAlarmAccess();
  if (access !== 'denied') return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${HINT} ${ACTION}`}
      accessibilityHint="Opens system settings"
      onPress={() => openExactAlarmSettings()}
      style={({ pressed }) => [styles.hint, style, pressed && styles.pressed]}
    >
      <AppText role="caption" tone="muted">
        {HINT}{' '}
        <AppText role="caption" style={styles.action}>
          {ACTION}
        </AppText>
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { minHeight: hitTargetMin, justifyContent: 'center' },
  action: { textDecorationLine: 'underline' },
  pressed: { opacity: pressedOpacity },
});

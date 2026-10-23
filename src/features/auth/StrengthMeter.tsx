import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { radius, spacing, useTheme } from '@/theme';
import { LENGTH_HINT, STRENGTH_LABELS, strengthOf } from './passwordStrength';

/** Four stamps that fill in as a new password gets stronger (sign-up and reset). */
export function StrengthMeter({ password }: { password: string }) {
  const { colors } = useTheme();
  const score = strengthOf(password);
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3].map((index) =>
        index < score ? (
          <PerforatedStamp key={index} width={20} height={24} size="xs" tone="ink" />
        ) : (
          <View key={index} style={[styles.empty, { borderColor: colors.slot }]} />
        ),
      )}
      <AppText role="kicker" tone={score === 0 ? 'muted' : 'secondary'} style={styles.label}>
        {STRENGTH_LABELS[score] || LENGTH_HINT}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, marginTop: spacing.s4 },
  empty: { width: 20, height: 24, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.airmailInner },
  label: { marginLeft: spacing.s1 },
});

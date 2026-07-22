import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { fontFamilies, radius, spacing, useTheme } from '@/theme';
import type { DateTimeFieldProps } from './DateTimeField';

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Web adaptation: a plain datetime-local / date input styled like TextField. */
export function DateTimeField({
  label,
  optionalTag,
  value,
  onChange,
  mode = 'datetime',
  error,
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const isDateOnly = mode === 'date';
  return (
    <View>
      <View style={styles.labelRow}>
        <AppText role="label">{label}</AppText>
        {optionalTag ? (
          <AppText role="label" tone="faint" style={styles.optional}>
            {optionalTag}
          </AppText>
        ) : null}
      </View>
      <input
        aria-label={label}
        type={isDateOnly ? 'date' : 'datetime-local'}
        value={isDateOnly ? (value ?? '') : toLocalInputValue(value)}
        onChange={(event) => {
          const raw = event.target.value;
          if (!raw) onChange(null);
          else onChange(isDateOnly ? raw : new Date(raw).toISOString());
        }}
        style={{
          height: 46,
          borderRadius: radius.md,
          border: `1px solid ${error ? colors.semantic.danger.base : colors.hairline.strong}`,
          background: colors.surface.bg,
          color: colors.text.primary,
          padding: `0 ${spacing.s3 + 2}px`,
          fontFamily: `${fontFamilies.textRegular}, system-ui, sans-serif`,
          fontSize: 15,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {error ? (
        <AppText role="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginBottom: spacing.s1 + 2,
  },
  optional: {
    fontFamily: fontFamilies.textRegular,
    marginLeft: spacing.s1,
  },
  error: {
    marginTop: spacing.s1 + 2,
  },
});

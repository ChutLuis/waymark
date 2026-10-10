import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { fontFamilies, radius, spacing, useTheme } from '@/theme';
import { formatDate, formatDateTime } from '@/lib/format/date';
import type { DateTimeFieldProps } from './DateTimeField';

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The browser's locale format hidden in favour of the design's day-first text. */
function displayValue(iso: string | null, isDateOnly: boolean): string {
  if (!iso) return '';
  return isDateOnly ? formatDate(iso) : formatDateTime(iso);
}

/** Matches TextField's 1.5 px resting border. */
const BORDER = 1.5;

/** Web adaptation: a plain datetime-local / date input styled like TextField. */
export function DateTimeField({
  label,
  optionalTag,
  value,
  onChange,
  mode = 'datetime',
  error,
  placeholder = 'Add',
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const isDateOnly = mode === 'date';
  return (
    <View>
      <View style={styles.labelRow}>
        <AppText role="kicker" tone="secondary">
          {label}
        </AppText>
        {optionalTag ? (
          <AppText role="kicker" tone="muted" style={styles.optional}>
            {optionalTag}
          </AppText>
        ) : null}
      </View>
      <div style={{ position: 'relative', width: '100%' }}>
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
            height: 52,
            borderRadius: radius.input,
            border: `${BORDER}px solid ${error ? colors.wax : colors.border}`,
            background: colors.paper,
            color: 'transparent',
            // TextField's inset, so dates start where Trip name and Destination do.
            padding: `0 ${spacing.s7}px`,
            fontFamily: `${fontFamilies.regular}, system-ui, sans-serif`,
            fontSize: 17,
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            // The overlay sits outside the input's border, so add it back.
            left: BORDER + spacing.s7,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            fontFamily: `${fontFamilies.regular}, system-ui, sans-serif`,
            fontSize: 17,
            color: value ? colors.ink : colors.ink3,
          }}
        >
          {displayValue(value, isDateOnly) || placeholder}
        </span>
      </div>
      {error ? (
        <AppText role="bodySm" style={[styles.error, { color: colors.wax }]}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same label row as TextField, so Destination and the date pair match.
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    marginBottom: spacing.s2,
  },
  optional: {
    textTransform: 'lowercase',
  },
  error: {
    marginTop: spacing.s2,
  },
});

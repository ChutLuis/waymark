import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { disabledOpacity, fontFamilies, radius, spacing, useTheme } from '@/theme';
import { formatDate, formatDateTime, toDateOnly } from '@/lib/format/date';
import {
  DATE_BOX_GAP,
  DATE_BOX_HEIGHT,
  DATE_BOX_INSET,
  DATE_BOX_LABEL_TRACKING,
  dateValueType,
} from './dateBox';
import type { DateTimeFieldProps } from './DateTimeField';

function toLocalInputValue(iso: string | Date | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The input's min/max attribute for a bound: a local date, or date and time. */
function inputBound(bound: Date | undefined, isDateOnly: boolean): string | undefined {
  if (!bound) return undefined;
  return isDateOnly ? toDateOnly(bound) : toLocalInputValue(bound);
}

/** The browser's locale format hidden in favour of the design's day-first text. */
function displayValue(iso: string | null, isDateOnly: boolean): string {
  if (!iso) return '';
  return isDateOnly ? formatDate(iso) : formatDateTime(iso);
}

/**
 * Web adaptation: a plain datetime-local / date input drawn as the date box.
 * The input is the box (so a click anywhere opens it); its own text is hidden
 * under the label and the design's day-first value.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  error,
  placeholder = 'Add',
  size = 'lg',
  disabled = false,
  minimumDate,
  maximumDate,
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const isDateOnly = mode === 'date';
  const valueType = dateValueType[size];
  // Focused: inset 2 ink, as a focused TextField.
  const borderWidth = error || focused ? 2 : 1.5;
  return (
    <View>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          aria-label={label}
          disabled={disabled}
          type={isDateOnly ? 'date' : 'datetime-local'}
          min={inputBound(minimumDate, isDateOnly)}
          max={inputBound(maximumDate, isDateOnly)}
          value={isDateOnly ? (value ?? '') : toLocalInputValue(value)}
          onChange={(event) => {
            const raw = event.target.value;
            if (!raw) onChange(null);
            else onChange(isDateOnly ? raw : new Date(raw).toISOString());
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            display: 'block',
            height: DATE_BOX_HEIGHT,
            borderRadius: radius.input,
            border: `${borderWidth}px solid ${error ? colors.danger : focused ? colors.ink : colors.fieldBorder}`,
            outline: 'none',
            background: colors.paper,
            color: 'transparent',
            padding: `0 ${DATE_BOX_INSET - borderWidth}px`,
            fontFamily: `${fontFamilies.regular}, system-ui, sans-serif`,
            fontSize: valueType.fontSize,
            width: '100%',
            boxSizing: 'border-box',
            opacity: disabled ? disabledOpacity : 1,
          }}
        />
        {/* Positioned from the outer edge, so the border never shifts it. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: DATE_BOX_INSET,
            right: DATE_BOX_INSET,
            top: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: DATE_BOX_GAP,
            pointerEvents: 'none',
          }}
        >
          <AppText role="tag" tone="secondary" numberOfLines={1} style={styles.label}>
            {label}
          </AppText>
          <AppText numberOfLines={1} style={[valueType, { color: value ? colors.ink : colors.ink3 }]}>
            {displayValue(value, isDateOnly) || placeholder}
          </AppText>
        </div>
      </div>
      {error ? (
        <AppText role="bodySm" style={[styles.error, { color: colors.danger }]}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    letterSpacing: DATE_BOX_LABEL_TRACKING,
  },
  error: {
    marginTop: spacing.s2,
  },
});

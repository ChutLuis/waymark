import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { fontFamilies, hitTargetMin, radius, spacing, typeScale, useTheme } from '@/theme';
import { formatDate, formatDateTime, toDateOnly } from '@/lib/format/date';

export interface DateTimeFieldProps {
  label: string;
  optionalTag?: string;
  /** ISO timestamp ('datetime' mode) or 'YYYY-MM-DD' ('date' mode). */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** 'datetime' (default) or a date-only picker (trip dates). */
  mode?: 'datetime' | 'date';
  placeholder?: string;
  clearable?: boolean;
  error?: string;
  /** Sensible starting point when the field is empty (e.g. trip start date). */
  initialDate?: Date;
  /** 'box' renders the 64-high new-trip date box (label inside). */
  variant?: 'default' | 'box';
}

/**
 * Native date+time field. iOS shows a datetime picker in a bottom sheet;
 * Android runs the two-step date -> time dialog flow. Web uses
 * DateTimeField.web.tsx (a datetime-local input).
 */
export function DateTimeField({
  label,
  optionalTag,
  value,
  onChange,
  mode = 'datetime',
  placeholder = 'Add',
  clearable = false,
  error,
  initialDate,
  variant = 'default',
}: DateTimeFieldProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const current = value
    ? new Date(mode === 'date' ? `${value}T00:00:00` : value)
    : (initialDate ?? new Date());

  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [iosPending, setIosPending] = useState<Date>(current);
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const display = value ? (mode === 'date' ? formatDate(value) : formatDateTime(value)) : null;

  const commit = (date: Date) => {
    onChange(mode === 'date' ? toDateOnly(date) : date.toISOString());
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      setAndroidStep('date');
    } else {
      setIosPending(current);
      setIosPickerVisible(true);
    }
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setAndroidStep(null);
      setPendingDate(null);
      return;
    }
    if (androidStep === 'date') {
      if (mode === 'date') {
        setAndroidStep(null);
        commit(date);
        return;
      }
      setPendingDate(date);
      setAndroidStep('time');
    } else {
      const base = pendingDate ?? current;
      const combined = new Date(base);
      combined.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setAndroidStep(null);
      setPendingDate(null);
      commit(combined);
    }
  };

  return (
    <View>
      {variant === 'default' ? (
        <View style={styles.labelRow}>
          <AppText role="kicker" tone="secondary">{label}</AppText>
          {optionalTag ? (
            <AppText role="kicker" tone="muted" style={styles.optional}>
              {optionalTag}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display ?? 'not set'}`}
        onPress={openPicker}
        style={({ pressed }) => [
          variant === 'box' ? styles.box : styles.field,
          {
            backgroundColor: colors.paper,
            borderColor: error ? colors.wax : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {variant === 'box' ? (
          <View>
            <AppText role="tag" tone="secondary" style={{ letterSpacing: 0.6 }}>
              {label}
            </AppText>
            <AppText
              style={[styles.boxValue, { fontFamily: fontFamilies.semibold }, !value && { color: colors.ink3 }]}
            >
              {display ?? placeholder}
            </AppText>
          </View>
        ) : (
          <AppText style={[styles.value, !value && { color: colors.ink3 }]}>
            {display ?? placeholder}
          </AppText>
        )}
        {clearable && value && variant === 'default' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={10}
            onPress={() => onChange(null)}
          >
            <AppText role="link" tone="muted">
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
      {error ? (
        <AppText role="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          visible={iosPickerVisible}
          animationType="slide"
          onRequestClose={() => setIosPickerVisible(false)}
        >
          <View style={styles.iosModalHost}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel date picker"
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
              onPress={() => setIosPickerVisible(false)}
            />
            <View
              style={[
                styles.iosPickerSheet,
                {
                  backgroundColor: colors.paper,
                  paddingBottom: Math.max(insets.bottom, spacing.s6) + spacing.s4,
                },
              ]}
            >
              <View style={styles.iosPickerHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  hitSlop={spacing.s3}
                  onPress={() => setIosPickerVisible(false)}
                  style={({ pressed }) => [styles.iosPickerHeaderAction, pressed && styles.pressed]}
                >
                  <AppText role="link" tone="muted">
                    Cancel
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  hitSlop={spacing.s3}
                  onPress={() => {
                    commit(iosPending);
                    setIosPickerVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.iosPickerHeaderAction,
                    styles.iosPickerHeaderActionEnd,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText role="link" style={{ color: colors.ink }}>
                    Done
                  </AppText>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosPending}
                mode={mode}
                display="spinner"
                onChange={(_event, date) => {
                  if (date) setIosPending(date);
                }}
                accentColor={colors.ink}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
      {Platform.OS === 'android' && androidStep ? (
        <DateTimePicker
          value={androidStep === 'time' ? (pendingDate ?? current) : current}
          mode={androidStep}
          onChange={onAndroidChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginBottom: spacing.s2,
  },
  optional: {
    textTransform: 'lowercase',
    marginLeft: spacing.s1,
  },
  field: {
    minHeight: 52,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: spacing.s7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Keep a gap before "Clear" so a full date ("6 Oct, 0:30") can't touch it.
    gap: spacing.s4,
  },
  value: {
    ...typeScale.body,
    // Let a long value shrink instead of shoving "Clear" onto it.
    flexShrink: 1,
  },
  box: {
    minHeight: 64,
    borderRadius: radius.input,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    justifyContent: 'center',
    gap: 2,
  },
  boxValue: {
    fontSize: 18,
    lineHeight: 24,
  },
  error: {
    marginTop: spacing.s2,
  },
  iosModalHost: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosPickerSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.s7,
    paddingHorizontal: spacing.gutter,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iosPickerHeaderAction: {
    minWidth: spacing.s8,
    minHeight: hitTargetMin,
    justifyContent: 'center',
  },
  iosPickerHeaderActionEnd: {
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
  iosPicker: {
    width: '100%',
  },
});

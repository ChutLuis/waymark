import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { fontFamilies, hitTargetMin, radius, spacing, useTheme } from '@/theme';
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
      <View style={styles.labelRow}>
        <AppText role="label">{label}</AppText>
        {optionalTag ? (
          <AppText role="label" tone="faint" style={styles.optional}>
            {optionalTag}
          </AppText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display ?? 'not set'}`}
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.surface.bg,
            borderColor: error ? colors.semantic.danger.base : colors.hairline.strong,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <AppText style={[styles.value, !value && { color: colors.text.faint }]}>
          {display ?? placeholder}
        </AppText>
        {clearable && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={10}
            onPress={() => onChange(null)}
          >
            <AppText role="label" tone="muted">
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
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.scrim }]}
              onPress={() => setIosPickerVisible(false)}
            />
            <View
              style={[
                styles.iosPickerSheet,
                {
                  backgroundColor: colors.surface.raised,
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
                  <AppText role="label" tone="muted">
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
                  <AppText role="label" tone="accent">
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
                accentColor={colors.accent.base}
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
    marginBottom: spacing.s1 + 2,
  },
  optional: {
    fontFamily: fontFamilies.textRegular,
    marginLeft: spacing.s1,
  },
  field: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.s3 + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
  },
  error: {
    marginTop: spacing.s1 + 2,
  },
  iosModalHost: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  iosPickerSheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.s4,
    paddingHorizontal: spacing.screenGutter,
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

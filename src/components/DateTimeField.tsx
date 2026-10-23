import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useReducedMotion } from './useReducedMotion';
import { disabledOpacity, hitTargetMin, radius, spacing, useTheme } from '@/theme';
import {
  DATE_BOX_GAP,
  DATE_BOX_HEIGHT,
  DATE_BOX_INSET,
  DATE_BOX_LABEL_TRACKING,
  dateValueType,
} from './dateBox';
import { formatDate, formatDateTime, toDateOnly } from '@/lib/format/date';

export interface DateTimeFieldProps {
  /** Printed inside the box, above the value ("LEAVE", "STARTS"). */
  label: string;
  /** ISO timestamp ('datetime' mode) or 'YYYY-MM-DD' ('date' mode). */
  value: string | null;
  onChange: (iso: string | null) => void;
  /** 'datetime' (default) or a date-only picker (trip dates). */
  mode?: 'datetime' | 'date';
  placeholder?: string;
  error?: string;
  /** Sensible starting point when the field is empty (e.g. trip start date). */
  initialDate?: Date;
  /** Value type: 18/24 in the trip sheets (design), 16/20 in the item editor. */
  size?: 'lg' | 'md';
  /** While a save is on its way: the box can't be opened. */
  disabled?: boolean;
}

/**
 * Native date+time box: the label and value sit inside one 64 pt box (design
 * §05, Dates). iOS shows a datetime picker in a bottom sheet; Android runs the
 * two-step date -> time dialog flow. Web uses DateTimeField.web.tsx (a
 * datetime-local input).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  placeholder = 'Add',
  error,
  initialDate,
  size = 'lg',
  disabled = false,
}: DateTimeFieldProps) {
  const { colors, scheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const current = value
    ? new Date(mode === 'date' ? `${value}T00:00:00` : value)
    : (initialDate ?? new Date());

  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [iosPending, setIosPending] = useState<Date>(current);
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const display = value ? (mode === 'date' ? formatDate(value) : formatDateTime(value)) : null;
  // The picker being open counts as focus, as a TextField's keyboard does.
  const open = iosPickerVisible || androidStep !== null;

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display ?? 'not set'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openPicker}
        style={({ pressed }) => {
          // Pressed or open: inset 2 ink, as a focused TextField.
          const borderWidth = error || pressed || open ? 2 : 1.5;
          return [
            styles.box,
            {
              backgroundColor: colors.paper,
              borderWidth,
              borderColor: error ? colors.danger : pressed || open ? colors.ink : colors.fieldBorder,
              paddingHorizontal: DATE_BOX_INSET - borderWidth,
              opacity: disabled ? disabledOpacity : 1,
            },
          ];
        }}
      >
        <AppText role="tag" tone="secondary" numberOfLines={1} style={styles.label}>
          {label}
        </AppText>
        <AppText
          numberOfLines={1}
          style={[dateValueType[size], { color: value ? colors.ink : colors.ink3 }]}
        >
          {display ?? placeholder}
        </AppText>
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
          animationType={reducedMotion ? 'none' : 'slide'}
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
                textColor={colors.ink}
                themeVariant={scheme}
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
          // 0-based from Sunday (Monday = 1): the module adds 1 to reach
          // java.util.Calendar's MONDAY (2). Passing 2 started weeks on Tuesday.
          firstDayOfWeek={1}
          onChange={onAndroidChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Label over value, centred in the box with a 2 pt gap (design §05).
  box: {
    height: DATE_BOX_HEIGHT,
    borderRadius: radius.input,
    justifyContent: 'center',
    gap: DATE_BOX_GAP,
  },
  label: {
    letterSpacing: DATE_BOX_LABEL_TRACKING,
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

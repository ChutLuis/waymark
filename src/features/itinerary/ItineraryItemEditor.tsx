import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { spacing, useTheme } from '@/theme';
import { itineraryItemSchema, type ItineraryItemForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import { ensureNotificationPermission } from '@/lib/notifications';
import { formatDateTime } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';
import { useDeleteItineraryItem, useSaveItineraryItem } from './hooks';
import {
  REMINDER_OFFSETS,
  reminderFireDate,
  useClearReminder,
  useReminder,
  useSetReminder,
  type ReminderOffset,
} from '@/features/reminders/hooks';

interface ItineraryItemEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  /** null = creating a new item. */
  item: ItineraryItem | null;
  /** Used to seed the date picker for new items. */
  tripStartDate: string | null;
}

const STATUS_OPTIONS: { value: ItineraryItem['status']; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'done', label: 'Done' },
];

function defaultsFor(item: ItineraryItem | null): ItineraryItemForm {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    location: item?.location ?? '',
    startAt: item?.startAt ?? null,
    endAt: item?.endAt ?? null,
    status: item?.status ?? 'planned',
  };
}

export function ItineraryItemEditor({
  visible,
  onClose,
  tripId,
  item,
  tripStartDate,
}: ItineraryItemEditorProps) {
  const { colors } = useTheme();
  const save = useSaveItineraryItem(tripId);
  const remove = useDeleteItineraryItem(tripId);
  const existingReminder = useReminder(item?.id ?? null);
  const setReminder = useSetReminder();
  const clearReminder = useClearReminder();

  const { control, handleSubmit, reset, watch } = useForm<ItineraryItemForm>({
    resolver: zodResolver(itineraryItemSchema),
    defaultValues: defaultsFor(item),
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>(60);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [remindersUnavailable, setRemindersUnavailable] = useState(false);

  useEffect(() => {
    if (visible) {
      reset(defaultsFor(item));
      setReminderEnabled(existingReminder.data != null);
      setReminderOffset(existingReminder.data?.offsetMinutes ?? 60);
      setPermissionDenied(false);
      setRemindersUnavailable(false);
    }
    // Reminder state is intentionally only read when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item, reset]);

  const startAt = watch('startAt');

  const onToggleReminder = useCallback(async (next: boolean) => {
    if (!next) {
      setReminderEnabled(false);
      return;
    }
    const outcome = await ensureNotificationPermission();
    if (outcome === 'granted') {
      setReminderEnabled(true);
    } else if (outcome === 'denied') {
      setPermissionDenied(true);
    } else {
      setRemindersUnavailable(true);
    }
  }, []);

  const onSave = handleSubmit(async (form) => {
    const saved = await save.mutateAsync({
      itemId: item?.id ?? null,
      input: {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        startAt: form.startAt,
        endAt: form.endAt,
        status: form.status,
      },
    });
    if (reminderEnabled && form.startAt) {
      await setReminder.mutateAsync({
        item: { id: saved.id, title: saved.title, tripId },
        startAt: form.startAt,
        offsetMinutes: reminderOffset,
      });
    } else if (item && existingReminder.data) {
      await clearReminder.mutateAsync(item.id);
    }
    onClose();
  });

  const onDelete = async () => {
    if (!item) return;
    const confirmed = await confirmDestructive(
      'Delete this item?',
      'It disappears from the itinerary for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    if (existingReminder.data) await clearReminder.mutateAsync(item.id);
    await remove.mutateAsync(item.id);
    onClose();
  };

  const fireDate =
    reminderEnabled && startAt ? reminderFireDate(startAt, reminderOffset) : null;

  return (
    <Sheet
      visible={visible}
      title={item ? 'Edit item' : 'New item'}
      onClose={onClose}
      actionLabel={item ? 'Save' : 'Add'}
      onAction={onSave}
      actionDisabled={save.isPending}
    >
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoFocus={!item}
          />
        )}
      />
      <Controller
        control={control}
        name="location"
        render={({ field }) => (
          <TextField
            label="Location"
            optionalTag="optional"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Notes"
            optionalTag="optional"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
          />
        )}
      />
      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Controller
            control={control}
            name="startAt"
            render={({ field }) => (
              <DateTimeField
                label="Starts"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add"
                clearable
                initialDate={tripStartDate ? new Date(`${tripStartDate}T10:00:00`) : undefined}
              />
            )}
          />
        </View>
        <View style={styles.dateCol}>
          <Controller
            control={control}
            name="endAt"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="Ends"
                optionalTag="opt."
                value={field.value}
                onChange={field.onChange}
                placeholder="Add"
                clearable
                error={fieldState.error?.message}
                initialDate={startAt ? new Date(startAt) : undefined}
              />
            )}
          />
        </View>
      </View>
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <View>
            <AppText role="label" style={styles.statusLabel}>
              Status
            </AppText>
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              accessibilityLabel="Status"
            />
          </View>
        )}
      />
      {startAt ? (
        <Card padded style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderTitle}>
              <Bell size={17} color={colors.accent.ink} strokeWidth={1.6} />
              <AppText role="bodyStrong" style={styles.reminderTitleText}>
                Remind me
              </AppText>
            </View>
            <Toggle
              value={reminderEnabled}
              onValueChange={onToggleReminder}
              accessibilityLabel="Remind me"
            />
          </View>
          {permissionDenied ? (
            <AppText role="caption" tone="danger" style={styles.reminderCaption}>
              Turn on notifications in Settings to use reminders.
            </AppText>
          ) : remindersUnavailable ? (
            <AppText role="caption" tone="muted" style={styles.reminderCaption}>
              Reminders are available in the mobile app.
            </AppText>
          ) : reminderEnabled ? (
            <>
              <View style={styles.offsetRow}>
                {REMINDER_OFFSETS.map((offset) => (
                  <Chip
                    key={offset.value}
                    label={offset.label}
                    selected={reminderOffset === offset.value}
                    onPress={() => setReminderOffset(offset.value)}
                  />
                ))}
              </View>
              {fireDate ? (
                <AppText role="caption" tone="muted" style={styles.reminderCaption}>
                  Notifies this device {formatDateTime(fireDate.toISOString())}.
                </AppText>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}
      {item ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <AppText role="label" tone="danger">
            Delete item
          </AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    gap: spacing.s3,
  },
  dateCol: {
    flex: 1,
  },
  statusLabel: {
    marginBottom: spacing.s1 + 2,
  },
  reminderCard: {
    paddingVertical: spacing.s3 + 1,
    paddingHorizontal: spacing.s3 + 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2 + 1,
  },
  reminderTitleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  offsetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginTop: spacing.s3,
  },
  reminderCaption: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.s2 + 2,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.s2,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DatePair } from '@/components/DatePair';
import { DateTimeField } from '@/components/DateTimeField';
import { ErrorBanner } from '@/components/ErrorBanner';
import { EDITOR_OFFLINE_HINT, EDITOR_OFFLINE_QUEUED, OfflineNotice } from '@/components/OfflineNotice';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet, type DiscardConfirm } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { hitTargetMin, iconStrokeWidth, spacing, typeScale, useTheme } from '@/theme';
import { itineraryItemSchemaFor, type ItineraryItemForm } from '@/lib/validation/schemas';
import { confirmDestructive } from '@/lib/confirm';
import { formatDateTime } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';
import { useIsOnline } from '@/lib/useIsOnline';
import { useDraftId, useResetOnOpen } from '@/lib/query/queued';
import { useDeleteItineraryItem, useSaveItineraryItem } from './hooks';
import { newItemStartAt, tripDayBounds } from './group';
import {
  REMINDER_OFFSETS,
  ensureReminderPermission,
  reminderFireDate,
  useClearReminder,
  useReminder,
  useSetReminder,
  type ReminderOffset,
} from '@/features/reminders/hooks';
import { markErrorShown } from '@/features/offline/queuedErrors';
import { ExactAlarmHint } from '@/features/reminders/ExactAlarmHint';
import { useRemindersEnabled } from '@/features/reminders/preference';

interface ItineraryItemEditorProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  /** null = creating a new item. */
  item: ItineraryItem | null;
  /** Used to seed the date picker for new items, and with the end to keep stops within the trip. */
  tripStartDate: string | null;
  tripEndDate: string | null;
  /** Selected Plan day for a new item; ANY/null keep it unscheduled. */
  selectedDay?: string | null;
}

const STATUS_OPTIONS: { value: ItineraryItem['status']; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'done', label: 'Done' },
];

const DISCARD_NEW_STOP: DiscardConfirm = {
  title: 'Discard this stop?',
  message: 'It hasn’t been added to the plan yet.',
  confirmLabel: 'Discard',
};

const DISCARD_STOP_EDITS: DiscardConfirm = {
  title: 'Discard changes?',
  message: 'Your edits to this stop won’t be saved.',
  confirmLabel: 'Discard',
};

function defaultsFor(item: ItineraryItem | null, selectedDay: string | null): ItineraryItemForm {
  return {
    title: item?.title ?? '',
    description: item?.description ?? '',
    location: item?.location ?? '',
    startAt: item ? item.startAt : newItemStartAt(selectedDay),
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
  tripEndDate,
  selectedDay = null,
}: ItineraryItemEditorProps) {
  const { colors } = useTheme();
  // A dated trip keeps its stops on its days (an end may run into the day
  // after): the pickers stop at its edges, and a new or changed date outside
  // them is a field error, not a save. A date the stop already had is left
  // alone, so an older stop off the trip's days can still be edited.
  const bounds = useMemo(() => tripDayBounds(tripStartDate, tripEndDate), [tripStartDate, tripEndDate]);
  const savedStartAt = item?.startAt ?? null;
  const savedEndAt = item?.endAt ?? null;
  const schema = useMemo(
    () =>
      itineraryItemSchemaFor(
        bounds && tripStartDate && tripEndDate ? { startDate: tripStartDate, endDate: tripEndDate } : null,
        item ? { startAt: savedStartAt, endAt: savedEndAt } : null,
      ),
    [bounds, tripStartDate, tripEndDate, item, savedStartAt, savedEndAt],
  );
  const save = useSaveItineraryItem(tripId);
  const remove = useDeleteItineraryItem(tripId);
  const existingReminder = useReminder(item?.id ?? null);
  const setReminder = useSetReminder();
  const clearReminder = useClearReminder();
  // Only this sheet's own writes lock it (a save queued offline earlier is still pending).
  useResetOnOpen(visible, save.reset);
  useResetOnOpen(visible, remove.reset);
  useResetOnOpen(visible, setReminder.reset);
  useResetOnOpen(visible, clearReminder.reset);

  const { control, handleSubmit, reset, setValue, formState: { isDirty, isSubmitting } } = useForm<ItineraryItemForm>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(item, selectedDay),
  });

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>(60);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [remindersUnavailable, setRemindersUnavailable] = useState(false);
  const remindersOn = useRemindersEnabled();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Everything that is still on its way, reminders included: the form stays
  // locked (and can't be saved twice or discarded) until it lands.
  const busy =
    isSubmitting || save.isPending || remove.isPending || setReminder.isPending || clearReminder.isPending;
  const saving = useRef(false);
  const online = useIsOnline();
  // A locked field that still has focus would keep taking keystrokes.
  useEffect(() => {
    if (busy) Keyboard.dismiss();
  }, [busy]);
  const [session, setSession] = useState<{
    id: number;
    visible: boolean;
    item: ItineraryItem | null;
    selectedDay: string | null;
  }>({ id: 0, visible: false, item: null, selectedDay: null });
  // Until this device's reminders have loaded, an existing stop's reminder is
  // unknown: not a change, and not something a save may clear. A new stop has
  // none, so it is known from the start.
  const [reminderKnown, setReminderKnown] = useState(false);
  if (session.visible !== visible || session.item !== item || session.selectedDay !== selectedDay) {
    setSession({ id: session.id + 1, visible, item, selectedDay });
    if (visible) {
      setReminderKnown(item === null || existingReminder.data !== undefined);
      setReminderEnabled(existingReminder.data != null);
      setReminderOffset(existingReminder.data?.offsetMinutes ?? 60);
      setPermissionDenied(false);
      setRemindersUnavailable(false);
      setSaveError(null);
    }
  } else if (visible && !reminderKnown && existingReminder.data !== undefined) {
    setReminderKnown(true);
    setReminderEnabled(existingReminder.data !== null);
    setReminderOffset(existingReminder.data?.offsetMinutes ?? 60);
  }
  // A save queued offline can land after the sheet closed, or while it shows
  // another stop: it may only close the session it was started from.
  const liveSession = useRef(0);
  useEffect(() => {
    liveSession.current = visible ? session.id : -1;
  }, [visible, session.id]);
  const closeSession = (id: number) => {
    if (liveSession.current === id) onClose();
  };

  useEffect(() => {
    if (visible) {
      reset(defaultsFor(item, selectedDay));
    }
  }, [visible, item, selectedDay, reset]);

  const startAt = useWatch({ control, name: 'startAt' });
  const endAt = useWatch({ control, name: 'endAt' });

  const onToggleReminder = useCallback(async (next: boolean) => {
    if (!next) {
      setReminderEnabled(false);
      return;
    }
    const outcome = await ensureReminderPermission();
    if (outcome === 'granted') {
      setReminderEnabled(true);
    } else if (outcome === 'denied') {
      setPermissionDenied(true);
    } else {
      setRemindersUnavailable(true);
    }
  }, []);

  // A failed save keeps the sheet open with everything typed, so Save can
  // simply be tapped again.
  // handleSubmit runs from the tap, not during render.
  const onSave = () =>
    handleSubmit(async (form) => {
      if (saving.current) return;
      saving.current = true;
      try {
        await saveStop(form);
      } finally {
        saving.current = false;
      }
    })();

  const draftId = useDraftId(session.id);
  const saveStop = async (form: ItineraryItemForm) => {
    const sessionId = session.id;
    setSaveError(null);
    // A new stop's id is known before the save lands, so its reminder can be
    // set now: offline, the save may land after Waymark was closed.
    const stopId = item?.id ?? draftId;
    const saving = save.mutateAsync({
      clientId: stopId,
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
    // Handled below, once the reminder is set.
    saving.catch(() => {});
    // A reminder that can't be set doesn't stop the save.
    const reminderSet = await applyReminder(form, stopId);
    try {
      await saving;
    } catch (error) {
      // The stop doesn't exist, so neither may its reminder. (The save's own
      // failure handler does the same if it fails after a restart.)
      if (!item && reminderSet) await clearReminder.mutateAsync(stopId).catch(() => {});
      if (liveSession.current === sessionId) {
        markErrorShown(error);
        setSaveError("Couldn't save this stop. Check your connection and try again.");
      }
      return;
    }
    closeSession(sessionId);
  };

  /** Sets, moves or clears the stop's reminder as the sheet says; true when one was set. */
  const applyReminder = async (form: ItineraryItemForm, stopId: string): Promise<boolean> => {
    try {
      if (!reminderKnown) {
        // Nothing to decide yet: leave whatever reminder this device has.
      } else if (remindersOn && reminderEnabled && form.startAt) {
        await setReminder.mutateAsync({
          item: { id: stopId, title: form.title, tripId },
          startAt: form.startAt,
          offsetMinutes: reminderOffset,
        });
        return true;
      } else if (item && existingReminder.data) {
        await clearReminder.mutateAsync(item.id);
      }
    } catch {
      // Reminders are best-effort and local to this device.
    }
    return false;
  };

  const onDelete = async () => {
    if (!item || busy) return;
    const sessionId = session.id;
    const confirmed = await confirmDestructive(
      'Delete this item?',
      'It disappears from the itinerary for everyone on the trip.',
      'Delete',
    );
    if (!confirmed) return;
    setSaveError(null);
    try {
      await remove.mutateAsync({ itemId: item.id });
    } catch (error) {
      if (liveSession.current === sessionId) {
        markErrorShown(error);
        setSaveError("Couldn't delete this stop. Check your connection and try again.");
      }
      return;
    }
    if (existingReminder.data) await clearReminder.mutateAsync(item.id).catch(() => {});
    closeSession(sessionId);
  };

  const fireDate =
    reminderEnabled && startAt ? reminderFireDate(startAt, reminderOffset) : null;
  const savedReminder = existingReminder.data ?? null;
  const reminderChanged =
    reminderKnown &&
    (reminderEnabled !== (savedReminder !== null) ||
      (savedReminder !== null && reminderEnabled && reminderOffset !== savedReminder.offsetMinutes));
  // A save already on its way can't be discarded.
  const discardConfirm =
    (isDirty || reminderChanged) && !busy ? (item ? DISCARD_STOP_EDITS : DISCARD_NEW_STOP) : null;

  return (
    <Sheet
      visible={visible}
      title={item ? 'Edit item' : 'New item'}
      onClose={onClose}
      discardConfirm={discardConfirm}
      actionLabel={item ? 'Save' : 'Add'}
      onAction={onSave}
      actionDisabled={busy}
    >
      {!online ? <OfflineNotice message={busy ? EDITOR_OFFLINE_QUEUED : EDITOR_OFFLINE_HINT} reveal={busy} /> : null}
      {saveError ? <ErrorBanner message={saveError} /> : null}
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
            editable={!busy}
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
            editable={!busy}
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
            editable={!busy}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
          />
        )}
      />
      <DatePair
        clearLabel="Clear times"
        onClear={
          (startAt || endAt) && !busy
            ? () => {
                setValue('startAt', null, { shouldDirty: true });
                setValue('endAt', null, { shouldDirty: true });
              }
            : undefined
        }
        start={
          <Controller
            control={control}
            name="startAt"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="STARTS"
                size="md"
                disabled={busy}
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                error={fieldState.error?.message}
                minimumDate={bounds?.minimumDate}
                maximumDate={bounds?.maximumDate}
                initialDate={
                  selectedDay && selectedDay !== 'ANY'
                    ? new Date(`${selectedDay}T10:00:00`)
                    : tripStartDate ? new Date(`${tripStartDate}T10:00:00`) : undefined
                }
              />
            )}
          />
        }
        end={
          <Controller
            control={control}
            name="endAt"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="ENDS"
                size="md"
                disabled={busy}
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                error={fieldState.error?.message}
                initialDate={startAt ? new Date(startAt) : undefined}
                minimumDate={bounds?.minimumDate}
                maximumDate={bounds?.latestEnd}
              />
            )}
          />
        }
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <View>
            <AppText role="kicker" style={styles.statusLabel}>
              Status
            </AppText>
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              accessibilityLabel="Status"
              disabled={busy}
            />
          </View>
        )}
      />
      {startAt && remindersOn ? (
        <Card padded style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderTitle}>
              <Bell size={17} color={colors.ink} strokeWidth={iconStrokeWidth} />
              <AppText role="button" style={styles.reminderTitleText}>
                Remind me
              </AppText>
            </View>
            <Toggle
              value={reminderEnabled}
              onValueChange={onToggleReminder}
              accessibilityLabel="Remind me"
              disabled={busy}
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
                    disabled={busy}
                  />
                ))}
              </View>
              {fireDate ? (
                <AppText role="caption" tone="muted" style={styles.reminderCaption}>
                  Notifies this device {formatDateTime(fireDate.toISOString())}.
                </AppText>
              ) : null}
              <ExactAlarmHint />
            </>
          ) : null}
        </Card>
      ) : null}
      {item ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteButton, (pressed || busy) && styles.pressed]}
        >
          <AppText role="button" tone="danger">
            Delete item
          </AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
    fontSize: typeScale.tagLabel.fontSize,
    lineHeight: typeScale.tagLabel.lineHeight,
  },
  offsetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginTop: spacing.s3,
  },
  reminderCaption: {
    marginTop: spacing.s2 + 2,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.s2,
    minHeight: hitTargetMin,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

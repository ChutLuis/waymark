import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DateRangeField } from '@/components/DateRangeField';
import { Sheet, type DiscardConfirm } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import { spacing } from '@/theme';
import type { Trip } from '@/lib/types';
import { useUpdateTrip } from './hooks';
import { CountryField } from './CountryField';
import { CountryPicker } from './CountryPicker';
import { EDITOR_OFFLINE_HINT, EDITOR_OFFLINE_QUEUED, OfflineNotice } from '@/components/OfflineNotice';
import { markErrorShown } from '@/features/offline/queuedErrors';
import { useIsOnline } from '@/lib/useIsOnline';
import { failureMessage } from './errors';
import { useItinerary } from '@/features/itinerary/hooks';
import { stopsLeavingDates } from '@/features/itinerary/group';

function defaultsFor(trip: Trip): TripForm {
  return {
    name: trip.name,
    destination: trip.destination ?? '',
    startDate: trip.startDate,
    endDate: trip.endDate,
  };
}

const DISCARD_EDITS: DiscardConfirm = {
  title: 'Discard changes?',
  message: 'Your edits to this trip won’t be saved.',
  confirmLabel: 'Discard',
};

interface EditTripSheetProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
}

/**
 * Owner-only trip edit flow. The design references an "existing edit flow";
 * none shipped, so this reuses the create form's validation against
 * `useUpdateTrip` (RLS limits the update to the owner). Flagged in the report.
 */
export function EditTripSheet({ visible, onClose, trip }: EditTripSheetProps) {
  const update = useUpdateTrip(trip.id);
  const online = useIsOnline();
  const [pickingCountry, setPickingCountry] = useState(false);

  const { control, formState, handleSubmit, reset, setValue } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: defaultsFor(trip),
  });

  // Each open starts from the saved trip: a cancelled edit (e.g. Clear dates)
  // must not survive into the next open, like the other editors.
  const { reset: resetUpdate } = update;
  const [wasVisible, setWasVisible] = useState(visible);
  const [sessionId, setSessionId] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setSessionId(sessionId + 1);
    if (visible) setPickingCountry(false);
  }
  // An edit queued offline can land after the sheet closed (or reopened): it
  // may only close, or report into, the session it was made in.
  const liveSession = useRef(0);
  useEffect(() => {
    liveSession.current = visible ? sessionId : -1;
  }, [visible, sessionId]);
  useEffect(() => {
    if (visible) {
      reset(defaultsFor(trip));
      resetUpdate();
    }
    // Only reset when the sheet transitions to visible so background refetches
    // don't wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const [startDate, endDate, name, destination] = useWatch({
    control,
    name: ['startDate', 'endDate', 'name', 'destination'],
  });

  // Stops the new dates leave out move under Plan's trailing stamp; say so
  // before saving (nothing is blocked or deleted).
  const itinerary = useItinerary(trip.id);
  const leaving = useMemo(
    () =>
      stopsLeavingDates(
        itinerary.data ?? [],
        { startDate: trip.startDate, endDate: trip.endDate },
        { startDate, endDate: endDate ?? startDate },
      ),
    [itinerary.data, trip.startDate, trip.endDate, startDate, endDate],
  );

  // Offline the edit waits for the connection (kept on the device), and the
  // last edit sent wins (DESIGN_DECISIONS §8).
  // handleSubmit runs from the tap, not during render.
  const onSave = () =>
    handleSubmit(async (form) => {
      const id = sessionId;
      // Only what changed: an edit queued earlier (offline, not sent yet) must
      // not be undone by this one carrying the older values.
      const dirty = formState.dirtyFields;
      const datesChanged = Boolean(dirty.startDate || dirty.endDate);
      try {
        await update.mutateAsync({
          ...(dirty.name ? { name: form.name } : {}),
          ...(dirty.destination ? { destination: form.destination || null } : {}),
          ...(datesChanged ? { startDate: form.startDate, endDate: form.endDate ?? form.startDate } : {}),
        });
        if (liveSession.current === id) onClose();
      } catch (error) {
        // Shown below via update.isError while this sheet is still open.
        if (liveSession.current === id) markErrorShown(error);
      }
    })();
  const busy = formState.isSubmitting || update.isPending;

  if (pickingCountry) {
    return (
      <Sheet
        visible={visible}
        size="tall"
        title="All countries"
        cancelLabel="Back"
        bodyMode="static"
        onClose={() => {
          Keyboard.dismiss();
          setPickingCountry(false);
        }}
      >
        <CountryPicker
          value={destination}
          onSelect={(selected) => {
            setValue('destination', selected, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            setPickingCountry(false);
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      title="Edit trip"
      onClose={onClose}
      // A save already on its way can't be discarded.
      discardConfirm={formState.isDirty && !busy ? DISCARD_EDITS : null}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={name.trim().length === 0 || busy}
    >
      {!online ? <OfflineNotice message={busy ? EDITOR_OFFLINE_QUEUED : EDITOR_OFFLINE_HINT} reveal={busy} /> : null}
      {/* Locked until what was sent lands, like the other editors. */}
      <View pointerEvents={busy ? 'none' : 'auto'} style={styles.fields}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="TRIP NAME"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              editable={!busy}
            />
          )}
        />
        <Controller
          control={control}
          name="destination"
          render={({ field, fieldState }) => (
            <CountryField
              value={field.value}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              onSelect={(selected) => {
                setValue('destination', selected, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              }}
              onOpen={() => {
                Keyboard.dismiss();
                setPickingCountry(true);
              }}
            />
          )}
        />
        <DateRangeField
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: nextStart, endDate: nextEnd }) => {
            setValue('startDate', nextStart, { shouldDirty: true, shouldValidate: true });
            setValue('endDate', nextEnd, { shouldDirty: true, shouldValidate: true });
          }}
        />
        {leaving > 0 ? (
          <AppText role="bodySm" tone="secondary" accessibilityLiveRegion="polite">
            {leaving === 1 ? '1 stop will move to Unscheduled.' : `${leaving} stops will move to Unscheduled.`}
          </AppText>
        ) : null}
      </View>
      {update.isError ? (
        <View style={styles.failure}>
          <AppText role="bodySm" tone="danger" accessibilityRole="alert">
            {failureMessage(update.error, 'Your changes couldn’t be saved. Try again.')}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            disabled={busy}
            onPress={onSave}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  failure: { gap: spacing.s4 },
  fields: { gap: spacing.s6 },
});

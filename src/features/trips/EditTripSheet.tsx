import { useEffect, useState } from 'react';
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
import { OfflineNotice } from '@/components/OfflineNotice';
import { useIsOnline } from '@/lib/useIsOnline';
import { failureMessage } from './errors';

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
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPickingCountry(false);
  }
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

  const onSave = handleSubmit(async (form) => {
    const normalizedEnd = form.endDate ?? form.startDate;
    try {
      await update.mutateAsync({
        name: form.name,
        destination: form.destination || null,
        startDate: form.startDate,
        endDate: normalizedEnd,
      });
      onClose();
    } catch {
      // Mutation error state is surfaced via update.isError.
    }
  });

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
      discardConfirm={formState.isDirty ? DISCARD_EDITS : null}
      actionLabel="Save"
      onAction={onSave}
      // Offline, a save would wait silently; the notice says why it's off.
      actionDisabled={name.trim().length === 0 || !online || formState.isSubmitting || update.isPending}
    >
      {!online ? (
        <OfflineNotice message="You’re offline. You can save your changes once you’re back online." />
      ) : null}
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
      {update.isError ? (
        <View style={styles.failure}>
          <AppText role="bodySm" tone="danger" accessibilityRole="alert">
            {failureMessage(update.error, 'Your changes couldn’t be saved. Try again.')}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            disabled={!online || formState.isSubmitting || update.isPending}
            onPress={onSave}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  failure: { gap: spacing.s4 },
});

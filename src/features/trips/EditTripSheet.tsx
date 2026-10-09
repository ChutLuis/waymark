import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { DatePair } from '@/components/DatePair';
import { DateTimeField } from '@/components/DateTimeField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import type { Trip } from '@/lib/types';
import { useUpdateTrip } from './hooks';

function defaultsFor(trip: Trip): TripForm {
  return {
    name: trip.name,
    destination: trip.destination ?? '',
    startDate: trip.startDate,
    endDate: trip.endDate,
  };
}

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

  const { control, handleSubmit, reset, watch, setValue } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: defaultsFor(trip),
  });

  // Each open starts from the saved trip: a cancelled edit (e.g. Clear dates)
  // must not survive into the next open, like the other editors.
  const { reset: resetUpdate } = update;
  useEffect(() => {
    if (visible) {
      reset(defaultsFor(trip));
      resetUpdate();
    }
  }, [visible, trip, reset, resetUpdate]);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const name = watch('name');

  const onSave = handleSubmit(async (form) => {
    await update.mutateAsync({
      name: form.name,
      destination: form.destination || null,
      startDate: form.startDate,
      endDate: form.endDate,
    });
    onClose();
  });

  return (
    <Sheet
      visible={visible}
      title="Edit trip"
      onClose={onClose}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={name.trim().length === 0 || update.isPending}
    >
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
        render={({ field }) => (
          <TextField
            label="Destination"
            optionalTag="optional"
            placeholder="City, country"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      {/* One "Clear dates" link below the pair clears both (item N14). */}
      <DatePair
        clearLabel="Clear dates"
        onClear={
          startDate || endDate
            ? () => {
                setValue('startDate', null, { shouldDirty: true });
                setValue('endDate', null, { shouldDirty: true });
              }
            : undefined
        }
        start={
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DateTimeField
                label="STARTS"
                optionalTag="optional"
                compact
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
              />
            )}
          />
        }
        end={
          <Controller
            control={control}
            name="endDate"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="ENDS"
                optionalTag="optional"
                compact
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                error={fieldState.error?.message}
                initialDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
              />
            )}
          />
        }
      />
      {update.isError ? (
        <Button label="Try again" variant="secondary" onPress={onSave} />
      ) : null}
    </Sheet>
  );
}

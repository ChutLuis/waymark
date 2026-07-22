import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { spacing } from '@/theme';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import { useCreateTrip } from './hooks';
import type { Trip } from '@/lib/types';

interface CreateTripSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new trip so the caller can navigate into it. */
  onCreated: (trip: Trip) => void;
}

export function CreateTripSheet({ visible, onClose, onCreated }: CreateTripSheetProps) {
  const createTrip = useCreateTrip();

  const { control, handleSubmit, watch } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { name: '', destination: '', startDate: null, endDate: null },
  });

  const startDate = watch('startDate');
  const name = watch('name');

  const onCreate = handleSubmit(async (form) => {
    const trip = await createTrip.mutateAsync({
      name: form.name,
      destination: form.destination || null,
      startDate: form.startDate,
      endDate: form.endDate,
    });
    onCreated(trip);
  });

  return (
    <Sheet
      visible={visible}
      title="New trip"
      onClose={onClose}
      actionLabel="Create"
      onAction={onCreate}
      actionDisabled={name.trim().length === 0 || createTrip.isPending}
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Name"
            placeholder="Where to?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoFocus
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
      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DateTimeField
                label="Starts"
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                clearable
              />
            )}
          />
        </View>
        <View style={styles.dateCol}>
          <Controller
            control={control}
            name="endDate"
            render={({ field, fieldState }) => (
              <DateTimeField
                label="Ends"
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                clearable
                error={fieldState.error?.message}
                initialDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
              />
            )}
          />
        </View>
      </View>
      {createTrip.isError ? (
        <Button label="Try again" variant="secondary" onPress={onCreate} />
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
});

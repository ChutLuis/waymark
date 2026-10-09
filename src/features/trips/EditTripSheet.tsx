import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { spacing } from '@/theme';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import type { Trip } from '@/lib/types';
import { useUpdateTrip } from './hooks';

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

  const { control, handleSubmit, watch, setValue } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    values: {
      name: trip.name,
      destination: trip.destination ?? '',
      startDate: trip.startDate,
      endDate: trip.endDate,
    },
  });

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
      {/* 64 pt boxes like New trip, so a full date never wraps beside a Clear
          link; one "Clear dates" link below the pair clears both (item N14). */}
      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <DateTimeField
                label="STARTS"
                variant="box"
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
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
                label="ENDS"
                variant="box"
                mode="date"
                value={field.value}
                onChange={field.onChange}
                placeholder="Add date"
                error={fieldState.error?.message}
                initialDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined}
              />
            )}
          />
        </View>
      </View>
      {startDate || endDate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear dates"
          hitSlop={8}
          onPress={() => {
            setValue('startDate', null, { shouldDirty: true });
            setValue('endDate', null, { shouldDirty: true });
          }}
          style={({ pressed }) => [styles.clearDates, pressed && styles.pressed]}
        >
          <AppText role="link" tone="muted">Clear dates</AppText>
        </Pressable>
      ) : null}
      {update.isError ? (
        <Button label="Try again" variant="secondary" onPress={onSave} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: spacing.s5 },
  dateCol: { flex: 1 },
  clearDates: { alignSelf: 'flex-start', marginTop: spacing.s4 },
  pressed: { opacity: 0.7 },
});

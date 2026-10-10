import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DatePair } from '@/components/DatePair';
import { DateTimeField } from '@/components/DateTimeField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { EmptyStampSlot } from '@/components/StateViews';
import { SceneStamp } from '@/features/trips/SceneStamp';
import { TripPreviewCard } from '@/features/trips/TripPreviewCard';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import {
  DESTINATION_INFO,
  denomination,
  formatTripRange,
  matchDestination,
  stampName,
  tripDays,
  tripNights,
} from '@/features/trips/destinations';
import { fontFamilies, spacing, useTheme } from '@/theme';
import { pickImage, type PickedImage } from '@/lib/images';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import { useCreateTrip } from './hooks';
import type { Trip } from '@/lib/types';

interface CreateTripSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new trip so the caller can navigate into it. */
  onCreated: (trip: Trip) => void;
}

/** "13–23 NOV · 10 NIGHTS": the trip cards' compact range, in caps. */
function rangeKicker(start: string | null, end: string | null): string {
  if (!start || !end) return 'ADD DATES';
  const nights = tripNights(start, end);
  return `${formatTripRange(start, end).toUpperCase()} · ${nights} ${nights === 1 ? 'NIGHT' : 'NIGHTS'}`;
}

export function CreateTripSheet({ visible, onClose, onCreated }: CreateTripSheetProps) {
  const { colors } = useTheme();
  const createTrip = useCreateTrip();
  const [photo, setPhoto] = useState<PickedImage | null>(null);

  const { control, handleSubmit, setValue, watch } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { name: '', destination: '', startDate: null, endDate: null },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const name = watch('name');
  const destination = watch('destination');

  const country = matchDestination(destination);
  const info = country ? DESTINATION_INFO[country] : null;
  const days = tripDays(startDate, endDate);
  // Same letter the trip card, Trip tab, Profile and Join card show: the
  // name's, or the destination's while the name is still empty.
  const stampInitial = (name.trim()[0] ?? destination.trim()[0] ?? '?').toUpperCase();

  const onPickPhoto = async () => {
    const picked = await pickImage([16, 9]);
    if (picked) setPhoto(picked);
  };

  const onCreate = handleSubmit(async (form) => {
    const trip = await createTrip.mutateAsync({
      name: form.name,
      destination: form.destination || null,
      startDate: form.startDate,
      endDate: form.endDate,
      coverImage: photo,
    });
    // The route wrapper (`trips/new.tsx`) navigates on onCreated.
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
      <TripPreviewCard
        pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'}
        style={styles.preview}
        stamp={
          photo ? (
            <SceneStamp band="md" image={{ uri: photo.uri }} denomination={null} name={null} />
          ) : country && days > 0 ? (
            <SceneStamp
              band="md"
              image={DESTINATION_ART[country].sceneStampStill}
              denomination={denomination(country, days)}
              name={info?.stampName ?? ''}
            />
          ) : country ? (
            <SceneStamp band="md" image={DESTINATION_ART[country].sceneStampStill} denomination={null} name={info?.stampName ?? ''} />
          ) : destination ? (
            <SceneStamp band="md" image={null} initial={stampInitial} name={stampName(destination)} />
          ) : (
            <EmptyStampSlot width={88} height={104} />
          )
        }
      >
        <AppText role="kicker" tone="secondary">PREVIEW</AppText>
        <AppText role="cardTitleSm" numberOfLines={1} style={styles.previewName}>
          {name || 'Your trip'}
        </AppText>
        <AppText role="meta" tone="secondary" style={styles.previewMeta}>
          {info ? info.region : destination || 'Where to?'}
        </AppText>
        <AppText role="kickerLg" style={styles.previewRange}>
          {rangeKicker(startDate, endDate)}
        </AppText>
      </TripPreviewCard>

      <View style={styles.helperRow}>
        <AppText role="bodySm" tone="secondary" style={styles.helperText}>
          The stamp and the border pattern come from the destination.
        </AppText>
        <Button
          label="Use a photo"
          variant="quiet"
          size="sm"
          onPress={onPickPhoto}
          style={{ borderColor: colors.ink }}
        />
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="TRIP NAME"
            placeholder="Antigua & Tikal"
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
            placeholder="City, country"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            trailing={
              country ? (
                <View style={styles.stampReady}>
                  <Check size={16} color={colors.success} strokeWidth={2.6} />
                  <AppText style={[styles.stampReadyText, { color: colors.success }]}>
                    Stamp ready
                  </AppText>
                </View>
              ) : null
            }
          />
        )}
      />

      <DatePair
        label="DATES"
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
                label="LEAVE"
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
                label="RETURN"
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

      {createTrip.isError ? (
        <Button label="Try again" variant="secondary" onPress={onCreate} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Escape the 24 pt column to the 14 pt card gutter (the sheet body is the
  // padded container, so this negative margin is not clamped by the ScrollView).
  preview: { marginHorizontal: -10 },
  previewName: { marginTop: 8 },
  previewMeta: { marginTop: 2 },
  previewRange: { marginTop: 10 },
  // The sheet content already sits at the 24 pt column; the row extends 4 pt to
  // the right so the "Use a photo" button ends 20 pt from the sheet edge (item 21).
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s5, marginRight: -4 },
  helperText: { flex: 1 },
  stampReady: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stampReadyText: { fontFamily: fontFamilies.semibold, fontSize: 14, lineHeight: 18 },
});

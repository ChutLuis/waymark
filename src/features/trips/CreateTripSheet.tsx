import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { PatternBand } from '@/components/airmail/PatternBand';
import { SceneStamp } from '@/features/trips/SceneStamp';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import {
  DESTINATION_INFO,
  denomination,
  matchDestination,
  tripNights,
} from '@/features/trips/destinations';
import { spacing, useTheme } from '@/theme';
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

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function rangeKicker(start: string | null, end: string | null): string {
  if (!start || !end) return 'ADD DATES';
  const s = start.split('-').map(Number);
  const e = end.split('-').map(Number);
  const nights = tripNights(start, end);
  const left = `${s[2]} ${MONTHS[s[1] - 1]}`;
  const right = `${e[2]} ${MONTHS[e[1] - 1]}`;
  return `${left} – ${right} · ${nights} ${nights === 1 ? 'NIGHT' : 'NIGHTS'}`;
}

export function CreateTripSheet({ visible, onClose, onCreated }: CreateTripSheetProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const createTrip = useCreateTrip();
  const [photo, setPhoto] = useState<PickedImage | null>(null);

  const { control, handleSubmit, watch } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { name: '', destination: '', startDate: null, endDate: null },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const name = watch('name');
  const destination = watch('destination');

  const country = matchDestination(destination);
  const info = country ? DESTINATION_INFO[country] : null;
  const nights = tripNights(startDate, endDate);
  const days = nights > 0 ? nights + 1 : 0;

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
    onCreated(trip);
    router.replace(`/trips/${trip.id}` as never);
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
      <View style={[styles.preview, { backgroundColor: colors.paper }]}>
        <View style={styles.previewRow}>
          <View style={styles.previewText}>
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
            <View style={[styles.rule, { backgroundColor: colors.rule }]} />
            <View style={[styles.rule, { backgroundColor: colors.rule }]} />
          </View>
          <View style={styles.previewStamp}>
            {photo ? (
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
              <SceneStamp band="md" image={null} initial={(destination[0] ?? '?').toUpperCase()} name={destination.toUpperCase()} />
            ) : (
              <SceneStamp band="md" image={null} initial={undefined} name={undefined} />
            )}
          </View>
        </View>
        <PatternBand pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'} height={8} />
      </View>

      <View style={styles.helperRow}>
        <AppText role="bodySm" tone="secondary" style={styles.helperText}>
          The stamp and the border pattern come from the destination.
        </AppText>
        <Button label="Use a photo" variant="quiet" size="sm" onPress={onPickPhoto} />
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Trip name"
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
          <View>
            <TextField
              label="Destination"
              optionalTag="optional"
              placeholder="City, country"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
            {country ? (
              <View style={styles.stampReady}>
                <Check size={16} color={colors.success} strokeWidth={2.6} />
                <AppText role="metaSm" style={{ color: colors.success }}>
                  Stamp ready
                </AppText>
              </View>
            ) : null}
          </View>
        )}
      />

      <View>
        <AppText role="kicker" tone="secondary" style={styles.datesLabel}>
          DATES
        </AppText>
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DateTimeField
                  label="LEAVE"
                  variant="box"
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
                  label="RETURN"
                  variant="box"
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
      </View>

      {createTrip.isError ? (
        <Button label="Try again" variant="secondary" onPress={onCreate} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: 4,
    paddingTop: 16,
    paddingBottom: 0,
    paddingHorizontal: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 12px 24px -12px rgba(21,34,59,0.4)',
  },
  previewRow: { flexDirection: 'row', gap: spacing.s6 },
  previewText: { flex: 1, minWidth: 0, paddingBottom: 22 },
  previewName: { marginTop: 8 },
  previewMeta: { marginTop: 2 },
  previewRange: { marginTop: 10 },
  rule: { height: 1, marginTop: 14 },
  previewStamp: { flexShrink: 0 },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s5, paddingHorizontal: spacing.s6 },
  helperText: { flex: 1 },
  stampReady: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s3 },
  datesLabel: { marginBottom: spacing.s3 },
  dateRow: { flexDirection: 'row', gap: spacing.s4 },
  dateCol: { flex: 1 },
});
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onlineManager } from '@tanstack/react-query';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { DateRangeField } from '@/components/DateRangeField';
import { OfflineNotice } from '@/components/OfflineNotice';
import { Sheet, type DiscardConfirm } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { EmptyStampSlot } from '@/components/StateViews';
import { SceneStamp } from '@/features/trips/SceneStamp';
import { TripPreviewCard } from '@/features/trips/TripPreviewCard';
import { DESTINATION_ART } from '@/features/trips/destinationArt';
import {
  DESTINATION_INFO,
  daysUntilLabelUppercase,
  denomination,
  matchDestination,
  normaliseDestination,
  stampName,
  tripDays,
} from '@/features/trips/destinations';
import { hitTargetMin, radius, spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';
import { useIsOnline } from '@/lib/useIsOnline';
import { haptic } from '@/lib/haptics';
import { pickImage, type PickedImage } from '@/lib/images';
import { tripSchema, type TripForm } from '@/lib/validation/schemas';
import { useCreateTrip } from './hooks';
import { findCountry } from './countries';
import { CountryField } from './CountryField';
import { CountryPicker } from './CountryPicker';
import { failureMessage } from './errors';
import { addressDates, envelopeNote, isDaysAway } from './stack';
import type { Trip } from '@/lib/types';

interface CreateTripSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the new trip so the caller can navigate into it. */
  onCreated: (trip: Trip) => void;
}

const DISCARD_NEW_TRIP: DiscardConfirm = {
  title: 'Discard this trip?',
  message: 'It hasn’t been created yet, so what you’ve entered will be lost.',
  confirmLabel: 'Discard',
};

/** Above this text scale the photo button no longer fits beside its copy. */
const HELPER_STACK_FONT_SCALE = 1.3;

const OFFLINE_HINT = 'You’re offline. Tap Create and the trip will be created when you’re back online.';
const QUEUED_MESSAGE = 'You’re offline — the trip will be created when you’re back online.';

export function CreateTripSheet({ visible, onClose, onCreated }: CreateTripSheetProps) {
  const { colors } = useTheme();
  const createTrip = useCreateTrip();
  const online = useIsOnline();
  const stackHelper = useWindowDimensions().fontScale > HELPER_STACK_FONT_SCALE;
  const todayIso = useMemo(() => toDateOnly(new Date()), []);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [pickingCountry, setPickingCountry] = useState(false);
  // Create was tapped offline: it is sent as soon as the connection is back,
  // with whatever the form holds by then. Closing the sheet drops it.
  const [queued, setQueued] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(false);
  const lastAutoName = useRef<string>('');

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const { control, formState, handleSubmit, setValue } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: { name: '', destination: '', startDate: null, endDate: null },
  });

  const [startDate, endDate, name, destination] = useWatch({
    control,
    name: ['startDate', 'endDate', 'name', 'destination'],
  });

  const country = matchDestination(destination);
  const matchedCountry = findCountry(destination);
  const info = country ? DESTINATION_INFO[country] : null;
  // A start without a return is saved as a one-day trip; preview it that way.
  const previewEnd = endDate ?? startDate;
  const days = tripDays(startDate, previewEnd);
  // Same letter/code the trip card, Trip tab, Profile and Join card show.
  const stampInitial =
    matchedCountry?.code ?? (name.trim()[0] ?? destination.trim()[0] ?? '?').toUpperCase();

  const applyDestination = (selected: string) => {
    setValue('destination', selected, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    const currentName = name.trim();
    if (selected && (!currentName || currentName === lastAutoName.current)) {
      lastAutoName.current = selected;
      setValue('name', selected, { shouldDirty: true, shouldValidate: true });
    }
  };

  const namePlace = info?.caption ?? (matchedCountry?.name || destination.trim());
  const nameSuggestions = namePlace
    ? [
        matchedCountry?.name || info?.region || namePlace,
        `${namePlace} getaway`,
        `${namePlace} weekend`,
        `${namePlace} road trip`,
      ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)
    : ['Weekend getaway', 'Summer trip', 'Road trip', 'City break'];

  // The envelope face's header row: the destination once (not again when it
  // is also the trip's name), and the countdown.
  const destinationLabel = info?.region ?? (matchedCountry?.name || destination.trim());
  const headerLabel = !destinationLabel
    ? 'Where to?'
    : normaliseDestination(destinationLabel) === normaliseDestination(name)
      ? 'Preview'
      : destinationLabel;
  const countdown = daysUntilLabelUppercase(startDate, todayIso);

  const onPickPhoto = async () => {
    const picked = await pickImage([16, 9]);
    if (picked) setPhoto(picked);
  };

  const submitTrip = async (form: TripForm) => {
    if (!onlineManager.isOnline()) {
      // The notice announces itself to screen readers once it shows the queue.
      setQueued(true);
      return;
    }
    setQueued(false);
    const normalizedEnd = form.endDate ?? form.startDate;
    try {
      const trip = await createTrip.mutateAsync({
        name: form.name,
        destination: form.destination || null,
        startDate: form.startDate,
        endDate: normalizedEnd,
        coverImage: photo,
      });
      // The route wrapper (`trips/new.tsx`) navigates on onCreated; a sheet
      // closed while the request was out must not navigate.
      if (mounted.current) onCreated(trip);
    } catch {
      // Mutation error state is surfaced via createTrip.isError.
    }
  };
  // handleSubmit runs at tap time, not during render, so the refs the
  // submit reads are only touched in an event.
  const create = () => handleSubmit(submitTrip, () => setQueued(false))();

  const onCreate = () => {
    void create();
  };

  const sendQueued = useEffectEvent(() => {
    if (sending.current) return;
    sending.current = true;
    void create().finally(() => {
      sending.current = false;
    });
  });

  useEffect(() => {
    if (queued && online) sendQueued();
  }, [queued, online]);

  const busy = formState.isSubmitting || createTrip.isPending || queued;
  const discardConfirm = formState.isDirty || photo ? DISCARD_NEW_TRIP : null;

  // Swap the contents of the same sheet: no stacked native modals, and RHF
  // retains the name, dates and photo while its fields are temporarily hidden.
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
            applyDestination(selected);
            setPickingCountry(false);
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      size="tall"
      title="New trip"
      onClose={onClose}
      discardConfirm={discardConfirm}
      actionLabel="Create"
      onAction={onCreate}
      actionDisabled={name.trim().length === 0 || busy}
    >
      {queued || !online ? (
        <OfflineNotice message={queued ? QUEUED_MESSAGE : OFFLINE_HINT} reveal={queued} />
      ) : null}

      <TripPreviewCard
        pattern={country ? DESTINATION_INFO[country].pattern : 'airmail'}
        style={styles.preview}
        header={{
          label: headerLabel,
          labelTone: destinationLabel ? 'secondary' : 'muted',
          status: countdown ?? 'NO DATES',
          statusTone: !startDate ? 'muted' : isDaysAway(startDate, todayIso) ? 'accent' : 'secondary',
        }}
        address={[
          { text: name.trim() || 'Your trip', tone: name.trim() ? 'primary' : 'muted' },
          { text: startDate ? addressDates(startDate, previewEnd) : 'No dates yet', tone: startDate ? 'primary' : 'secondary' },
          { text: envelopeNote({ hasDates: Boolean(startDate), others: [], days }), tone: 'secondary' },
        ]}
        stamp={
          photo ? (
            <SceneStamp band="md" image={{ uri: photo.uri }} denomination={null} name={null} />
          ) : country ? (
            <SceneStamp
              band="md"
              image={DESTINATION_ART[country].sceneStampStill}
              denomination={days > 0 ? denomination(country, days) : null}
              name={info?.stampName ?? ''}
            />
          ) : destination ? (
            <SceneStamp band="md" image={null} initial={stampInitial} name={stampName(destination)} />
          ) : (
            <EmptyStampSlot width={88} height={104} />
          )
        }
      />

      <View style={[styles.helperRow, stackHelper && styles.helperStacked]}>
        <AppText role="bodySm" tone="secondary" style={[styles.helperText, stackHelper && styles.helperTextStacked]}>
          Select a country from the dropdown for your stamp and border, or use your own photo.
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
        name="destination"
        render={({ field, fieldState }) => (
          <CountryField
            value={field.value}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            onSelect={applyDestination}
            onOpen={() => {
              Keyboard.dismiss();
              setPickingCountry(true);
            }}
          />
        )}
      />

      <View>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label="TRIP NAME"
              placeholder="Pick a chip below or type a name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.suggestionRow}
        >
          {nameSuggestions.map((suggestion) => {
            const active = name.trim() === suggestion;
            return (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                accessibilityLabel={`Use trip name ${suggestion}`}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  haptic('selection');
                  lastAutoName.current = suggestion;
                  setValue('name', suggestion, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                }}
                style={({ pressed }) => [styles.suggestionTarget, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: active ? colors.ink : colors.paper,
                      borderColor: active ? colors.ink : colors.border,
                    },
                  ]}
                >
                  <AppText
                    role="tagSm"
                    numberOfLines={1}
                    style={[styles.suggestionText, { color: active ? colors.paper : colors.ink2 }]}
                  >
                    {suggestion}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <DateRangeField
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: nextStart, endDate: nextEnd }) => {
          setValue('startDate', nextStart, { shouldDirty: true, shouldValidate: true });
          setValue('endDate', nextEnd, { shouldDirty: true, shouldValidate: true });
        }}
      />

      {createTrip.isError ? (
        <View style={styles.failure}>
          <AppText role="bodySm" tone="danger" accessibilityRole="alert">
            {failureMessage(createTrip.error, 'The trip couldn’t be created. Try again.')}
          </AppText>
          <Button label="Try again" variant="secondary" disabled={busy} onPress={onCreate} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // Escape the 24 pt column to the 14 pt card gutter (the sheet body is the
  // padded container, so this negative margin is not clamped by the ScrollView).
  preview: { marginHorizontal: -10 },
  // The sheet content already sits at the 24 pt column; the row extends 4 pt to
  // the right so the "Use a photo" button ends 20 pt from the sheet edge (item 21).
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s5, marginRight: -4 },
  // Large text: the button goes under the copy instead of squeezing it into a
  // column of broken words.
  helperStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  helperText: { flex: 1 },
  helperTextStacked: { flex: 0 },
  suggestionRow: { gap: spacing.s2 },
  // A full 44 pt target around each small chip; the row's gap keeps the
  // targets apart.
  suggestionTarget: { minHeight: hitTargetMin, justifyContent: 'center' },
  // Android under-measures letter-spaced mono text and wraps its last word
  // out of sight; one line plus a point of room keeps the whole name.
  suggestionText: { paddingRight: 1 },
  suggestionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  failure: { gap: spacing.s4 },
  pressed: { opacity: 0.7 },
});

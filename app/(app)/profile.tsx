import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { ScreenStatusBar } from '@/components/ScreenStatusBar';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { Postmark } from '@/components/airmail/Postmark';
import { EmptyStampSlot, ErrorState, LoadingState } from '@/components/StateViews';
import { AvatarStamp, DestinationStamp, SceneStamp } from '@/features/trips/SceneStamp';
import { findCountry } from '@/features/trips/countries';
import { DESTINATION_INFO, matchDestination, tripDays } from '@/features/trips/destinations';
import { postmarkCity } from '@/features/trips/shoebox';
import { failureMessage } from '@/features/trips/errors';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { useDeleteAccount, useMyProfile, useSignOut, useUploadAvatar, useUpsertProfile } from '@/features/auth/hooks';
import { hydrateReminderPreference, setRemindersEnabled, useRemindersEnabled } from '@/features/reminders/preference';
import { hairlineWidth, hitTargetMin, iconStrokeWidth, radius, shadows, spacing, useTheme, type ThemePreference } from '@/theme';
import { pickImage } from '@/lib/images';
import { toDateOnly } from '@/lib/format/date';
import { profileSchema, type ProfileForm } from '@/lib/validation/schemas';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
];

function EditNameSheet({
  visible,
  onClose,
  currentName,
}: {
  visible: boolean;
  onClose: () => void;
  currentName: string;
}) {
  const upsertProfile = useUpsertProfile();
  const { control, handleSubmit, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: currentName },
  });

  const [prevVisible, setPrevVisible] = useState(visible);
  const [error, setError] = useState<string | null>(null);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      reset({ displayName: currentName });
      setError(null);
    }
  }

  // On failure the sheet stays open with the typed name in the field, so Save
  // can simply be tapped again.
  const onSave = handleSubmit(async (form) => {
    setError(null);
    try {
      await upsertProfile.mutateAsync({ displayName: form.displayName });
      onClose();
    } catch (e) {
      setError(failureMessage(e, "Couldn't save your name. Try again."));
    }
  });

  return (
    <Sheet
      visible={visible}
      title="Your name"
      onClose={onClose}
      actionLabel="Save"
      onAction={onSave}
      actionDisabled={upsertProfile.isPending}
    >
      {error ? (
        <View style={styles.sheetBanner}>
          <ErrorBanner message={error} />
        </View>
      ) : null}
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label="Display name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            editable={!upsertProfile.isPending}
            autoFocus
          />
        )}
      />
    </Sheet>
  );
}

/**
 * Account deletion confirmation. Deletion is irreversible, so the sheet spells
 * out what happens to shared trips before the person commits.
 */
function DeleteAccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const del = useDeleteAccount();
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setError(null);
    try {
      await del.mutateAsync();
      // Only a real deletion gets here; the session is gone and the (app) guard
      // sends the person to sign-in.
      onClose();
    } catch (e) {
      // useDeleteAccount throws with a user-facing message and keeps the user
      // signed in, so the sheet stays put and the message is shown as-is.
      setError((e as Error).message || "Couldn't delete your account. Try again.");
    }
  };

  // Stacked layout (N20): title and explanation, then a full-width wax-red
  // Delete button, then Cancel. The title is never squeezed beside a header
  // action, so it can't wrap.
  return (
    <Sheet visible={visible} title="Delete account?" headerLayout="stacked" onClose={onClose}>
      <AppText role="body" tone="secondary">
        This permanently deletes your profile, photo and notes, plus any trip no one
        else is on. A trip you own that others are on passes to the member who joined
        first — with the plan and packing items you added left in place.
      </AppText>
      {error ? (
        <AppText role="bodySm" style={[styles.sheetError, { color: colors.danger }]}>
          {error}
        </AppText>
      ) : null}
      <Button
        label="Delete account"
        variant="destructiveSolid"
        disabled={del.isPending}
        loading={del.isPending}
        onPress={onDelete}
        style={styles.deleteButton}
      />
      <Button label="Cancel" variant="quiet" onPress={onClose} style={styles.deleteButton} />
    </Sheet>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function albumStatus(trip: TripListItem, today: string): string {
  if (!trip.startDate || !trip.endDate) return 'No dates yet';
  if (trip.startDate <= today && today <= trip.endDate) return 'On now';
  const date = trip.endDate < today ? trip.endDate : trip.startDate;
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function AlbumCell({ trip, today }: { trip: TripListItem; today: string }) {
  const country = matchDestination(trip.destination);
  const info = country ? DESTINATION_INFO[country] : null;
  const noDates = !trip.startDate || !trip.endDate;
  const past = !!trip.endDate && trip.endDate < today;
  const days = tripDays(trip.startDate, trip.endDate);

  return (
    <View style={styles.albumCell}>
      <View style={styles.albumStampWrap}>
        {country ? (
          <DestinationStamp country={country} band="sm" days={days} />
        ) : noDates ? (
          <EmptyStampSlot width={80} height={96} />
        ) : (
          <SceneStamp
            band="sm"
            image={null}
            initial={findCountry(trip.destination)?.code ?? (trip.name[0] ?? '?').toUpperCase()}
            name="WAYMARK"
          />
        )}
        {past ? (
          <Postmark
            city={postmarkCity(trip)}
            date={trip.endDate}
            style={styles.albumPostmark}
          />
        ) : null}
      </View>
      <View style={styles.albumLabels}>
        <AppText role="tagSm" style={styles.albumLabelText}>
          {(info?.caption ?? trip.destination ?? trip.name).toUpperCase()}
        </AppText>
        <AppText role="caption" tone="secondary" style={styles.albumLabelText}>
          {albumStatus(trip, today)}
        </AppText>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuth();
  const profile = useMyProfile();
  const trips = useTrips();
  const signOut = useSignOut();
  const uploadAvatar = useUploadAvatar();
  const upsertProfile = useUpsertProfile();
  const remindersEnabled = useRemindersEnabled();
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const changingPhoto = uploadAvatar.isPending || upsertProfile.isPending;

  useEffect(() => {
    hydrateReminderPreference();
  }, []);

  // The picked file uploads first, then the profile points at it; either step
  // can fail, and the photo the person chose is worth an explanation.
  const onChangePhoto = async () => {
    if (changingPhoto) return;
    setPhotoError(null);
    try {
      const picked = await pickImage([1, 1]);
      if (!picked || !profile.data) return;
      const avatarPath = await uploadAvatar.mutateAsync(picked);
      await upsertProfile.mutateAsync({ displayName: profile.data.displayName, avatarPath });
    } catch (e) {
      setPhotoError(failureMessage(e, "Couldn't change your photo. Try again."));
    }
  };

  const isWide = width >= 720;

  if (profile.isPending) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <LoadingState />
      </View>
    );
  }
  if (profile.isError || profile.data === null) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <ErrorState title="That didn't work" onRetry={() => profile.refetch()} />
      </View>
    );
  }

  const me = profile.data;
  const today = toDateOnly(new Date());
  const tripList = trips.data ?? [];
  const firstName = me.displayName.split(' ')[0];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScreenStatusBar />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton label="Trips" accessibilityLabel="Back to your trips" />

        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your photo"
            accessibilityState={{ disabled: changingPhoto, busy: changingPhoto }}
            onPress={onChangePhoto}
            disabled={changingPhoto}
            style={({ pressed }) => (pressed || changingPhoto) && styles.pressed}
          >
            <AvatarStamp
              size="lg"
              initial={(firstName[0] ?? '?').toUpperCase()}
              name={firstName.toUpperCase()}
              avatarPath={me.avatarPath}
            />
          </Pressable>
          <View style={styles.identityText}>
            <AppText role="cardTitleLg">{me.displayName}</AppText>
            {session?.user.email ? (
              <AppText role="routeTime" tone="secondary" numberOfLines={1} ellipsizeMode="tail" style={styles.email}>
                {session.user.email}
              </AppText>
            ) : null}
            {photoError ? (
              <AppText role="bodySm" style={[styles.identityError, { color: colors.danger }]}>
                {photoError}
              </AppText>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => [styles.editProfile, pressed && styles.pressed]}
            >
              <AppText role="link" style={{ textDecorationLine: 'underline' }}>
                Edit profile
              </AppText>
            </Pressable>
          </View>
        </View>

        <AppText role="kicker" tone="secondary" style={styles.sectionKicker}>
          YOUR STAMPS · {tripList.length}
        </AppText>
        <View style={[styles.albumCard, { backgroundColor: colors.paper }]}>
          {tripList.length === 0 ? (
            <View style={styles.albumEmpty}>
              <EmptyStampSlot width={80} height={96} />
              <AppText role="bodySm" tone="muted" style={styles.albumEmptyText}>
                Your stamps appear here as you travel.
              </AppText>
            </View>
          ) : (
            tripList.map((trip) => <AlbumCell key={trip.id} trip={trip} today={today} />)
          )}
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.paper, boxShadow: shadows.row }]}>
          <View style={[styles.settingsRow, { borderBottomWidth: hairlineWidth, borderBottomColor: colors.hairline }]}>
            <AppText role="link">Appearance</AppText>
            <SegmentedControl
              options={THEME_OPTIONS}
              value={preference}
              onChange={setPreference}
              accessibilityLabel="Appearance"
              track="bg"
              size="compact"
              stretch={false}
            />
          </View>
          <View style={[styles.settingsRow, { borderBottomWidth: hairlineWidth, borderBottomColor: colors.hairline }]}>
            <AppText role="link">Trip reminders</AppText>
            <Toggle
              value={remindersEnabled}
              onValueChange={setRemindersEnabled}
              accessibilityLabel="Trip reminders"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read the privacy policy"
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
          >
            <AppText role="link">Privacy policy</AppText>
            <ChevronRight size={20} color={colors.ink2} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        <View style={styles.signOutWrap}>
          <Button
            label="Sign out"
            variant="destructive"
            size="md"
            loading={signOut.isPending}
            onPress={() => signOut.mutate()}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            onPress={() => setDeleteVisible(true)}
            style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
          >
            <Trash2 size={18} color={colors.danger} strokeWidth={iconStrokeWidth} />
            <AppText role="link" style={{ color: colors.danger }}>Delete account</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <EditNameSheet visible={editVisible} onClose={() => setEditVisible(false)} currentName={me.displayName} />
      <DeleteAccountSheet visible={deleteVisible} onClose={() => setDeleteVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  pressed: { opacity: 0.7 },
  identity: { paddingTop: spacing.s5, paddingHorizontal: spacing.gutter, flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  identityText: { flex: 1, minWidth: 0 },
  email: { marginTop: 4 },
  identityError: { marginTop: spacing.s3 },
  // 44 pt tall, like every other control on the screen (the label is 20).
  editProfile: { minHeight: hitTargetMin, justifyContent: 'center', marginTop: 4 },
  sectionKicker: { paddingTop: spacing.s10, paddingBottom: spacing.s4, paddingHorizontal: spacing.gutter },
  albumCard: {
    marginHorizontal: spacing.cardGutter,
    borderRadius: radius.card,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 14,
    boxShadow: shadows.card,
  },
  albumCell: { width: '33.33%', alignItems: 'center', gap: 6 },
  albumStampWrap: { width: 80, height: 96, position: 'relative' },
  albumPostmark: { position: 'absolute', left: -6, top: 22 },
  albumLabels: { alignItems: 'center', alignSelf: 'stretch' },
  // Centred so short lines ("May") sit under the stamp, not left of centre (N7).
  albumLabelText: { textAlign: 'center', alignSelf: 'stretch' },
  albumEmpty: { width: '100%', alignItems: 'center', gap: spacing.s3, paddingVertical: spacing.s5 },
  albumEmptyText: { textAlign: 'center' },
  settingsCard: { marginTop: spacing.s6, marginHorizontal: spacing.cardGutter, borderRadius: radius.card, paddingHorizontal: 16 },
  settingsRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s5 },
  signOutWrap: { paddingTop: spacing.s5, paddingHorizontal: spacing.cardGutter, gap: spacing.s2 },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: hitTargetMin,
  },
  sheetError: { marginTop: spacing.s4 },
  sheetBanner: { marginBottom: spacing.s5 },
  deleteButton: { alignSelf: 'stretch', marginTop: spacing.s3 },
});

import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { Postmark } from '@/components/airmail/Postmark';
import { EmptyStampSlot, ErrorState, LoadingState } from '@/components/StateViews';
import { AvatarStamp, DestinationStamp, SceneStamp } from '@/features/trips/SceneStamp';
import { DESTINATION_INFO, matchDestination, tripDays } from '@/features/trips/destinations';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { useMyProfile, useSignOut, useUploadAvatar, useUpsertProfile } from '@/features/auth/hooks';
import { hydrateReminderPreference, setRemindersEnabled, useRemindersEnabled } from '@/features/reminders/preference';
import { fontFamilies, hairlineWidth, iconStrokeWidth, radius, spacing, useTheme, type ThemePreference } from '@/theme';
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
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) reset({ displayName: currentName });
  }

  const onSave = handleSubmit(async (form) => {
    await upsertProfile.mutateAsync({ displayName: form.displayName });
    onClose();
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
            autoFocus
          />
        )}
      />
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
        {noDates ? (
          <EmptyStampSlot width={80} height={96} />
        ) : country ? (
          <DestinationStamp country={country} band="sm" days={days} />
        ) : (
          <SceneStamp band="sm" image={null} initial={(trip.name[0] ?? '?').toUpperCase()} name={trip.destination ?? ''} />
        )}
        {past && country ? (
          <Postmark
            city={info?.chip ?? ''}
            date={trip.endDate}
            style={styles.albumPostmark}
          />
        ) : null}
      </View>
      <View style={styles.albumLabels}>
        <AppText role="kicker" style={{ fontSize: 10, lineHeight: 12, letterSpacing: 0.6 }}>
          {(info?.caption ?? trip.destination ?? trip.name).toUpperCase()}
        </AppText>
        <AppText role="metaSm" tone="secondary" style={{ fontSize: 12, lineHeight: 15 }}>
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

  useEffect(() => {
    hydrateReminderPreference();
  }, []);

  const onChangePhoto = async () => {
    const picked = await pickImage([1, 1]);
    if (!picked || !profile.data) return;
    const avatarPath = await uploadAvatar.mutateAsync(picked);
    await upsertProfile.mutateAsync({ displayName: profile.data.displayName, avatarPath });
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
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }, isWide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to your trips"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.ink} strokeWidth={2.2} />
          <AppText role="button" style={styles.backLabel}>Trips</AppText>
        </Pressable>

        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change your photo"
            onPress={onChangePhoto}
            style={({ pressed }) => pressed && styles.pressed}
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
              <AppText role="bodySm" tone="secondary" style={styles.email}>
                {session.user.email}
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

        <View style={[styles.settingsCard, { backgroundColor: colors.paper, boxShadow: '0 1px 2px rgba(21,34,59,0.12)' }]}>
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
            accessibilityLabel="Read the privacy note"
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
          >
            <AppText role="link">Privacy note</AppText>
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
        </View>
      </ScrollView>

      <EditNameSheet visible={editVisible} onClose={() => setEditVisible(false)} currentName={me.displayName} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 0 },
  contentWide: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  backRow: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  backLabel: { fontFamily: fontFamilies.semibold },
  pressed: { opacity: 0.7 },
  identity: { paddingTop: spacing.s5, paddingHorizontal: spacing.gutter, flexDirection: 'row', alignItems: 'center', gap: spacing.s8 },
  identityText: { flex: 1, minWidth: 0 },
  email: { marginTop: 4 },
  editProfile: { height: 32, justifyContent: 'center', marginTop: 4 },
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
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  albumCell: { width: '33.33%', alignItems: 'center', gap: 6 },
  albumStampWrap: { width: 80, height: 96, position: 'relative' },
  albumPostmark: { position: 'absolute', left: -14, top: 22 },
  albumLabels: { alignItems: 'center' },
  albumEmpty: { width: '100%', alignItems: 'center', gap: spacing.s3, paddingVertical: spacing.s5 },
  albumEmptyText: { textAlign: 'center' },
  settingsCard: { marginTop: spacing.s6, marginHorizontal: spacing.cardGutter, borderRadius: radius.card, paddingHorizontal: 16 },
  settingsRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s5 },
  signOutWrap: { paddingTop: spacing.s5, paddingHorizontal: spacing.cardGutter },
});
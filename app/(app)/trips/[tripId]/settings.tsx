import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardRow } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { DeleteTripSheet } from '@/features/trips/DeleteTripSheet';
import {
  useLeaveTrip,
  useSetTripCover,
  useTrip,
  useTripMembers,
} from '@/features/trips/hooks';
import { InviteCard } from '@/features/invites/InviteCard';
import { hairlineWidth, spacing, useTheme } from '@/theme';
import { formatDateRange } from '@/lib/format/date';
import { pickImage } from '@/lib/images';
import { confirmDestructive } from '@/lib/confirm';
import { useAuth } from '@/features/auth/AuthContext';

export default function TripSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { userId } = useAuth();
  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);
  const leaveTrip = useLeaveTrip();
  const setCover = useSetTripCover(tripId);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const onChangeCover = async () => {
    const picked = await pickImage([16, 9]);
    if (picked) await setCover.mutateAsync(picked);
  };

  const onLeave = async () => {
    const confirmed = await confirmDestructive(
      'Leave this trip?',
      'You lose access to its itinerary, packing list, and notes until someone invites you back.',
      'Leave',
    );
    if (!confirmed) return;
    await leaveTrip.mutateAsync(tripId);
    router.replace('/');
  };

  const isWide = width >= 720;
  const currentMember = members.data?.find((m) => m.userId === userId);
  const isOwner = currentMember?.role === 'owner';

  if (trip.isPending) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface.bg }]}>
        <LoadingState />
      </View>
    );
  }
  if (trip.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface.bg }]}>
        <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.surface.bg, paddingTop: insets.top + spacing.s3 },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.s8 },
          isWide && styles.contentWide,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${trip.data.name}`}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <ChevronLeft size={18} color={colors.text.secondary} strokeWidth={1.8} />
          <AppText tone="secondary" style={styles.backLabel}>
            {trip.data.name}
          </AppText>
        </Pressable>
        <AppText role="title" style={styles.title}>
          Trip settings
        </AppText>

        <View style={styles.section}>
          <SectionLabel style={styles.sectionLabel}>Details</SectionLabel>
          <Card>
            <CardRow label="Name" value={trip.data.name} />
            <CardRow
              label="Dates"
              value={formatDateRange(trip.data.startDate, trip.data.endDate) || 'Not set'}
              isLast={!isOwner}
            />
            {isOwner ? (
              <CardRow
                label="Cover photo"
                value={setCover.isPending ? 'Uploading…' : trip.data.coverImagePath ? 'Change' : 'Add'}
                valueTone={setCover.isPending ? 'secondary' : 'accent'}
                accessibilityLabel="Change cover photo"
                onPress={onChangeCover}
                isLast
              />
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel style={styles.sectionLabel}>Members</SectionLabel>
          <Card>
            {(members.data ?? []).map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index < (members.data?.length ?? 0) - 1 && {
                    borderBottomWidth: hairlineWidth,
                    borderBottomColor: colors.hairline.default,
                  },
                ]}
              >
                <Avatar
                  name={member.profile.displayName}
                  avatarPath={member.profile.avatarPath}
                  size={34}
                  toneIndex={index}
                />
                <View>
                  <AppText role="bodyStrong" style={styles.memberName}>
                    {member.profile.displayName}
                  </AppText>
                  <AppText role="caption" tone="muted" style={styles.memberRole}>
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                    {member.userId === userId ? ' · you' : ''}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel style={styles.sectionLabel}>Invite someone</SectionLabel>
          <InviteCard tripId={tripId} />
        </View>

        <View style={styles.dangerSection}>
          {isOwner ? (
            <>
              <Button
                label="Delete trip"
                variant="destructive"
                onPress={() => setDeleteSheetVisible(true)}
              />
              <AppText role="caption" tone="muted" style={styles.dangerCaption}>
                You&apos;re the owner — deleting removes everything for everyone.
              </AppText>
            </>
          ) : (
            <Button
              label="Leave trip"
              variant="destructive"
              loading={leaveTrip.isPending}
              onPress={onLeave}
            />
          )}
        </View>
      </ScrollView>
      <DeleteTripSheet
        visible={deleteSheetVisible}
        onClose={() => setDeleteSheetVisible(false)}
        trip={trip.data}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenGutter,
  },
  contentWide: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
  backLabel: {
    fontSize: 14,
    lineHeight: 19,
  },
  title: {
    marginTop: spacing.s2,
    marginBottom: spacing.s5,
  },
  section: {
    marginBottom: spacing.s5,
  },
  sectionLabel: {
    marginBottom: spacing.s2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
  },
  memberName: {
    fontSize: 15,
    lineHeight: 20,
  },
  memberRole: {
    fontSize: 12,
    lineHeight: 16,
  },
  dangerSection: {
    marginTop: spacing.s2,
    gap: spacing.s2,
  },
  dangerCaption: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});

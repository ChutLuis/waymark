import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { EmptyStampSlot, ErrorState, LoadingState } from '@/components/StateViews';
import { DestinationStamp, SceneStamp } from '@/features/trips/SceneStamp';
import { DeleteTripSheet } from '@/features/trips/DeleteTripSheet';
import { EditTripSheet } from '@/features/trips/EditTripSheet';
import { InviteCard } from '@/features/invites/InviteCard';
import { useLeaveTrip, useTrip, useTripMembers } from '@/features/trips/hooks';
import { DESTINATION_INFO, matchDestination, stampName, tripDatesKicker } from '@/features/trips/destinations';
import { useAuth } from '@/features/auth/AuthContext';
import { fontFamilies, hairlineWidth, iconStrokeWidth, spacing, useTheme } from '@/theme';
import { confirmDestructive } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { getLastTab } from '@/features/trips/shellMotion';

const TAB_LABEL = { plan: 'Plan', packing: 'Packing', notes: 'Notes' } as const;

export default function TripTabScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [backLabel] = useState(() => TAB_LABEL[getLastTab()]);

  const goBack = () => {
    haptic('selection');
    if (router.canGoBack()) router.back();
    else router.replace(`/trips/${tripId}` as never);
  };
  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);
  const leaveTrip = useLeaveTrip();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const currentMember = members.data?.find((m) => m.userId === userId);
  const isOwner = currentMember?.role === 'owner';

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

  if (trip.isPending) return <LoadingState />;
  if (trip.isError) {
    return <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />;
  }

  const country = matchDestination(trip.data.destination);
  const info = country ? DESTINATION_INFO[country] : null;
  const joinDates = new Map(
    (members.data ?? []).map((m) => [m.userId, m.joinedAt]),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}
          onPress={goBack}
          style={({ pressed }) => [styles.backPill, { backgroundColor: colors.paper, borderColor: colors.divider }, pressed && styles.pressed]}
        >
          <ChevronLeft size={20} color={colors.ink} strokeWidth={iconStrokeWidth} />
          <AppText role="pillLabel" style={styles.backLabel}>
            {backLabel}
          </AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <AppText role="tripTitle">Trip</AppText>
            <AppText role="meta" tone="secondary" style={styles.subtitle}>
              Details, people and invites
            </AppText>
          </View>
          {isOwner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit trip"
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => [styles.editPill, { borderColor: colors.ink }, pressed && styles.pressed]}
            >
              <AppText role="button">Edit</AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.tripCard, { backgroundColor: colors.paper }]}>
          <View style={styles.tripCardText}>
            <AppText role="cardTitle" numberOfLines={1}>
              {trip.data.name}
            </AppText>
            {/* Known region: "Region · stamp: description". Unknown: show the
                destination as typed when there is one, hide the line when there
                isn't, and only say "No stamp yet" for the dashed (no-dates)
                slot. */}
            {info ? (
              <AppText role="meta" tone="secondary" style={styles.tripCardMeta}>
                {info.region} · stamp: {info.description}
              </AppText>
            ) : trip.data.destination ? (
              <AppText role="meta" tone="secondary" style={styles.tripCardMeta}>
                {trip.data.destination}
              </AppText>
            ) : !trip.data.startDate || !trip.data.endDate ? (
              <AppText role="meta" tone="secondary" style={styles.tripCardMeta}>
                No stamp yet
              </AppText>
            ) : null}
            <AppText role="kickerLg" style={styles.tripCardKicker}>
              {tripDatesKicker(trip.data.startDate, trip.data.endDate)}
            </AppText>
          </View>
          {country ? (
            <DestinationStamp country={country} band="xs" days={daysCount(trip.data.startDate, trip.data.endDate)} />
          ) : trip.data.startDate && trip.data.endDate ? (
            <SceneStamp
              band="xs"
              image={null}
              initial={(trip.data.name[0] ?? '?').toUpperCase()}
              name={stampName(trip.data.destination)}
            />
          ) : (
            <EmptyStampSlot width={56} height={72} />
          )}
        </View>

        <AppText role="kicker" tone="secondary" style={styles.sectionKicker}>
          PEOPLE · {members.data?.length ?? 0}
        </AppText>
        <View style={[styles.card, { backgroundColor: colors.paper, boxShadow: '0 1px 2px rgba(21,34,59,0.12)' }]}>
          {(members.data ?? []).map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.memberRow,
                index < (members.data?.length ?? 0) - 1 && {
                  borderBottomWidth: hairlineWidth,
                  borderBottomColor: colors.hairline,
                },
              ]}
            >
              <Avatar
                name={member.profile.displayName}
                avatarPath={member.profile.avatarPath}
                size={36}
                filled={member.role === 'owner'}
              />
              <View style={styles.memberText}>
                <AppText role="button">{member.profile.displayName}</AppText>
                <AppText role="metaSm" tone="secondary">
                  {member.userId === userId
                    ? `You · ${member.role === 'owner' ? 'Owner' : 'Member'}`
                    : member.role === 'owner'
                      ? `Owner · joined ${formatJoined(joinDates.get(member.userId) ?? null)}`
                      : `Joined ${formatJoined(joinDates.get(member.userId) ?? null)}`}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <AppText role="kicker" tone="secondary" style={styles.sectionKicker}>
          INVITE SOMEONE ELSE
        </AppText>
        <View style={styles.inviteWrap}>
          <InviteCard tripId={tripId} />
        </View>

        <View style={styles.danger}>
          {isOwner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete trip"
              onPress={() => setDeleteVisible(true)}
              style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
            >
              <Trash2 size={18} color={colors.wax} strokeWidth={iconStrokeWidth} />
              <AppText role="button" tone="danger" style={styles.deleteText}>
                Delete trip
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Leave trip"
              onPress={onLeave}
              style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
            >
              <Trash2 size={18} color={colors.wax} strokeWidth={iconStrokeWidth} />
              <AppText role="button" tone="danger" style={styles.deleteText}>
                Leave trip
              </AppText>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <DeleteTripSheet visible={deleteVisible} onClose={() => setDeleteVisible(false)} trip={trip.data} />
      <EditTripSheet visible={editVisible} onClose={() => setEditVisible(false)} trip={trip.data} />
    </View>
  );
}

function daysCount(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

function formatJoined(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 100 },
  topBar: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backPill: {
    height: 40,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: { fontFamily: fontFamilies.semibold },
  titleRow: {
    paddingTop: spacing.s6,
    paddingHorizontal: 20,
    paddingLeft: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s5,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  subtitle: { marginTop: 2 },
  editPill: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  tripCard: {
    marginTop: spacing.s6,
    marginHorizontal: spacing.cardGutter,
    borderRadius: 4,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s5,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  tripCardText: { flex: 1, minWidth: 0 },
  tripCardMeta: { marginTop: 2 },
  tripCardKicker: { marginTop: 8 },
  sectionKicker: { paddingTop: spacing.s8, paddingBottom: spacing.s3, paddingHorizontal: spacing.gutter },
  card: { marginHorizontal: spacing.cardGutter, borderRadius: 4, paddingHorizontal: 16 },
  memberRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.s5 },
  memberText: { flex: 1 },
  inviteWrap: { marginHorizontal: spacing.cardGutter },
  danger: { paddingTop: spacing.s5, paddingHorizontal: spacing.cardGutter },
  deleteRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  deleteText: { fontSize: 16, lineHeight: 20 },
});
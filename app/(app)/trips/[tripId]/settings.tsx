import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { onlineManager } from '@tanstack/react-query';
import { PenLine, Trash2 } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { EmptyStampSlot, ErrorState, LoadingState } from '@/components/StateViews';
import { easing, useMotion } from '@/components/motion';
import { AddressCard, type AddressLine } from '@/features/trips/AddressCard';
import { DeleteTripSheet } from '@/features/trips/DeleteTripSheet';
import { EditTripSheet } from '@/features/trips/EditTripSheet';
import { SheetOfStamps } from '@/features/trips/SheetOfStamps';
import { RegisteredInvite } from '@/features/invites/RegisteredInvite';
import { useLeaveTrip, useTrip, useTripMembers } from '@/features/trips/hooks';
import {
  DESTINATION_INFO,
  formatTripRange,
  matchDestination,
  stampName,
  tripDays,
} from '@/features/trips/destinations';
import { OFFLINE_MESSAGE, failureMessage } from '@/features/trips/errors';
import { sheetDays, sheetHeader, stampLabel, usedRange, usedSummary } from '@/features/trips/sheet';
import { tripSheet } from '@/features/trips/expandStore';
import { getLastTab } from '@/features/trips/shellMotion';
import { useAuth } from '@/features/auth/AuthContext';
import { hitTargetMin, iconStrokeWidth, motion, radius, shadows, spacing, useTheme } from '@/theme';
import { confirmDestructive } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { toDateOnly } from '@/lib/format/date';

const TAB_LABEL = { plan: 'Plan', packing: 'Packing', notes: 'Notes' } as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatJoined(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * The Trip page (Airmail v4 · 05), pushed over the trip shell from its title
 * pill: the trip as a sheet of stamps, its people addressed FROM and TO, and
 * the invite as registered mail. It slides in over 440 ms while the shell
 * steps back and dims, and slides out over 380 ms before any navigation
 * removes it.
 */
export default function TripPageScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ms, reduced } = useMotion();
  const { userId } = useAuth();
  const [backLabel] = useState(() => TAB_LABEL[getLastTab()]);
  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);
  const leaveTrip = useLeaveTrip();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const closing = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  // Push on open.
  useEffect(() => {
    tripSheet.value = 0;
    tripSheet.value = withTiming(1, { duration: ms(motion.duration.push), easing: easing('standard') });
    return () => {
      tripSheet.value = 0;
    };
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pop before anything removes the page; replacing the stack skips it.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        const type = event.data.action.type;
        if (closing.current || type === 'REPLACE' || type === 'RESET') return;
        event.preventDefault();
        closing.current = true;
        haptic('selection');
        const leave = () => navigation.dispatch(event.data.action);
        tripSheet.value = withTiming(
          0,
          { duration: ms(motion.duration.pop), easing: easing('exit') },
          (finished) => {
            if (finished) runOnJS(leave)();
          },
        );
      }),
    [navigation, ms],
  );

  const pageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - tripSheet.value) * width }] }));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/trips/${tripId}` as never);
  };

  const currentMember = members.data?.find((m) => m.userId === userId);
  // Until the members load, the creator is the owner (ownership never moves),
  // so an owner never sees Leave.
  const isOwner = currentMember ? currentMember.role === 'owner' : trip.data?.createdBy === userId;
  const leaving = leaveTrip.isPending;

  // The banner prints under the Leave row, which can sit at the bottom edge.
  useEffect(() => {
    if (leaveError) scrollRef.current?.scrollToEnd({ animated: !reduced });
  }, [leaveError, reduced]);

  const failLeave = (message: string) => {
    setLeaveError(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const onLeave = async () => {
    if (leaving) return;
    const confirmed = await confirmDestructive(
      'Leave this trip?',
      'You lose access to its itinerary, packing list, and notes until someone invites you back.',
      'Leave',
    );
    if (!confirmed) return;
    // Offline, the mutation would wait for the connection instead of failing.
    if (!onlineManager.isOnline()) {
      failLeave(OFFLINE_MESSAGE);
      return;
    }
    setLeaveError(null);
    try {
      await leaveTrip.mutateAsync(tripId);
    } catch (error) {
      failLeave(failureMessage(error, 'Couldn’t leave the trip. Try again.'));
      return;
    }
    router.replace('/');
  };

  const body = (() => {
    if (trip.isPending) return <LoadingState />;
    if (trip.isError) return <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />;

    const data = trip.data;
    const country = matchDestination(data.destination);
    const info = country ? DESTINATION_INFO[country] : null;
    const days = sheetDays(data.startDate, data.endDate, toDateOnly(new Date()));
    const count = tripDays(data.startDate, data.endDate);
    const year = data.startDate ? Number(data.startDate.slice(0, 4)) : null;
    const meta = [
      info?.region ?? data.destination ?? '',
      formatTripRange(data.startDate, data.endDate),
      count ? `${count} ${count === 1 ? 'day' : 'days'}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const owner = (members.data ?? []).find((m) => m.role === 'owner');
    const lines: AddressLine[] = [
      ...(owner
        ? [
            {
              key: owner.userId,
              label: 'FROM' as const,
              name: owner.profile.displayName,
              note: owner.userId === userId ? 'you · owner' : 'owner',
            },
          ]
        : []),
      ...(members.data ?? [])
        .filter((m) => m.role !== 'owner')
        .map((m) => ({
          key: m.userId,
          label: 'TO' as const,
          name: m.profile.displayName,
          note: m.userId === userId ? `you · joined ${formatJoined(m.joinedAt)}` : `joined ${formatJoined(m.joinedAt)}`,
        })),
    ];

    return (
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <AppText role="tripTitle" numberOfLines={2}>
            {data.name}
          </AppText>
          {meta ? (
            <AppText role="meta" tone="secondary" style={styles.meta}>
              {meta}
            </AppText>
          ) : null}
        </View>

        <View style={styles.block}>
          {days.length > 0 ? (
            <SheetOfStamps
              days={days}
              country={country}
              label={stampLabel(data.destination, data.name)}
              header={sheetHeader(data.destination, data.name, count, year)}
              footer={usedSummary(days)}
              city={(info?.caption ?? stampName(data.destination)).toUpperCase()}
              range={year ? usedRange(days, year) : ''}
            />
          ) : (
            <View style={[styles.noStamps, { backgroundColor: colors.stampPaper, boxShadow: shadows.postcard }]}>
              <EmptyStampSlot width={56} height={72} />
              <AppText role="bodySm" style={[styles.noStampsText, { color: colors.stampInk }]}>
                Pick dates to print this trip&apos;s stamps.
              </AppText>
            </View>
          )}
        </View>

        {lines.length > 0 ? (
          <View style={styles.block}>
            <AddressCard lines={lines} />
          </View>
        ) : null}

        <View style={styles.inviteBlock}>
          <RegisteredInvite tripId={tripId} tripName={data.name} />
        </View>

        <View style={styles.danger}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isOwner ? 'Delete trip' : leaving ? 'Leaving trip' : 'Leave trip'}
            accessibilityState={{ disabled: leaving, busy: leaving }}
            disabled={leaving}
            onPress={isOwner ? () => setDeleteVisible(true) : onLeave}
            style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
          >
            <View style={styles.dangerIcon}>
              {leaving ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Trash2 size={18} color={colors.danger} strokeWidth={iconStrokeWidth} />
              )}
            </View>
            <AppText role="pillLabel" tone="danger">
              {isOwner ? 'Delete trip' : leaving ? 'Leaving…' : 'Leave trip'}
            </AppText>
          </Pressable>
          {leaveError ? (
            <View style={styles.dangerError}>
              <ErrorBanner message={leaveError} />
            </View>
          ) : null}
        </View>

        <DeleteTripSheet visible={deleteVisible} onClose={() => setDeleteVisible(false)} trip={data} />
        <EditTripSheet visible={editVisible} onClose={() => setEditVisible(false)} trip={data} />
      </ScrollView>
    );
  })();

  return (
    <Animated.View
      style={[
        styles.page,
        { backgroundColor: colors.bg, paddingTop: insets.top, boxShadow: shadows.sheetPush },
        pageStyle,
      ]}
    >
      <View style={styles.column}>
        <View style={styles.topBar}>
          <BackButton variant="pill" label={backLabel} onPress={goBack} style={styles.topBarPill} />
          {isOwner && trip.data ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit trip"
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => [
                styles.editPill,
                { backgroundColor: colors.paper, borderColor: colors.divider, boxShadow: shadows.pill },
                pressed && styles.pressed,
              ]}
            >
              <PenLine size={16} color={colors.ink} strokeWidth={iconStrokeWidth} />
              <AppText role="tagLabel">Edit</AppText>
            </Pressable>
          ) : null}
        </View>
        {body}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  topBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // BackButton aligns itself to the start; in this row that would be the top.
  topBarPill: { alignSelf: 'center' },
  editPill: {
    minHeight: hitTargetMin,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.codeBox,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: { paddingBottom: spacing.s12 * 2 },
  titleBlock: { paddingTop: 6, paddingHorizontal: spacing.gutter },
  meta: { marginTop: 2 },
  block: { marginTop: spacing.s7, marginHorizontal: spacing.cardGutter },
  inviteBlock: { marginTop: spacing.s6, marginHorizontal: spacing.cardGutter },
  noStamps: { borderRadius: radius.airmailInner, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  noStampsText: { flex: 1 },
  danger: { paddingTop: spacing.s10, paddingHorizontal: spacing.s7 },
  deleteRow: { minHeight: hitTargetMin, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  dangerIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  dangerError: { marginTop: spacing.s3 },
  pressed: { opacity: 0.7 },
});

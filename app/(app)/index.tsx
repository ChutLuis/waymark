import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions, type ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { BrandMark } from '@/components/BrandMark';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { AvatarStamp } from '@/features/trips/SceneStamp';
import { TripCard } from '@/features/trips/TripCard';
import { TripCardSkeleton } from '@/features/trips/TripCardSkeleton';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { splitTrips } from '@/features/trips/sort';
import { greetingFor } from '@/features/trips/destinations';
import { useMyProfile } from '@/features/auth/hooks';
import { spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';

type Row =
  | { type: 'kicker'; label: string }
  | { type: 'trip'; trip: TripListItem; variant: 'onNow' | 'upcoming' | 'past' };

function isOnNow(trip: TripListItem, today: string): boolean {
  if (!trip.startDate || !trip.endDate) return false;
  return trip.startDate <= today && today <= trip.endDate;
}

export default function TripsListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const trips = useTrips();
  const profile = useMyProfile();

  const isWide = width >= 720;
  const today = toDateOnly(new Date());

  // Pause the on-now scene while its card is off-screen (README: Motion).
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 10 }), []);
  const onViewableItemsChanged = useMemo(
    () => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleIds(
        new Set(
          viewableItems
            .map((v) =>
              (v.item as Row | undefined)?.type === 'trip'
                ? (v.item as { trip: TripListItem }).trip.id
                : null,
            )
            .filter((id): id is string => id !== null),
        ),
      );
    },
    [],
  );

  const rows = useMemo<Row[]>(() => {
    const all = trips.data ?? [];
    const { current, past } = splitTrips(all, today);
    const onNow: TripListItem[] = [];
    const upcoming: TripListItem[] = [];
    for (const trip of current) (isOnNow(trip, today) ? onNow : upcoming).push(trip);

    const result: Row[] = [];
    if (onNow.length > 0 || upcoming.length > 0) result.push({ type: 'kicker', label: 'COMING UP' });
    result.push(...onNow.map((trip): Row => ({ type: 'trip', trip, variant: 'onNow' })));
    result.push(...upcoming.map((trip): Row => ({ type: 'trip', trip, variant: 'upcoming' })));
    if (past.length > 0) {
      result.push({ type: 'kicker', label: 'PAST TRIPS' });
      result.push(...past.map((trip): Row => ({ type: 'trip', trip, variant: 'past' })));
    }
    return result;
  }, [trips.data, today]);

  const firstName = (profile.data?.displayName ?? '').split(' ')[0] || 'traveler';
  const hasTrips = rows.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={[styles.column, isWide && styles.columnWide]}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandMark />
            <AppText role="wordmark">Waymark</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.avatarTarget, pressed && styles.pressed]}
          >
            <AvatarStamp
              size="sm"
              initial={(firstName[0] ?? '?').toUpperCase()}
              avatarPath={profile.data?.avatarPath ?? null}
            />
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <AppText role="display">Your trips</AppText>
          <AppText role="meta" tone="secondary" style={styles.greeting}>
            {greetingFor(new Date(), firstName)}
          </AppText>
        </View>

        <OfflineBanner />

        {trips.isPending ? (
          <View style={styles.list}>
            <TripCardSkeleton withCover />
            <View style={styles.skeletonGap} />
            <TripCardSkeleton />
            <View style={styles.skeletonGap} />
            <TripCardSkeleton />
          </View>
        ) : trips.isError ? (
          <ErrorState title="Couldn't load your trips" onRetry={() => trips.refetch()} />
        ) : !hasTrips ? (
          <EmptyState
            title="Somewhere to be?"
            body="Start a trip and invite the person you're going with — or join theirs with an invite code."
            actionLabel="Start a trip"
            onAction={() => router.push('/trips/new')}
          >
            <Button
              label="I have an invite code"
              variant="quiet"
              onPress={() => router.push('/join')}
              style={styles.emptySecondary}
            />
          </EmptyState>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row, index) => (row.type === 'trip' ? row.trip.id : `kicker-${index}`)}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            renderItem={({ item: row }) =>
              row.type === 'kicker' ? (
                <AppText role="kicker" tone="secondary" style={styles.sectionKicker}>
                  {row.label}
                </AppText>
              ) : (
                <View style={[styles.cardWrap, row.variant === 'past' && styles.cardWrapPast]}>
                  <TripCard
                    trip={row.trip}
                    variant={row.variant}
                    paused={row.variant === 'onNow' && !visibleIds.has(row.trip.id)}
                    onPress={() => router.push(`/trips/${row.trip.id}` as never)}
                  />
                </View>
              )
            }
          />
        )}
      </View>

      {!trips.isPending && hasTrips ? (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: colors.bg,
              paddingBottom: insets.bottom + spacing.s7,
              borderTopColor: colors.divider,
            },
          ]}
        >
          <View style={styles.actionCol}>
            <Button
              label="New trip"
              size="lg"
              leading={<Plus size={20} color={colors.paper} strokeWidth={2.4} />}
              onPress={() => router.push('/trips/new')}
            />
          </View>
          <View style={styles.actionCol}>
            <Button
              label="Join with a code"
              variant="secondary"
              size="lg"
              onPress={() => router.push('/join')}
              style={styles.joinButton}
              labelStyle={styles.joinLabel}
              labelLines={1}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1 },
  columnWide: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { height: 52, paddingLeft: spacing.gutter, paddingRight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarTarget: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  titleBlock: { paddingTop: spacing.s3, paddingHorizontal: spacing.gutter },
  greeting: { marginTop: 2, fontSize: 17, lineHeight: 22 },
  list: { paddingHorizontal: spacing.cardGutter, paddingTop: spacing.s7 },
  skeletonGap: { height: spacing.s5 },
  listContent: { paddingTop: 0, paddingHorizontal: spacing.cardGutter },
  sectionKicker: { paddingTop: spacing.s8, paddingBottom: spacing.s4, paddingHorizontal: spacing.s4 },
  cardWrap: { marginBottom: spacing.s5 },
  cardWrapPast: { marginBottom: spacing.s3 },
  emptySecondary: { marginTop: spacing.s3 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.s4,
    paddingTop: spacing.s7,
    paddingHorizontal: spacing.s7,
    borderTopWidth: 1,
  },
  actionCol: { flex: 1 },
  joinButton: { paddingHorizontal: 0 },
  joinLabel: { fontSize: 17, lineHeight: 22 },
});
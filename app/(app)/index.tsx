import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Fab } from '@/components/Fab';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { useMyProfile } from '@/features/auth/hooks';
import { TripCard } from '@/features/trips/TripCard';
import { TripCardSkeleton } from '@/features/trips/TripCardSkeleton';
import { useTrips, type TripListItem } from '@/features/trips/hooks';
import { splitTrips } from '@/features/trips/sort';
import { spacing, useTheme } from '@/theme';
import { toDateOnly } from '@/lib/format/date';

function PeaksMark() {
  const { colors } = useTheme();
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Path
        d="M8 44 24 12l8 16 6-8 10 24Z"
        fill="none"
        stroke={colors.text.faint}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle
        cx={42}
        cy={14}
        r={4}
        fill="none"
        stroke={colors.accent.base}
        strokeWidth={1.6}
        strokeDasharray="2.5 3"
      />
    </Svg>
  );
}

type TripsRow =
  | { type: 'trip'; trip: TripListItem; isPast: boolean }
  | { type: 'past-divider' };

export default function TripsListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const trips = useTrips();
  const profile = useMyProfile();

  const isWide = width >= 720;

  const rows = useMemo<TripsRow[]>(() => {
    const { current, past } = splitTrips(trips.data ?? [], toDateOnly(new Date()));
    const result: TripsRow[] = current.map((trip) => ({ type: 'trip', trip, isPast: false }));
    if (past.length > 0) {
      if (result.length > 0) result.push({ type: 'past-divider' });
      result.push(...past.map((trip): TripsRow => ({ type: 'trip', trip, isPast: true })));
    }
    return result;
  }, [trips.data]);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.surface.bg, paddingTop: insets.top + spacing.s3 },
      ]}
    >
      <View style={[styles.column, isWide && styles.columnWide]}>
        <View style={styles.header}>
          <AppText role="title">Your trips</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            hitSlop={8}
            onPress={() => router.push('/profile')}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Avatar name={profile.data?.displayName ?? '?'} size={34} />
          </Pressable>
        </View>
        <OfflineBanner />
        {trips.isPending ? (
          <View style={styles.list}>
            <TripCardSkeleton withCover />
            <TripCardSkeleton />
          </View>
        ) : trips.isError ? (
          <ErrorState title="Couldn't load your trips" onRetry={() => trips.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            mark={<PeaksMark />}
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
            keyExtractor={(row, index) => (row.type === 'trip' ? row.trip.id : `divider-${index}`)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: row }) =>
              row.type === 'past-divider' ? (
                <View style={styles.pastDivider} />
              ) : (
                <View style={styles.cardWrap}>
                  <TripCard
                    trip={row.trip}
                    isPast={row.isPast}
                    onPress={() => router.push(`/trips/${row.trip.id}` as never)}
                  />
                </View>
              )
            }
          />
        )}
      </View>
      {!trips.isPending && rows.length > 0 ? (
        <Fab accessibilityLabel="Start a trip" onPress={() => router.push('/trips/new')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  columnWide: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenGutter,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.s4,
    gap: spacing.s3 + 2,
  },
  listContent: {
    paddingHorizontal: spacing.screenGutter,
    paddingTop: spacing.s4,
    paddingBottom: 120,
  },
  cardWrap: {
    marginBottom: spacing.s3 + 2,
  },
  pastDivider: {
    height: spacing.s3,
  },
  emptySecondary: {
    marginTop: spacing.s2,
  },
});

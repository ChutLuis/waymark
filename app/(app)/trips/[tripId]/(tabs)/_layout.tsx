import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Slot, useLocalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TripHeader, type TripTab } from '@/features/trips/TripHeader';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { spacing, useTheme } from '@/theme';

/**
 * Trip detail shell: the masthead and tab row stay mounted while the tab
 * panes swap underneath, so a failing pane never takes the header down.
 * On wide (web) layouts the whole shell becomes a centered column.
 */
export default function TripTabsLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();

  const trip = useTrip(tripId);
  const members = useTripMembers(tripId);

  const activeTab: TripTab = pathname.endsWith('/packing')
    ? 'packing'
    : pathname.endsWith('/notes')
      ? 'notes'
      : 'itinerary';

  const isWide = width >= 720;

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.surface.bg, paddingTop: insets.top + spacing.s3 },
      ]}
    >
      <View style={[styles.column, isWide && styles.columnWide]}>
        {trip.isPending ? (
          <LoadingState />
        ) : trip.isError ? (
          <ErrorState title="Couldn't load the trip" onRetry={() => trip.refetch()} />
        ) : (
          <>
            <TripHeader trip={trip.data} members={members.data ?? []} activeTab={activeTab} />
            <OfflineBanner />
            <View style={styles.pane}>
              <Slot />
            </View>
          </>
        )}
      </View>
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
  pane: {
    flex: 1,
  },
});

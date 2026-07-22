import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Fab } from '@/components/Fab';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { ItineraryItemEditor } from '@/features/itinerary/ItineraryItemEditor';
import { ItineraryRow } from '@/features/itinerary/ItineraryRow';
import { groupItineraryByDay } from '@/features/itinerary/group';
import { useItinerary } from '@/features/itinerary/hooks';
import { hasReminder, hydrateReminders, useReminderVersion } from '@/features/reminders/hooks';
import { useTrip } from '@/features/trips/hooks';
import { hairlineWidth, spacing, useTheme } from '@/theme';
import type { ItineraryItem } from '@/lib/types';

export default function ItineraryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const trip = useTrip(tripId);
  const itinerary = useItinerary(tripId);
  // Bell glyphs come from the persisted reminder store; subscribe so rows
  // update once hydration or an edit lands.
  const reminderVersion = useReminderVersion();
  useEffect(() => {
    hydrateReminders();
  }, []);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  const sections = useMemo(
    () =>
      groupItineraryByDay(itinerary.data ?? []).map((section) => ({
        key: section.key,
        title: section.title,
        data: section.items,
      })),
    [itinerary.data],
  );

  const openEditor = (item: ItineraryItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  if (itinerary.isPending) return <LoadingState />;
  if (itinerary.isError) {
    return (
      <ErrorState title="Couldn't load the itinerary" onRetry={() => itinerary.refetch()} />
    );
  }

  return (
    <View style={styles.screen}>
      {sections.length === 0 ? (
        <EmptyState
          title="Nothing planned yet"
          body="Start with the first thing you know is happening — even if it's just the flight."
          actionLabel="Add an item"
          onAction={() => openEditor(null)}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          extraData={reminderVersion}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.content}
          renderSectionHeader={({ section }) => (
            <View style={[styles.dayHeader, { borderBottomColor: colors.hairline.default }]}>
              <AppText role="serifNote" tone="secondary">
                {section.title}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <ItineraryRow
              item={item}
              hasReminder={hasReminder(item.id)}
              onPress={() => openEditor(item)}
            />
          )}
        />
      )}
      <Fab accessibilityLabel="Add an itinerary item" onPress={() => openEditor(null)} />
      <ItineraryItemEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tripId={tripId}
        item={editingItem}
        tripStartDate={trip.data?.startDate ?? null}
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
    paddingTop: spacing.s2,
    paddingBottom: 120,
  },
  dayHeader: {
    paddingTop: spacing.s4 + 2,
    paddingBottom: spacing.s2,
    borderBottomWidth: hairlineWidth,
  },
});

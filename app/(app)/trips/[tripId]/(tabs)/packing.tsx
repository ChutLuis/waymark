import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Fab } from '@/components/Fab';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { PackingItemEditor } from '@/features/packing/PackingItemEditor';
import { PackingRow } from '@/features/packing/PackingRow';
import { usePackingList, useSetPacked } from '@/features/packing/hooks';
import { useTripMembers } from '@/features/trips/hooks';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';
import type { PackingItem } from '@/lib/types';

export default function PackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const packing = usePackingList(tripId);
  const members = useTripMembers(tripId);
  const setPacked = useSetPacked(tripId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);

  const openEditor = (item: PackingItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  if (packing.isPending) return <LoadingState />;
  if (packing.isError) {
    return (
      <ErrorState title="Couldn't load the packing list" onRetry={() => packing.refetch()} />
    );
  }

  const items = packing.data;
  const packedCount = items.filter((i) => i.isPacked).length;

  return (
    <View style={styles.screen}>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing on the list yet"
          body="Add the things you'd hate to forget — chargers, documents, that one jacket."
          actionLabel="Add an item"
          onAction={() => openEditor(null)}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={[styles.progressRow, { borderBottomColor: colors.hairline.default }]}>
              <AppText role="caption" tone="secondary">
                {packedCount} of {items.length} packed
              </AppText>
              <View style={[styles.progressTrack, { backgroundColor: colors.hairline.default }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.accent.base,
                      width: `${Math.round((packedCount / items.length) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <PackingRow
              item={item}
              members={members.data ?? []}
              onTogglePacked={(isPacked) => setPacked.mutate({ itemId: item.id, isPacked })}
              onPress={() => openEditor(item)}
            />
          )}
        />
      )}
      <Fab accessibilityLabel="Add a packing item" onPress={() => openEditor(null)} />
      <PackingItemEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tripId={tripId}
        item={editingItem}
        members={members.data ?? []}
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
    paddingTop: spacing.s4,
    paddingBottom: 120,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.s2 + 2,
    borderBottomWidth: hairlineWidth,
  },
  progressTrack: {
    width: 120,
    height: 4,
    borderRadius: radius.xs / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: radius.xs / 2,
  },
});

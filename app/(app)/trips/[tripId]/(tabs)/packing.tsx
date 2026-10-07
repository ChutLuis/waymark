import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { PackingItemEditor } from '@/features/packing/PackingItemEditor';
import { usePackingList, useSavePackingItem, useSetPacked } from '@/features/packing/hooks';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { hairlineWidth, spacing, useTheme } from '@/theme';
import type { PackingItem, TripMember } from '@/lib/types';

function TitleRow({ subtitle, onAdd }: { subtitle: string; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleBlock}>
        <AppText role="tripTitle">Packing</AppText>
        {subtitle ? (
          <AppText role="meta" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a packing item"
        onPress={onAdd}
        style={({ pressed }) => [styles.actionPill, { backgroundColor: colors.ink }, pressed && styles.pressed]}
      >
        <Plus size={18} color={colors.paper} strokeWidth={2.4} />
        <AppText role="button" style={[styles.actionLabel, { color: colors.paper }]}>Add</AppText>
      </Pressable>
    </View>
  );
}

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkbox,
        checked
          ? { backgroundColor: colors.ink }
          : { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink },
        pressed && styles.pressed,
      ]}
    >
      {checked ? <Check size={16} color={colors.paper} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function PackingLabel({ item, semibold = false }: { item: PackingItem; semibold?: boolean }) {
  return (
    <AppText
      role={semibold ? 'rowTitle' : 'body'}
      tone={item.isPacked ? 'muted' : 'primary'}
    >
      {item.label}
      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
    </AppText>
  );
}

export default function PackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const trip = useTrip(tripId);
  const packing = usePackingList(tripId);
  const members = useTripMembers(tripId);
  const setPacked = useSetPacked(tripId);
  const save = useSavePackingItem(tripId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);

  const openEditor = (item: PackingItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  const items = useMemo(() => packing.data ?? [], [packing.data]);
  const memberList = members.data ?? [];

  const { unassigned, byMember, packed, total } = useMemo(() => {
    const unassigned: PackingItem[] = [];
    const byMember = new Map<string, PackingItem[]>();
    let packed = 0;
    for (const item of items) {
      if (item.isPacked) packed += 1;
      if (item.assignedTo === null) unassigned.push(item);
      else {
        const bucket = byMember.get(item.assignedTo);
        if (bucket) bucket.push(item);
        else byMember.set(item.assignedTo, [item]);
      }
    }
    return { unassigned, byMember, packed, total: items.length };
  }, [items]);

  if (packing.isPending) return <LoadingState />;
  if (packing.isError) {
    return <ErrorState title="Couldn't load the packing list" onRetry={() => packing.refetch()} />;
  }

  const firstName = (m: TripMember) => m.profile.displayName.split(' ')[0];
  const me = memberList.find((m) => m.userId === userId);
  const others = memberList.filter((m) => m.userId !== userId);

  const claim = (item: PackingItem, assignedTo: string) =>
    save.mutate({ itemId: item.id, input: { label: item.label, quantity: item.quantity, assignedTo } });

  const packedIn = (memberId: string) =>
    (byMember.get(memberId) ?? []).filter((i) => i.isPacked).length;

  return (
    <View style={styles.screen}>
      {items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <TitleRow subtitle={trip.data?.name ?? ''} onAdd={() => openEditor(null)} />
          <EmptyState
            title="Nothing on the list yet"
            body="Add the things you'd hate to forget — chargers, documents, that one jacket."
            actionLabel="Add an item"
            onAction={() => openEditor(null)}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TitleRow subtitle={trip.data?.name ?? ''} onAdd={() => openEditor(null)} />

          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.ink, width: `${total ? (packed / total) * 100 : 0}%` },
                ]}
              />
            </View>
            <AppText role="kickerLg">
              {packed} OF {total} PACKED
            </AppText>
          </View>

          {unassigned.length > 0 ? (
            <>
              <AppText role="kicker" tone="secondary" style={styles.kicker}>
                NEEDS SOMEONE · {unassigned.length}
              </AppText>
              <View style={[styles.needsCard, { borderColor: colors.ink3 }]}>
                {unassigned.map((item) => (
                  <View key={item.id} style={styles.needsRow}>
                    <Checkbox
                      checked={item.isPacked}
                      label={`${item.label}, ${item.isPacked ? 'packed' : 'not packed'}`}
                      onPress={() => setPacked.mutate({ itemId: item.id, isPacked: !item.isPacked })}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.label}`}
                      onPress={() => openEditor(item)}
                      style={styles.needsLabel}
                    >
                      <PackingLabel item={item} semibold />
                    </Pressable>
                    {me ? (
                      <Button
                        label="Me"
                        variant="secondary"
                        size="sm"
                        onPress={() => claim(item, me.userId)}
                        style={styles.claimButton}
                      />
                    ) : null}
                    {others.map((m) => (
                      <Button
                        key={m.userId}
                        label={firstName(m)}
                        variant="secondary"
                        size="sm"
                        onPress={() => claim(item, m.userId)}
                        style={styles.claimButton}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {me ? (
            <BagSection
              title={`YOUR BAG · ${packedIn(me.userId)} OF ${(byMember.get(me.userId) ?? []).length} PACKED`}
              items={byMember.get(me.userId) ?? []}
              onToggle={(item) => setPacked.mutate({ itemId: item.id, isPacked: !item.isPacked })}
              onOpen={openEditor}
            />
          ) : null}
          {others.map((m) => (
            <BagSection
              key={m.userId}
              title={`${firstName(m).toUpperCase()}'S BAG · ${packedIn(m.userId)} OF ${(byMember.get(m.userId) ?? []).length} PACKED`}
              items={byMember.get(m.userId) ?? []}
              onToggle={(item) => setPacked.mutate({ itemId: item.id, isPacked: !item.isPacked })}
              onOpen={openEditor}
            />
          ))}
        </ScrollView>
      )}

      <PackingItemEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tripId={tripId}
        item={editingItem}
        members={memberList}
      />
    </View>
  );
}

function BagSection({
  title,
  items,
  onToggle,
  onOpen,
}: {
  title: string;
  items: PackingItem[];
  onToggle: (item: PackingItem) => void;
  onOpen: (item: PackingItem) => void;
}) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  return (
    <>
      <AppText role="kicker" tone="secondary" style={styles.kicker}>
        {title}
      </AppText>
      <View style={[styles.bagCard, { backgroundColor: colors.paper }]}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.bagRow,
              index < items.length - 1 && {
                borderBottomWidth: hairlineWidth,
                borderBottomColor: colors.hairline,
              },
            ]}
          >
            <Checkbox
              checked={item.isPacked}
              label={`${item.label}, ${item.isPacked ? 'packed' : 'not packed'}`}
              onPress={() => onToggle(item)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.label}`}
              onPress={() => onOpen(item)}
              style={styles.bagLabel}
            >
              <PackingLabel item={item} />
            </Pressable>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 100 },
  titleRow: {
    paddingTop: spacing.s6,
    paddingHorizontal: 20,
    paddingLeft: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.s5,
  },
  titleBlock: { flexShrink: 1 },
  subtitle: { marginTop: 2 },
  actionPill: {
    height: 44,
    paddingLeft: spacing.s5,
    paddingRight: spacing.s7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: { fontSize: 15, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s5,
    paddingTop: spacing.s6,
    paddingHorizontal: spacing.gutter,
  },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  kicker: { paddingTop: spacing.s8, paddingBottom: spacing.s3, paddingHorizontal: spacing.gutter },
  needsCard: {
    marginHorizontal: spacing.cardGutter,
    borderRadius: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 9,
    paddingLeft: 15,
  },
  needsRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    flexWrap: 'wrap',
    // A single line would sit at the top otherwise (item N8).
    alignContent: 'center',
  },
  needsLabel: { flex: 1, minWidth: 120 },
  claimButton: { minHeight: 44, paddingHorizontal: 16 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagCard: { marginHorizontal: spacing.cardGutter, borderRadius: 4, paddingHorizontal: 16, boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)' },
  bagRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.s6 },
  bagLabel: { flex: 1 },
});
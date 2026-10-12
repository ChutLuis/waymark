import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { sampleTrack, useEntrance } from '@/components/motion';
import { rise } from '@/components/motion/keyframes';
import { Bag } from '@/features/packing/Bag';
import { LooseTag, type ClaimTarget } from '@/features/packing/LooseTag';
import { PackingItemEditor } from '@/features/packing/PackingItemEditor';
import { isBagPacked, tagTilt, type BagRect } from '@/features/packing/bags';
import { usePackingList, useSavePackingItem, useSetPacked } from '@/features/packing/hooks';
import { SHELL } from '@/features/trips/shellLayout';
import { tabEntranceBase } from '@/features/trips/shellMotion';
import { useTripMembers } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { motion, radius, spacing, useTheme } from '@/theme';
import type { PackingItem, TripMember } from '@/lib/types';

const SEGMENT = { height: 8, gap: 4, outline: 1.25 } as const;

function RiseIn({ distance, delay, children, style }: { distance: number; delay: number; children: ReactNode; style?: object }) {
  const keys = rise(distance);
  const p = useEntrance(motion.duration.rise, delay);
  const animated = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.standard),
    transform: [{ translateY: sampleTrack(keys.translateY, p.value, motion.easing.standard) }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

function TitleRow({ base, onAdd }: { base: number; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <RiseIn distance={16} delay={base} style={styles.titleRow}>
      <AppText role="tripTitle">Packing</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a packing item"
        onPress={onAdd}
        style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.ink }, pressed && styles.pressed]}
      >
        <Plus size={18} color={colors.paper} strokeWidth={2.4} />
        <AppText role="pillLabel" style={{ color: colors.paper }}>
          Add
        </AppText>
      </Pressable>
    </RiseIn>
  );
}

function Progress({ items }: { items: PackingItem[] }) {
  const { colors } = useTheme();
  const packed = items.filter((i) => i.isPacked).length;
  return (
    <View style={styles.progressRow}>
      <View style={styles.segments}>
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.segment,
              item.isPacked
                ? { backgroundColor: colors.ink }
                : { borderWidth: SEGMENT.outline, borderColor: colors.ink3 },
            ]}
          />
        ))}
      </View>
      <AppText role="kicker">
        {packed} OF {items.length} PACKED
      </AppText>
    </View>
  );
}

export default function PackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { userId } = useAuth();
  const packing = usePackingList(tripId);
  const members = useTripMembers(tripId);
  const setPacked = useSetPacked(tripId);
  const save = useSavePackingItem(tripId);
  const [base] = useState(tabEntranceBase);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(() => new Set());
  const [claimKeys, setClaimKeys] = useState<Record<string, number>>({});
  const rects = useSharedValue<BagRect[]>([]);
  const bagRefs = useRef(new Map<string, View>());
  const tossed = useRef(new Set<string>());

  const openEditor = (item: PackingItem | null) => {
    setEditingItem(item);
    setEditorVisible(true);
  };

  const items = useMemo(() => packing.data ?? [], [packing.data]);
  const memberList = useMemo(() => members.data ?? [], [members.data]);
  const me = memberList.find((m) => m.userId === userId);
  const bagOwners = useMemo(
    () => [...(me ? [me] : []), ...memberList.filter((m) => m.userId !== userId)],
    [me, memberList, userId],
  );

  const loose = items.filter((i) => i.assignedTo === null && i.id !== hiddenId);
  const byBag = useMemo(() => {
    const map = new Map<string, PackingItem[]>();
    for (const item of items) {
      if (!item.assignedTo) continue;
      map.set(item.assignedTo, [...(map.get(item.assignedTo) ?? []), item]);
    }
    return map;
  }, [items]);

  const packedNow = useMemo(
    () => Object.fromEntries(bagOwners.map((m) => [m.userId, isBagPacked(byBag.get(m.userId) ?? [])])),
    [bagOwners, byBag],
  );

  useEffect(() => {
    loose.forEach((i) => tossed.current.add(i.id));
  });

  // Measure the bags once their drop slots have laid out.
  useEffect(() => {
    if (!dragging) return;
    const frame = requestAnimationFrame(() => {
      const measured: BagRect[] = [];
      const refs = [...bagRefs.current.entries()];
      refs.forEach(([id, view]) =>
        view.measureInWindow((x, y, width, height) => {
          measured.push({ id, x, y, width, height });
          if (measured.length === refs.length) rects.value = measured;
        }),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [dragging, rects]);

  const firstName = (m: TripMember) => m.profile.displayName.split(' ')[0];
  const bagTitle = (m: TripMember) => (m.userId === userId ? 'YOUR BAG' : `${firstName(m).toUpperCase()}'S BAG`);
  const targets: ClaimTarget[] = bagOwners.map((m) => ({
    bagId: m.userId,
    label: m.userId === userId ? 'your bag' : `${firstName(m)}'s bag`,
  }));

  const onDrop = useCallback(
    (id: string, bagId: string | null) => {
      setDragging(null);
      setHovered(null);
      rects.value = [];
      if (!bagId) return;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      setHiddenId(id);
      setClaimedIds((prev) => new Set(prev).add(id));
      setClaimKeys((prev) => ({ ...prev, [bagId]: (prev[bagId] ?? 0) + 1 }));
      save.mutate(
        { itemId: id, input: { label: item.label, quantity: item.quantity, assignedTo: bagId } },
        { onSettled: () => setHiddenId(null) },
      );
    },
    [items, save, rects],
  );

  if (packing.isPending) return <LoadingState />;
  if (packing.isError) {
    return <ErrorState title="Couldn't load the packing list" onRetry={() => packing.refetch()} />;
  }

  const rows: TripMember[][] = [];
  for (let i = 0; i < bagOwners.length; i += 2) rows.push(bagOwners.slice(i, i + 2));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TitleRow base={base} onAdd={() => openEditor(null)} />
        {items.length === 0 ? (
          <EmptyState
            placement="top"
            title="Nothing on the list yet"
            body="Add the things you'd hate to forget — chargers, documents, that one jacket."
            actionLabel="Add an item"
            onAction={() => openEditor(null)}
          />
        ) : (
          <>
            <Progress items={items} />

            {loose.length > 0 ? (
              <>
                <View style={styles.looseHead}>
                  <AppText role="kicker" tone="secondary">
                    LOOSE TAGS · {loose.length}
                  </AppText>
                  <AppText role="tagSm" tone="muted" style={styles.dragHint}>
                    DRAG INTO A BAG
                  </AppText>
                </View>
                <View style={[styles.tags, dragging ? styles.tagsLifted : null]}>
                  {loose.map((item, index) => (
                    <LooseTag
                      key={item.id}
                      id={item.id}
                      label={`${item.label}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`}
                      index={index}
                      tilt={tagTilt(index)}
                      base={base}
                      entering={!tossed.current.has(item.id)}
                      rects={rects}
                      targets={targets}
                      onDragStart={setDragging}
                      onHover={setHovered}
                      onDrop={onDrop}
                      onEdit={() => openEditor(item)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <RiseIn distance={30} delay={base + motion.choreo.packing.bagsAt} style={styles.bags}>
              {rows.map((row) => (
                <View key={row.map((m) => m.userId).join('-')} style={styles.bagRow}>
                  {row.map((m) => (
                    <Bag
                      key={m.userId}
                      ref={(view) => {
                        if (view) bagRefs.current.set(m.userId, view);
                        else bagRefs.current.delete(m.userId);
                      }}
                      title={bagTitle(m)}
                      items={byBag.get(m.userId) ?? []}
                      packed={packedNow[m.userId] ?? false}
                      dragging={dragging !== null}
                      hovered={hovered === m.userId}
                      claimedIds={claimedIds}
                      claimKey={claimKeys[m.userId] ?? 0}
                      onToggle={(item) => setPacked.mutate({ itemId: item.id, isPacked: !item.isPacked })}
                      onEdit={openEditor}
                    />
                  ))}
                </View>
              ))}
            </RiseIn>
          </>
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: SHELL.tabContentClearance },
  titleRow: {
    paddingTop: spacing.s11,
    paddingLeft: spacing.gutter,
    paddingRight: spacing.s7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s5,
  },
  actionButton: {
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s6,
    paddingTop: spacing.s11,
    paddingHorizontal: spacing.gutter,
  },
  segments: { flex: 1, flexDirection: 'row', gap: SEGMENT.gap },
  segment: { flex: 1, height: SEGMENT.height, borderRadius: 1 },
  looseHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.s5,
    paddingHorizontal: spacing.gutter,
  },
  dragHint: { letterSpacing: 0.8 },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 8,
    paddingTop: spacing.s4,
    paddingHorizontal: spacing.s7,
    zIndex: 5,
  },
  tagsLifted: { zIndex: 20 },
  bags: { paddingTop: spacing.s12 + 6, paddingHorizontal: spacing.cardGutter, gap: spacing.s12 },
  bagRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});

import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { sampleTrack, useEntrance, useMotion, useTimeline } from '@/components/motion';
import { bagClaimSquash, bagSlamSquash, checkboxPop, claimRow, packedSlam } from '@/components/motion/keyframes';
import { haptic, hapticAfter } from '@/lib/haptics';
import { motion, radius, shadows, hitTargetMin, useTheme } from '@/theme';
import type { PackingItem } from '@/lib/types';
import { becamePacked, completesBag } from './bags';

const GEO = {
  handle: { width: 46, height: 14, top: -12, stroke: 2 },
  minHeight: 220,
  padding: 12,
  packedRoom: 50,
  checkbox: 20,
  slot: 40,
} as const;

function itemLabel(item: PackingItem): string {
  return `${item.label}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`;
}

function BagRow({
  item,
  claimed,
  onToggle,
  onEdit,
}: {
  item: PackingItem;
  /** Just dropped into this bag: it lands with the claim motion. */
  claimed: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { colors } = useTheme();
  const land = useEntrance(motion.duration.claim, 0, claimed);
  const pop = useTimeline(1);
  const rowStyle = useAnimatedStyle(() => ({
    opacity: sampleTrack(claimRow.opacity, land.value, motion.easing.claim),
    transform: [
      { translateY: sampleTrack(claimRow.translateY, land.value, motion.easing.claim) },
      { scale: sampleTrack(claimRow.scale, land.value, motion.easing.claim) },
    ],
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sampleTrack(checkboxPop.scale, pop.p.value, motion.easing.standard) }],
  }));
  const checked = item.isPacked;

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${item.label}, ${checked ? 'packed' : 'not packed'}`}
        accessibilityState={{ checked }}
        accessibilityActions={[{ name: 'edit', label: `Edit ${item.label}` }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'edit') onEdit();
        }}
        onPress={() => {
          haptic('selection');
          pop.run(motion.choreo.packing.checkPop);
          onToggle();
        }}
        onLongPress={onEdit}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Animated.View
          style={[
            styles.checkbox,
            { borderColor: colors.ink, backgroundColor: checked ? colors.ink : colors.paper },
            boxStyle,
          ]}
        >
          {checked ? <Check size={14} color={colors.paper} strokeWidth={3} /> : null}
        </Animated.View>
        {/* Checked rows drop to Besley 400 in ink3 (README 08). */}
        <AppText role={checked ? 'bodySm' : 'tagLabel'} tone={checked ? 'muted' : 'primary'} style={styles.rowLabel}>
          {itemLabel(item)}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

interface BagProps {
  title: string;
  items: PackingItem[];
  packed: boolean;
  /** A tag is being dragged: show the drop slot. */
  dragging: boolean;
  hovered: boolean;
  claimedIds: Set<string>;
  /** Bumped when a tag lands in this bag. */
  claimKey: number;
  onToggle: (item: PackingItem) => void;
  onEdit: (item: PackingItem) => void;
}

/**
 * A member's bag (Airmail v4 · 08): a paper bag with a handle, its items as
 * whole-row checkboxes, a drop slot while a tag is dragged, and the PACKED
 * stamp, which slams only when the bag becomes fully checked.
 */
export const Bag = forwardRef<View, BagProps>(function Bag(
  { title, items, packed, dragging, hovered, claimedIds, claimKey, onToggle, onEdit },
  ref,
) {
  const { colors } = useTheme();
  const { ms } = useMotion();
  const claimSquash = useTimeline(1);
  const slamSquash = useTimeline(1);
  const slam = useTimeline(1);
  // The stamp is always mounted and hidden while the bag isn't full, so it
  // can never paint at rest before it slams.
  const stampShown = useSharedValue(packed ? 1 : 0);
  const wasPacked = useRef<boolean | null>(null);
  const firstClaim = useRef(true);
  // The slam is feedback for a press on this device. Refetches from another
  // member, and an optimistic rollback that restores the previous list, must
  // not re-slam a bag the user did not just complete.
  const slamArmed = useRef(false);

  useEffect(() => {
    if (firstClaim.current) {
      firstClaim.current = false;
      return;
    }
    claimSquash.run(motion.duration.claim);
    haptic('light');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimKey]);

  // PACKED slams on the false → true change only, detected here before the
  // frame paints: the slam drops to 0 and the stamp shows in the same tick.
  // Mount and refetch stay still — and so does a change this device did not
  // cause, since only a local press arms the slam. A bag that stops being
  // full loses it at once.
  useLayoutEffect(() => {
    const slams = becamePacked(wasPacked.current, packed);
    const local = slamArmed.current;
    slamArmed.current = false;
    wasPacked.current = packed;
    if (!slams || !local) {
      stampShown.value = packed ? 1 : 0;
      return;
    }
    slam.run(motion.duration.slam);
    stampShown.value = 1;
    slamSquash.run(motion.choreo.packing.slamSquash, motion.choreo.packing.slamSquashAt);
    return hapticAfter('medium', ms(motion.choreo.packing.slamContact));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packed]);

  const bagStyle = useAnimatedStyle(() => {
    const c = claimSquash.p.value;
    const s = slamSquash.p.value;
    return {
      transform: [
        {
          translateY:
            sampleTrack(bagClaimSquash.translateY, c, motion.easing.standard) +
            sampleTrack(bagSlamSquash.translateY, s, motion.easing.standard),
        },
        {
          scaleY:
            sampleTrack(bagClaimSquash.scaleY, c, motion.easing.standard) *
            sampleTrack(bagSlamSquash.scaleY, s, motion.easing.standard),
        },
      ],
    };
  });
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampShown.value * sampleTrack(packedSlam.opacity, slam.p.value, motion.easing.slam),
    transform: [
      { rotate: `${sampleTrack(packedSlam.rotate, slam.p.value, motion.easing.slam)}deg` },
      { scale: sampleTrack(packedSlam.scale, slam.p.value, motion.easing.slam) },
    ],
  }));

  const checked = items.filter((i) => i.isPacked).length;

  return (
    <View ref={ref} collapsable={false} style={styles.column}>
      <View
        pointerEvents="none"
        style={[styles.handle, { borderColor: colors.ink }]}
      />
      <Animated.View
        style={[
          styles.bag,
          {
            backgroundColor: colors.paper,
            borderColor: colors.ink,
            boxShadow: shadows.bag,
            paddingBottom: packed ? GEO.packedRoom : GEO.padding,
          },
          bagStyle,
        ]}
      >
        <View style={styles.header}>
          <AppText role="kickerSm" numberOfLines={1} style={styles.headerTitle}>
            {title}
          </AppText>
          <AppText role="kickerSm" tone="secondary">
            {checked}/{items.length}
          </AppText>
        </View>
        <View style={[styles.rule, { borderColor: colors.ruleWarm }]} />
        {items.map((item) => (
          <BagRow
            key={item.id}
            item={item}
            claimed={claimedIds.has(item.id)}
            onToggle={() => {
              // This press is what fills the bag, so the slam that follows is
              // feedback for it (armed before the parent's optimistic update).
              slamArmed.current = completesBag(items, item);
              onToggle(item);
            }}
            onEdit={() => onEdit(item)}
          />
        ))}
        {dragging ? (
          <View
            style={[
              styles.slot,
              hovered
                ? { borderColor: colors.airmailBlue, backgroundColor: colors.slotHover }
                : { borderColor: colors.slot, backgroundColor: colors.slotFill },
            ]}
          />
        ) : null}
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden={!packed}
          importantForAccessibility={packed ? 'auto' : 'no-hide-descendants'}
          style={[styles.packed, { borderColor: colors.success }, stampStyle]}
        >
          <AppText role="packedStamp" tone="success">
            PACKED
          </AppText>
        </Animated.View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  column: { flex: 1, minWidth: 0 },
  handle: {
    position: 'absolute',
    top: GEO.handle.top,
    left: '50%',
    marginLeft: -GEO.handle.width / 2,
    width: GEO.handle.width,
    height: GEO.handle.height,
    borderWidth: GEO.handle.stroke,
    borderBottomWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bag: {
    flex: 1,
    minHeight: GEO.minHeight,
    borderRadius: 6,
    borderWidth: 1.5,
    paddingTop: GEO.padding,
    paddingHorizontal: GEO.padding,
    transformOrigin: '50% 100%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  headerTitle: { flexShrink: 1 },
  rule: { borderTopWidth: 1.5, borderStyle: 'dashed', marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, minHeight: hitTargetMin },
  checkbox: {
    width: GEO.checkbox,
    height: GEO.checkbox,
    borderRadius: radius.checkbox,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, minWidth: 0 },
  slot: { marginTop: 8, height: GEO.slot, borderRadius: radius.codeBox, borderWidth: 1.5, borderStyle: 'dashed' },
  packed: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    borderWidth: 2,
    borderRadius: radius.tag,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pressed: { opacity: 0.7 },
});

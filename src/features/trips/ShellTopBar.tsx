import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { iconStrokeWidth, radius, shadows, useTheme } from '@/theme';
import type { Profile } from '@/lib/types';
import { SHELL } from './shellLayout';

const PILL_HEIGHT = 40;
const MEMBER_STAMP = { width: 20, height: 24, overlap: -4 } as const;

interface ShellTopBarProps {
  tripName: string;
  members: Profile[];
  /** Over scene art the pills are glass; on the paper banner they are bg. */
  overArt: boolean;
  onBack: () => void;
  onOpenTrip: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Tiny perforated stamps with each member's initial, in one glass pill. */
function MemberStamps({ members }: { members: Profile[] }) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.memberRow}
      accessibilityLabel={`Members: ${members.map((m) => m.displayName).join(', ')}`}
    >
      {members.map((member, index) => (
        <PerforatedStamp
          key={member.id}
          width={MEMBER_STAMP.width}
          height={MEMBER_STAMP.height}
          size="xs"
          style={index > 0 ? styles.memberOverlap : null}
        >
          <View style={[styles.memberPanel, { backgroundColor: colors.stampInk }]}>
            <AppText role="brandLetter" style={[styles.memberInitial, { color: colors.stampPaper }]}>
              {(member.displayName.trim()[0] ?? '?').toUpperCase()}
            </AppText>
          </View>
        </PerforatedStamp>
      ))}
    </View>
  );
}

/**
 * The trip shell's top bar (Airmail v4): a back square, the title pill that
 * opens the Trip page (sheet of stamps), and the members as stamps.
 */
export function ShellTopBar({ tripName, members, overArt, onBack, onOpenTrip, style }: ShellTopBarProps) {
  const { colors } = useTheme();
  const pillSurface = { backgroundColor: overArt ? colors.glass : colors.bg, boxShadow: shadows.pill };
  return (
    <Animated.View style={[styles.row, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your trips"
        onPress={onBack}
        hitSlop={2}
        style={({ pressed }) => [styles.square, pillSurface, pressed && styles.pressed]}
      >
        <ChevronLeft size={20} color={colors.ink} strokeWidth={iconStrokeWidth + 0.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tripName}, trip details`}
        onPress={onOpenTrip}
        style={({ pressed }) => [styles.titlePill, pillSurface, pressed && styles.pressed]}
      >
        <AppText role="pillLabel" numberOfLines={1} style={styles.titleText}>
          {tripName}
        </AppText>
        <ChevronDown size={16} color={colors.ink2} strokeWidth={iconStrokeWidth} />
      </Pressable>
      <View style={styles.spacer} />
      {members.length > 0 ? (
        <View style={[styles.membersPill, pillSurface]}>
          <MemberStamps members={members} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: SHELL.topBarHeight,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  square: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: radius.codeBox,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    height: PILL_HEIGHT,
    paddingLeft: 13,
    paddingRight: 10,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  titleText: { flexShrink: 1 },
  spacer: { flex: 1 },
  membersPill: {
    height: PILL_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: radius.codeBox,
    justifyContent: 'center',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberOverlap: { marginLeft: MEMBER_STAMP.overlap },
  memberPanel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 10, lineHeight: 12 },
  pressed: { opacity: 0.7 },
});

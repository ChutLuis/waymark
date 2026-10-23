import { Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronDown, ChevronLeft, MailPlus } from 'lucide-react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { AppText } from '@/components/AppText';
import { PerforatedStamp } from '@/components/airmail/PerforatedStamp';
import { hitTargetMin, iconSizes, iconStrokeWidth, radius, shadows, spacing, useTheme } from '@/theme';
import type { Profile } from '@/lib/types';
import { SHELL } from './shellLayout';

const PILL_HEIGHT = hitTargetMin;
const MEMBER_STAMP = { width: 20, height: 24, overlap: -4 } as const;

interface ShellTopBarProps {
  tripName: string;
  members: Profile[];
  /** Over scene art the pills are glass; on the paper banner they are bg. */
  overArt: boolean;
  onBack: () => void;
  onOpenTrip: () => void;
  onInvite: () => void;
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
}

/** Tiny perforated stamps with each member's initial, in one glass pill. */
function MemberStamps({ members, maxVisible }: { members: Profile[]; maxVisible: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.memberRow}
      accessibilityLabel={`Members: ${members.map((m) => m.displayName).join(', ')}`}
    >
      {members.slice(0, maxVisible).map((member, index) => (
        <PerforatedStamp
          key={member.id}
          width={MEMBER_STAMP.width}
          height={MEMBER_STAMP.height}
          size="xs"
          style={index > 0 ? styles.memberOverlap : null}
        >
          <View style={[styles.memberPanel, { backgroundColor: colors.stampInk }]}>
            <AppText role="brandLetter" style={{ color: colors.stampPaper }}>
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
 * explicitly opens Trip details, and the members as a labeled Invite shortcut.
 */
export function ShellTopBar({ tripName, members, overArt, onBack, onOpenTrip, onInvite, style }: ShellTopBarProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pillSurface = { backgroundColor: overArt ? colors.glass : colors.bg, boxShadow: shadows.pill };
  return (
    <Animated.View style={[styles.row, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to your trips"
        onPress={onBack}
        style={({ pressed }) => [styles.square, pillSurface, pressed && styles.pressed]}
      >
        <ChevronLeft size={iconSizes.lg} color={colors.ink} strokeWidth={iconStrokeWidth + 0.2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tripName}, trip details`}
        testID="trip-details-shortcut"
        accessibilityHint="View trip dates, destination and members"
        onPress={onOpenTrip}
        style={({ pressed }) => [styles.titlePill, pillSurface, pressed && styles.pressed]}
      >
        <View style={styles.titleCopy}>
          <AppText role="pillLabel" numberOfLines={1}>{tripName}</AppText>
          <AppText role="kickerSm" tone="secondary" numberOfLines={1}>Trip details</AppText>
        </View>
        <ChevronDown size={iconSizes.sm} color={colors.ink2} strokeWidth={iconStrokeWidth} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Invite someone to ${tripName}`}
        testID="trip-invite-shortcut"
        accessibilityHint="Share an invitation link or copy the code"
        onPress={onInvite}
        style={({ pressed }) => [styles.membersPill, pillSurface, pressed && styles.pressed]}
      >
        {members.length > 0 ? <MemberStamps members={members} maxVisible={width < 360 ? 1 : 2} /> : (
          <MailPlus size={iconSizes.md} color={colors.ink} strokeWidth={iconStrokeWidth} />
        )}
        <AppText role="tagLabel">Invite</AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: SHELL.topBarHeight,
    paddingHorizontal: spacing.s7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
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
    paddingLeft: spacing.s5,
    paddingRight: spacing.s4,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    flex: 1,
    minWidth: hitTargetMin,
  },
  titleCopy: { flex: 1, minWidth: 0 },
  membersPill: {
    height: PILL_HEIGHT,
    minWidth: hitTargetMin,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberOverlap: { marginLeft: MEMBER_STAMP.overlap },
  memberPanel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});

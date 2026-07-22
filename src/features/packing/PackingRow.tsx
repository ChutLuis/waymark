import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';
import type { PackingItem, TripMember } from '@/lib/types';

interface PackingRowProps {
  item: PackingItem;
  members: TripMember[];
  onTogglePacked: (isPacked: boolean) => void;
  onPress: () => void;
}

export function PackingRow({ item, members, onTogglePacked, onPress }: PackingRowProps) {
  const { colors } = useTheme();
  const assigneeIndex = members.findIndex((m) => m.userId === item.assignedTo);
  const assignee = assigneeIndex >= 0 ? members[assigneeIndex] : null;

  return (
    <View style={[styles.row, { borderBottomColor: colors.hairline.default }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${item.label}, ${item.isPacked ? 'packed' : 'not packed'}`}
        accessibilityState={{ checked: item.isPacked }}
        hitSlop={10}
        onPress={() => onTogglePacked(!item.isPacked)}
        style={({ pressed }) => [
          styles.checkbox,
          item.isPacked
            ? { backgroundColor: colors.accent.base }
            : {
                backgroundColor: colors.surface.raised,
                borderWidth: 1.5,
                borderColor: colors.hairline.strong,
              },
          pressed && styles.pressed,
        ]}
      >
        {item.isPacked ? (
          <Check size={14} color={colors.accent.onAccent} strokeWidth={2} />
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label}`}
        onPress={onPress}
        style={({ pressed }) => [styles.labelArea, pressed && styles.pressed]}
      >
        <AppText
          tone={item.isPacked ? 'muted' : 'primary'}
          style={item.isPacked && {
            textDecorationLine: 'line-through',
            textDecorationColor: colors.text.faint,
          }}
        >
          {item.label}
          {item.quantity > 1 ? (
            <AppText role="caption" tone="faint" style={styles.quantity}>
              {'  '}× {item.quantity}
            </AppText>
          ) : null}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          assignee ? `Assigned to ${assignee.profile.displayName}. Reassign` : 'Assign to someone'
        }
        hitSlop={10}
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {assignee ? (
          <Avatar
            name={assignee.profile.displayName}
            avatarPath={assignee.profile.avatarPath}
            size={26}
            toneIndex={assigneeIndex}
          />
        ) : (
          <View style={[styles.unassigned, { borderColor: colors.text.faint }]}>
            <Plus size={12} color={colors.text.faint} strokeWidth={2} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3 + 2,
    paddingVertical: spacing.s3,
    borderBottomWidth: hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelArea: {
    flex: 1,
  },
  quantity: {
    textDecorationLine: 'none',
  },
  unassigned: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

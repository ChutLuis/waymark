import { Pressable, StyleSheet, View } from 'react-native';
import { Bell, Check } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { hairlineWidth, radius, spacing, useTheme } from '@/theme';
import { formatTime } from '@/lib/format/date';
import type { ItineraryItem } from '@/lib/types';

function StatusIndicator({ status }: { status: ItineraryItem['status'] }) {
  const { colors } = useTheme();
  if (status === 'done') {
    return (
      <View style={styles.status}>
        <Check size={12} color={colors.text.muted} strokeWidth={1.8} />
        <AppText role="caption" tone="muted" style={styles.statusLabel}>
          Done
        </AppText>
      </View>
    );
  }
  const confirmed = status === 'confirmed';
  return (
    <View style={styles.status}>
      <View
        style={[
          styles.dot,
          confirmed
            ? { backgroundColor: colors.accent.base }
            : { borderWidth: 1.5, borderColor: colors.text.faint },
        ]}
      />
      <AppText
        role={confirmed ? 'label' : 'caption'}
        tone={confirmed ? 'accent' : 'muted'}
        style={styles.statusLabel}
      >
        {confirmed ? 'Confirmed' : 'Planned'}
      </AppText>
    </View>
  );
}

interface ItineraryRowProps {
  item: ItineraryItem;
  hasReminder: boolean;
  onPress: () => void;
  largeText?: boolean;
}

export function ItineraryRow({ item, hasReminder, onPress }: ItineraryRowProps) {
  const { colors } = useTheme();
  const done = item.status === 'done';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.status}${hasReminder ? ', reminder set' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.hairline.default },
        pressed && styles.pressed,
      ]}
    >
      <AppText role="caption" tone={item.startAt ? 'muted' : 'faint'} style={styles.time}>
        {item.startAt ? formatTime(item.startAt) : '—'}
      </AppText>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText
            role="bodyMedium"
            tone={done ? 'muted' : 'primary'}
            style={done && { textDecorationLine: 'line-through', textDecorationColor: colors.text.faint }}
          >
            {item.title}
          </AppText>
          {hasReminder ? (
            <Bell size={13} color={colors.accent.base} strokeWidth={1.8} />
          ) : null}
        </View>
        {(item.location ?? item.description) ? (
          <AppText role="caption" tone={done ? 'faint' : 'muted'} style={styles.supporting}>
            {item.location ?? item.description}
          </AppText>
        ) : null}
      </View>
      <StatusIndicator status={item.status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.s3 + 2,
    paddingVertical: 13,
    borderBottomWidth: hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  time: {
    width: 52,
    paddingTop: 2,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2 - 1,
  },
  supporting: {
    marginTop: 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 3,
    height: 'auto',
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
});

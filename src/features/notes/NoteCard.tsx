import { Pressable, StyleSheet, View } from 'react-native';
import { Lock, Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { spacing, useTheme } from '@/theme';
import { formatShortDate } from '@/lib/format/date';
import type { TripNote } from '@/lib/types';

interface NoteCardProps {
  note: TripNote;
  isOwn: boolean;
  authorName: string;
  onPress?: () => void;
}

function timestampLabel(note: TripNote): string {
  const label = formatShortDate(note.updatedAt);
  if (label === 'Today' && note.updatedAt !== note.createdAt) return 'Edited today';
  return label;
}

/**
 * The privacy affordance is triple-coded (never color alone): lock icon +
 * "ONLY YOU" label + raised surface for private; people icon + author +
 * flat surface for shared.
 */
export function NoteCard({ note, isOwn, authorName, onPress }: NoteCardProps) {
  const { colors } = useTheme();
  const priv = note.isPrivate;

  const card = (
    <Card surface={priv ? 'raised' : 'flat'} padded style={styles.card}>
      <View style={styles.header}>
        {priv ? (
          <Lock size={14} color={colors.accent.ink} strokeWidth={1.8} />
        ) : (
          <Users size={14} color={colors.text.muted} strokeWidth={1.8} />
        )}
        <SectionLabel tone={priv ? 'accent' : 'muted'} style={styles.kicker}>
          {priv ? 'Only you' : `Shared · ${isOwn ? 'You' : authorName}`}
        </SectionLabel>
        <AppText role="caption" tone="faint" style={styles.timestamp}>
          {timestampLabel(note)}
        </AppText>
      </View>
      <AppText style={styles.body}>{note.body}</AppText>
    </Card>
  );

  if (!onPress) return card;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${priv ? 'private' : 'shared'} note`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.s3 + 2,
    paddingHorizontal: spacing.s4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2 - 2,
    marginBottom: spacing.s2,
  },
  kicker: {
    letterSpacing: 1.2,
  },
  timestamp: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 'auto',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.7,
  },
});

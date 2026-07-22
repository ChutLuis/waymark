import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Fab } from '@/components/Fab';
import { SectionLabel } from '@/components/SectionLabel';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { NoteCard } from '@/features/notes/NoteCard';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { useNotes } from '@/features/notes/hooks';
import { useTripMembers } from '@/features/trips/hooks';
import { spacing, useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthContext';
import type { TripNote } from '@/lib/types';

type NotesRow = { type: 'note'; note: TripNote } | { type: 'divider' };

export default function NotesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const notes = useNotes(tripId);
  const members = useTripMembers(tripId);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<TripNote | null>(null);

  const openEditor = (note: TripNote | null) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  // Own private notes always on top; shared notes follow under a divider.
  const rows = useMemo<NotesRow[]>(() => {
    const byNewest = (a: TripNote, b: TripNote) => b.updatedAt.localeCompare(a.updatedAt);
    const mine = (notes.data ?? []).filter((n) => n.isPrivate).sort(byNewest);
    const shared = (notes.data ?? []).filter((n) => !n.isPrivate).sort(byNewest);
    const result: NotesRow[] = mine.map((note) => ({ type: 'note', note }));
    if (shared.length > 0) {
      if (mine.length > 0) result.push({ type: 'divider' });
      result.push(...shared.map((note): NotesRow => ({ type: 'note', note })));
    }
    return result;
  }, [notes.data]);

  const firstNameOf = (authorId: string): string => {
    const member = members.data?.find((m) => m.userId === authorId);
    return member?.profile.displayName.split(' ')[0] ?? 'A member';
  };

  if (notes.isPending) return <LoadingState />;
  if (notes.isError) {
    return <ErrorState title="Couldn't load the notes" onRetry={() => notes.refetch()} />;
  }

  return (
    <View style={styles.screen}>
      {rows.length === 0 ? (
        <EmptyState
          title="No notes yet"
          body="Keep anything here — confirmation numbers, ideas, surprises. Notes start private to you."
          actionLabel="Write a note"
          onAction={() => openEditor(null)}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => (row.type === 'note' ? row.note.id : `divider-${index}`)}
          contentContainerStyle={styles.content}
          renderItem={({ item: row }) =>
            row.type === 'divider' ? (
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.hairline.default }]} />
                <SectionLabel style={styles.dividerLabel}>Shared with the trip</SectionLabel>
                <View style={[styles.dividerLine, { backgroundColor: colors.hairline.default }]} />
              </View>
            ) : (
              <View style={styles.cardWrap}>
                <NoteCard
                  note={row.note}
                  isOwn={row.note.authorId === userId}
                  authorName={firstNameOf(row.note.authorId)}
                  onPress={
                    row.note.authorId === userId
                      ? () => openEditor(row.note)
                      : undefined
                  }
                />
              </View>
            )
          }
        />
      )}
      <Fab accessibilityLabel="Write a note" onPress={() => openEditor(null)} />
      <NoteEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tripId={tripId}
        note={editingNote}
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
  cardWrap: {
    marginBottom: spacing.s2 + 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2 + 2,
    paddingTop: spacing.s2 - 2,
    paddingBottom: spacing.s2 + 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    letterSpacing: 1.2,
  },
});

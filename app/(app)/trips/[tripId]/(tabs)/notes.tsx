import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Lock, Plus, Users } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { KraftEnvelope, WaxSeal } from '@/components/airmail/KraftEnvelope';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { useNotes } from '@/features/notes/hooks';
import { StampStill } from '@/features/trips/SceneStamp';
import { memberNamesWording, matchDestination } from '@/features/trips/destinations';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { spacing, useTheme } from '@/theme';
import { formatNoteTime, formatShortDate } from '@/lib/format/date';
import type { TripNote } from '@/lib/types';

type Filter = 'all' | 'shared' | 'private';

function TitleRow({ subtitle, onAdd }: { subtitle: string; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleBlock}>
        <AppText role="tripTitle">Notes</AppText>
        {subtitle ? (
          <AppText role="meta" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Write a new note"
        onPress={onAdd}
        style={({ pressed }) => [styles.actionPill, { backgroundColor: colors.ink }, pressed && styles.pressed]}
      >
        <Plus size={18} color={colors.paper} strokeWidth={2.4} />
        <AppText role="button" style={[styles.actionLabel, { color: colors.paper }]}>
          New note
        </AppText>
      </Pressable>
    </View>
  );
}

/** Relative label: "TODAY", "YESTERDAY", else a short date. */
function relativeLabel(iso: string): string {
  const label = formatShortDate(iso);
  return label.toUpperCase();
}

export default function NotesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { colors } = useTheme();
  const { userId } = useAuth();
  const trip = useTrip(tripId);
  const notes = useNotes(tripId);
  const members = useTripMembers(tripId);

  const [filter, setFilter] = useState<Filter>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<TripNote | null>(null);

  const openEditor = (note: TripNote | null) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const all = useMemo(() => notes.data ?? [], [notes.data]);
  const shared = all.filter((n) => !n.isPrivate);
  const mine = all.filter((n) => n.isPrivate);

  const visible = useMemo(() => {
    const byNewest = (a: TripNote, b: TripNote) => b.updatedAt.localeCompare(a.updatedAt);
    const list = filter === 'shared' ? shared : filter === 'private' ? mine : all;
    // Private notes first, then shared, newest first within each.
    return [...list.filter((n) => n.isPrivate), ...list.filter((n) => !n.isPrivate)].sort(byNewest);
  }, [filter, all, shared, mine]);

  const country = matchDestination(trip.data?.destination ?? null);

  const others = (members.data ?? [])
    .filter((m) => m.userId !== userId)
    .map((m) => m.profile.displayName);
  const names = memberNamesWording(others).replace(/^with /, '');
  const onlyOtherFirstName = others.length === 1 ? (others[0].split(' ')[0] ?? '') : '';

  const firstNameOf = (authorId: string): string => {
    const member = members.data?.find((m) => m.userId === authorId);
    return member?.profile.displayName.split(' ')[0] ?? 'A member';
  };
  const initialOf = (authorId: string): string =>
    (firstNameOf(authorId)[0] ?? '?').toUpperCase();

  if (notes.isPending) return <LoadingState />;
  if (notes.isError) {
    return <ErrorState title="Couldn't load the notes" onRetry={() => notes.refetch()} />;
  }

  const options = [
    { value: 'all' as const, label: `All · ${all.length}` },
    { value: 'shared' as const, label: `Shared · ${shared.length}` },
    { value: 'private' as const, label: `Only you · ${mine.length}` },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TitleRow subtitle={trip.data?.name ?? ''} onAdd={() => openEditor(null)} />

        <AppText role="body" style={[styles.intro, { color: colors.inkBody }]}>
          {others.length === 0
            ? `Postcards are shared with anyone you invite. Sealed notes are only for you.`
            : others.length === 1
              ? `Postcards are shared with ${names}. Sealed notes are only for you. ${onlyOtherFirstName} can't open yours, and you can't open ${onlyOtherFirstName}'s.`
              : `Postcards are shared with ${names}. Sealed notes are only for you. No one else can open yours, and you can't open theirs.`}
        </AppText>

        {all.length > 0 ? (
          <View style={styles.filterWrap}>
            <SegmentedControl
              options={options}
              value={filter}
              onChange={setFilter}
              accessibilityLabel="Filter notes"
              stretch={false}
              style={styles.filterControl}
            />
          </View>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            placement="top"
            title="No notes yet"
            body="Keep anything here — confirmation numbers, ideas, surprises. Notes start private to you."
            actionLabel="Write a note"
            onAction={() => openEditor(null)}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((note) =>
              note.isPrivate ? (
                <Pressable
                  key={note.id}
                  accessibilityRole="button"
                  accessibilityLabel="Edit private note"
                  onPress={() => (note.authorId === userId ? openEditor(note) : undefined)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <KraftEnvelope style={styles.envelope}>
                    <View style={styles.envelopeBody}>
                      <View style={styles.envelopeHeader}>
                        <View style={styles.headerLeft}>
                          <Lock size={14} color={colors.ink} strokeWidth={2.4} />
                          <AppText role="kicker" style={{ color: colors.ink, letterSpacing: 0.6 }}>
                            ONLY YOU
                          </AppText>
                        </View>
                        <AppText role="kicker" style={{ color: colors.kraftInk, letterSpacing: 0.6 }}>
                          {relativeLabel(note.updatedAt)}
                        </AppText>
                      </View>
                      <AppText role="noteBody" style={[styles.envelopeText, { color: colors.ink }]}>
                        {note.body}
                      </AppText>
                    </View>
                    <View style={styles.sealWrap}>
                      <WaxSeal initial={initialOf(note.authorId)} />
                    </View>
                  </KraftEnvelope>
                </Pressable>
              ) : (
                <Pressable
                  key={note.id}
                  accessibilityRole="button"
                  accessibilityLabel="Edit shared note"
                  onPress={() => (note.authorId === userId ? openEditor(note) : undefined)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <View style={[styles.postcard, { backgroundColor: colors.paper }]}>
                    <View style={styles.postcardHeader}>
                      <View style={styles.headerLeft}>
                        <Users size={15} color={colors.ink} strokeWidth={2.2} />
                        <AppText role="kicker" style={{ letterSpacing: 0.6 }}>
                          {note.authorId === userId
                            ? 'SHARED · FROM YOU'
                            : `SHARED · FROM ${firstNameOf(note.authorId).toUpperCase()}`}
                        </AppText>
                      </View>
                      {country ? <StampStill country={country} /> : null}
                    </View>
                    <AppText role="noteBody" style={styles.postcardText}>
                      {note.body}
                    </AppText>
                    <AppText role="metaSm" tone="muted" style={styles.postcardTime}>
                      {formatNoteTime(note.updatedAt)}
                    </AppText>
                  </View>
                </Pressable>
              ),
            )}
          </View>
        )}
      </ScrollView>

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
  titleBlock: { flex: 1, minWidth: 0 },
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
  intro: { paddingTop: spacing.s7, paddingHorizontal: spacing.gutter, fontSize: 16, lineHeight: 23 },
  filterWrap: { marginTop: spacing.s7, marginHorizontal: spacing.cardGutter },
  // Content-sized segments so "Only you · 1" never truncates (item 11).
  filterControl: { alignSelf: 'flex-start' },
  list: { paddingTop: spacing.s7, paddingHorizontal: spacing.cardGutter, gap: spacing.s4 },
  envelope: {},
  envelopeBody: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14 },
  envelopeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  envelopeText: { marginTop: 26 },
  sealWrap: { position: 'absolute', top: 15, left: '50%', marginLeft: -17 },
  postcard: {
    borderRadius: 4,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 14,
    boxShadow: '0 1px 2px rgba(21,34,59,0.15), 0 10px 20px -12px rgba(21,34,59,0.35)',
  },
  postcardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  postcardText: { marginTop: 4 },
  postcardTime: { marginTop: 6 },
});

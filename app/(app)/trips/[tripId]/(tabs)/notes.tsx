import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PenLine } from 'lucide-react-native';
import { AppText } from '@/components/AppText';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { sampleTrack, useEntrance } from '@/components/motion';
import { pileDeal, rise } from '@/components/motion/keyframes';
import { NoteEditor } from '@/features/notes/NoteEditor';
import { NoteReader } from '@/features/notes/NoteReader';
import { PostcardNote } from '@/features/notes/PostcardNote';
import { SealedNote } from '@/features/notes/SealedNote';
import { daysAgoLabel } from '@/features/notes/labels';
import { useNotes } from '@/features/notes/hooks';
import { matchDestination } from '@/features/trips/destinations';
import { SHELL } from '@/features/trips/shellLayout';
import { tabEntranceBase } from '@/features/trips/shellMotion';
import { useTrip, useTripMembers } from '@/features/trips/hooks';
import { useAuth } from '@/features/auth/AuthContext';
import { hitTargetMin, motion, radius, spacing, useTheme } from '@/theme';
import { formatShortDate } from '@/lib/format/date';
import type { TripNote } from '@/lib/types';

type Filter = 'all' | 'shared' | 'private';

/** Postcards in the pile tilt 1°, then −0.6°, alternating. */
const POSTCARD_TILTS = [1, -0.6];

function TitleRow({ base, onAdd }: { base: number; onAdd: () => void }) {
  const { colors } = useTheme();
  const keys = rise(16);
  const p = useEntrance(motion.duration.rise, base);
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.standard),
    transform: [{ translateY: sampleTrack(keys.translateY, p.value, motion.easing.standard) }],
  }));
  return (
    <Animated.View style={[styles.titleRow, style]}>
      <AppText role="tripTitle">Notes</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Write a new note"
        onPress={onAdd}
        style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.ink }, pressed && styles.pressed]}
      >
        <PenLine size={18} color={colors.paper} strokeWidth={2.2} />
        <AppText role="pillLabel" style={{ color: colors.paper }}>
          Write
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

/** One note dealt onto the pile on the tab's entrance. */
function PileItem({ index, base, entering, children }: { index: number; base: number; entering: boolean; children: ReactNode }) {
  const keys = pileDeal(index);
  const p = useEntrance(
    motion.choreo.notes.pile,
    base + motion.choreo.notes.pileAt + index * motion.stagger.pile,
    entering,
  );
  const style = useAnimatedStyle(() => ({
    opacity: sampleTrack(keys.opacity, p.value, motion.easing.settle),
    transform: [
      { translateY: sampleTrack(keys.translateY, p.value, motion.easing.settle) },
      { rotate: `${sampleTrack(keys.rotate, p.value, motion.easing.settle)}deg` },
    ],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function NotesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { userId } = useAuth();
  const trip = useTrip(tripId);
  const notes = useNotes(tripId);
  const members = useTripMembers(tripId);
  const [base] = useState(tabEntranceBase);
  // Each note is dealt the first time it lands on the pile; a note coming
  // back after a filter change sits still.
  const dealt = useRef(new Set<string>());

  const [filter, setFilter] = useState<Filter>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<TripNote | null>(null);
  const [readingNoteId, setReadingNoteId] = useState<string | null>(null);
  const [editAfterReading, setEditAfterReading] = useState<TripNote | null>(null);

  const openEditor = (note: TripNote | null) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const all = useMemo(() => notes.data ?? [], [notes.data]);
  const readingNote = all.find((note) => note.id === readingNoteId && !note.isPrivate) ?? null;
  const shared = all.filter((n) => !n.isPrivate);
  const mine = all.filter((n) => n.isPrivate);

  const visible = useMemo(() => {
    const byNewest = (a: TripNote, b: TripNote) => b.updatedAt.localeCompare(a.updatedAt);
    const list = filter === 'shared' ? shared : filter === 'private' ? mine : all;
    // Private notes first, then shared, newest first within each.
    return [...list.filter((n) => n.isPrivate).sort(byNewest), ...list.filter((n) => !n.isPrivate).sort(byNewest)];
  }, [filter, all, shared, mine]);

  useEffect(() => {
    visible.forEach((n) => dealt.current.add(n.id));
  }, [visible]);

  const country = matchDestination(trip.data?.destination ?? null);

  const firstNameOf = (authorId: string): string => {
    const member = members.data?.find((m) => m.userId === authorId);
    return member?.profile.displayName.split(' ')[0] ?? 'A member';
  };
  const initialOf = (authorId: string): string => (firstNameOf(authorId)[0] ?? '?').toUpperCase();
  const authorNameOf = (authorId: string): string =>
    members.data?.find((member) => member.userId === authorId)?.profile.displayName ?? 'A member';

  if (notes.isPending) return <LoadingState />;
  if (notes.isError) {
    return <ErrorState title="Couldn't load the notes" onRetry={() => notes.refetch()} />;
  }

  const options = [
    { value: 'all' as const, label: `All · ${all.length}` },
    { value: 'shared' as const, label: `Shared · ${shared.length}` },
    { value: 'private' as const, label: `Only you · ${mine.length}` },
  ];

  const now = new Date();
  let postcardIndex = 0;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TitleRow base={base} onAdd={() => openEditor(null)} />

        {all.length > 0 ? (
          <View style={styles.filterWrap}>
            <SegmentedControl
              options={options}
              value={filter}
              onChange={setFilter}
              accessibilityLabel="Filter notes"
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
          <View style={styles.pile}>
            {/* The ref is a non-reactive entrance snapshot, recorded after this render. */}
            {/* eslint-disable-next-line react-hooks/refs */}
            {visible.map((note, index) => {
              const deal = !dealt.current.has(note.id);
              const date = formatShortDate(note.updatedAt, now).toUpperCase();
              const mineToEdit = note.authorId === userId ? () => openEditor(note) : undefined;
              return (
                <PileItem key={note.id} index={index} base={base} entering={deal}>
                  {note.isPrivate ? (
                    <SealedNote
                      body={note.body}
                      dateLabel={date}
                      initial={initialOf(note.authorId)}
                      onEdit={mineToEdit}
                    />
                  ) : (
                    <PostcardNote
                      body={note.body}
                      kicker={`SHARED · ${daysAgoLabel(note.updatedAt, now, date)}`}
                      from={note.authorId === userId ? 'You' : firstNameOf(note.authorId)}
                      dateLabel={date}
                      country={country}
                      tripName={trip.data?.name ?? ''}
                      tilt={POSTCARD_TILTS[postcardIndex++ % POSTCARD_TILTS.length]}
                      onRead={() => setReadingNoteId(note.id)}
                      onEdit={mineToEdit}
                    />
                  )}
                </PileItem>
              );
            })}
          </View>
        )}
      </ScrollView>

      <NoteReader
        note={readingNote}
        author={readingNote ? authorNameOf(readingNote.authorId) : ''}
        dateLabel={readingNote ? formatShortDate(readingNote.updatedAt, now) : ''}
        onClose={() => setReadingNoteId(null)}
        onClosed={() => {
          // The editor opens once the reader's modal is gone (iOS can't stack them).
          if (editAfterReading) openEditor(editAfterReading);
          setEditAfterReading(null);
        }}
        onEdit={readingNote?.authorId === userId && readingNote ? () => {
          setEditAfterReading(readingNote);
          setReadingNoteId(null);
        } : undefined}
      />
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
    minHeight: hitTargetMin,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.codeBox,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  // Card gutter to card gutter: the track lines up with the notes below.
  filterWrap: { marginTop: spacing.s5, marginHorizontal: spacing.cardGutter },
  pile: { paddingTop: spacing.s9, paddingHorizontal: spacing.s7, gap: spacing.s6 },
});

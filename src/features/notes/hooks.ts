import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { NOTE_SELECT } from '@/lib/supabase/selects';
import { mutationKeys } from '@/lib/query/keys';
import {
  assertCurrentOwner,
  isCurrentOwner,
  isDuplicateKey,
  queuedWriteDefaults,
  useQueuedMutation,
  type QueuedVars,
} from '@/lib/query/queued';
import type { TripNote } from '@/lib/types';

const keys = {
  list: (tripId: string) => ['notes', tripId] as const,
};

/**
 * RLS returns exactly the visible set: shared notes plus the caller's own
 * private notes (NOTE-2/3). No client-side visibility filtering.
 */
export function useNotes(tripId: string) {
  return useQuery({
    queryKey: keys.list(tripId),
    queryFn: async (): Promise<TripNote[]> => {
      const { data, error } = await supabase
        .from('trip_notes')
        .select(NOTE_SELECT)
        .eq('trip_id', tripId);
      if (error) throw error;
      return data;
    },
  });
}

export interface NoteInput {
  body: string;
  isPrivate: boolean;
}

export interface SaveNoteVars extends QueuedVars {
  tripId: string;
  /** null = a new note. */
  noteId: string | null;
  input: NoteInput;
}

export interface DeleteNoteVars extends QueuedVars {
  tripId: string;
  noteId: string;
}

/**
 * The note writes, registered once at startup so a queued one can be sent
 * after a restart. A queued private note is never stored on the device
 * (lib/query/persist.ts), so it is only sent if the app stays open.
 */
export function registerNoteMutations(queryClient: QueryClient): void {
  const refetch = (ownerId: string, tripId: string) => {
    if (isCurrentOwner(ownerId)) void queryClient.invalidateQueries({ queryKey: keys.list(tripId), refetchType: 'all' });
  };

  queryClient.setMutationDefaults<void, Error, SaveNoteVars>(mutationKeys.saveNote, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, clientId, tripId, noteId, input }: SaveNoteVars) => {
      assertCurrentOwner(ownerId);
      if (noteId) {
        // An update that matched nothing (the note was deleted meanwhile) is a failure too.
        const { data, error } = await supabase
          .from('trip_notes')
          .update({ body: input.body, is_private: input.isPrivate })
          .eq('id', noteId)
          .select('id');
        if (error) throw error;
        if (data.length === 0) throw new Error('This note no longer exists.');
        return;
      }
      // The insert policy requires author_id = auth.uid().
      const { error } = await supabase.from('trip_notes').insert({
        id: clientId,
        trip_id: tripId,
        author_id: ownerId,
        body: input.body,
        is_private: input.isPrivate,
      });
      // A duplicate id: sent before (a retry, or a replay after a restart).
      if (error && !isDuplicateKey(error)) throw error;
    },
    onSuccess: (_data, { ownerId, tripId }) => refetch(ownerId, tripId),
  });

  queryClient.setMutationDefaults<void, Error, DeleteNoteVars>(mutationKeys.deleteNote, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, noteId }: DeleteNoteVars) => {
      assertCurrentOwner(ownerId);
      const { error } = await supabase.from('trip_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: (_data, { ownerId, tripId }) => refetch(ownerId, tripId),
  });
}

export function useSaveNote(tripId: string) {
  return useQueuedMutation<void, SaveNoteVars>(mutationKeys.saveNote, tripId);
}

export function useDeleteNote(tripId: string) {
  return useQueuedMutation<void, DeleteNoteVars>(mutationKeys.deleteNote, tripId);
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { NOTE_SELECT } from '@/lib/supabase/selects';
import { useAuth } from '@/features/auth/AuthContext';
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

export function useSaveNote(tripId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, input }: { noteId: string | null; input: NoteInput }) => {
      if (noteId) {
        const { error } = await supabase
          .from('trip_notes')
          .update({ body: input.body, is_private: input.isPrivate })
          .eq('id', noteId);
        if (error) throw error;
        return;
      }
      if (!userId) throw new Error('Not signed in');
      // The insert policy requires author_id = auth.uid().
      const { error } = await supabase.from('trip_notes').insert({
        trip_id: tripId,
        author_id: userId,
        body: input.body,
        is_private: input.isPrivate,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

export function useDeleteNote(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('trip_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

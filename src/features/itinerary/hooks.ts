import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { ITINERARY_SELECT } from '@/lib/supabase/selects';
import { useAuth } from '@/features/auth/AuthContext';
import type { ItineraryItem } from '@/lib/types';

const keys = {
  list: (tripId: string) => ['itinerary', tripId] as const,
};

export function useItinerary(tripId: string) {
  return useQuery({
    queryKey: keys.list(tripId),
    queryFn: async (): Promise<ItineraryItem[]> => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select(ITINERARY_SELECT)
        .eq('trip_id', tripId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ItineraryItem[];
    },
  });
}

export interface ItineraryItemInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status: ItineraryItem['status'];
}

function toRow(input: ItineraryItemInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    start_at: input.startAt ?? null,
    end_at: input.endAt ?? null,
    status: input.status,
  };
}

export function useSaveItineraryItem(tripId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      input,
    }: {
      itemId: string | null;
      input: ItineraryItemInput;
    }): Promise<ItineraryItem> => {
      if (itemId) {
        const { data, error } = await supabase
          .from('itinerary_items')
          .update(toRow(input))
          .eq('id', itemId)
          .select(ITINERARY_SELECT)
          .single();
        if (error) throw error;
        return data as ItineraryItem;
      }
      const existing = queryClient.getQueryData<ItineraryItem[]>(keys.list(tripId));
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          ...toRow(input),
          sort_order: existing?.length ?? 0,
          created_by: userId,
        })
        .select(ITINERARY_SELECT)
        .single();
      if (error) throw error;
      return data as ItineraryItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

export function useDeleteItineraryItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

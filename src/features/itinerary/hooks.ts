import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { ITINERARY_SELECT } from '@/lib/supabase/selects';
import { mutationKeys } from '@/lib/query/keys';
import {
  assertCurrentOwner,
  isCurrentOwner,
  isDuplicateKey,
  queuedWriteDefaults,
  useQueuedMutation,
  type QueuedVars,
} from '@/lib/query/queued';
import { clearStopReminder, followStopReminder } from '@/features/reminders/hooks';
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

export interface SaveItineraryItemVars extends QueuedVars {
  tripId: string;
  /** null = a new stop. */
  itemId: string | null;
  input: ItineraryItemInput;
}

export interface DeleteItineraryItemVars extends QueuedVars {
  tripId: string;
  itemId: string;
}

export interface SetItineraryStatusVars extends QueuedVars {
  tripId: string;
  itemId: string;
  status: ItineraryItem['status'];
}

/** What a failed status change puts back: that stop's status, nothing else. */
type StatusContext = { previous: ItineraryItem['status'] | null };

/**
 * The stop writes, registered once at startup: they may wait offline and are
 * sent after a restart, when the screen that started them is long gone, so
 * everything they do (optimistic status, rollback, refetch, keeping the
 * stop's reminder in step) lives here rather than in the hooks. Nothing runs
 * for a write whose account is no longer signed in (lib/query/queued.ts).
 */
export function registerItineraryMutations(queryClient: QueryClient): void {
  const refetch = (tripId: string) =>
    void queryClient.invalidateQueries({ queryKey: keys.list(tripId), refetchType: 'all' });

  queryClient.setMutationDefaults<ItineraryItem, Error, SaveItineraryItemVars>(mutationKeys.saveStop, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, clientId, tripId, itemId, input }: SaveItineraryItemVars): Promise<ItineraryItem> => {
      assertCurrentOwner(ownerId);
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
          id: clientId,
          trip_id: tripId,
          ...toRow(input),
          sort_order: existing?.length ?? 0,
          created_by: ownerId,
        })
        .select(ITINERARY_SELECT)
        .single();
      if (!error) return data as ItineraryItem;
      if (!isDuplicateKey(error)) throw error;
      // Sent before (a retry, or a replay after a restart): it's already there.
      const { data: landed, error: readError } = await supabase
        .from('itinerary_items')
        .select(ITINERARY_SELECT)
        .eq('id', clientId)
        .single();
      if (readError) throw error;
      return landed as ItineraryItem;
    },
    onSuccess: (saved, { ownerId, tripId }) => {
      if (!isCurrentOwner(ownerId)) return;
      refetch(tripId);
      void followStopReminder({ id: saved.id, title: saved.title, tripId, startAt: saved.startAt });
    },
  });

  queryClient.setMutationDefaults<void, Error, DeleteItineraryItemVars>(mutationKeys.deleteStop, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, itemId }: DeleteItineraryItemVars) => {
      assertCurrentOwner(ownerId);
      const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: (_data, { ownerId, tripId, itemId }) => {
      if (!isCurrentOwner(ownerId)) return;
      refetch(tripId);
      void clearStopReminder(itemId).catch(() => {});
    },
  });

  queryClient.setMutationDefaults<void, Error, SetItineraryStatusVars, StatusContext>(mutationKeys.setStopStatus, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, itemId, status }: SetItineraryStatusVars) => {
      assertCurrentOwner(ownerId);
      const { error } = await supabase.from('itinerary_items').update({ status }).eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async ({ tripId, itemId, status }): Promise<StatusContext> => {
      await queryClient.cancelQueries({ queryKey: keys.list(tripId) });
      const previous =
        queryClient.getQueryData<ItineraryItem[]>(keys.list(tripId))?.find((item) => item.id === itemId)?.status ?? null;
      queryClient.setQueryData<ItineraryItem[]>(keys.list(tripId), (items) =>
        items?.map((item) => (item.id === itemId ? { ...item, status } : item)),
      );
      return { previous };
    },
    onError: (_error, { ownerId, tripId, itemId }, context) => {
      const previous = context?.previous;
      if (!previous || !isCurrentOwner(ownerId)) return;
      queryClient.setQueryData<ItineraryItem[]>(keys.list(tripId), (items) =>
        items?.map((item) => (item.id === itemId ? { ...item, status: previous } : item)),
      );
    },
    onSettled: (_data, _error, vars) => {
      if (vars && isCurrentOwner(vars.ownerId)) refetch(vars.tripId);
    },
  });
}

export function useSaveItineraryItem(tripId: string) {
  return useQueuedMutation<ItineraryItem, SaveItineraryItemVars>(mutationKeys.saveStop, tripId);
}

export function useDeleteItineraryItem(tripId: string) {
  return useQueuedMutation<void, DeleteItineraryItemVars>(mutationKeys.deleteStop, tripId);
}

/** Optimistic status change from the Plan stop stamp (planned → confirmed → done). */
export function useSetItineraryStatus(tripId: string) {
  return useQueuedMutation<void, SetItineraryStatusVars, StatusContext>(mutationKeys.setStopStatus, tripId);
}

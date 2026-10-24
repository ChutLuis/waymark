import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { PACKING_SELECT } from '@/lib/supabase/selects';
import { mutationKeys } from '@/lib/query/keys';
import {
  assertCurrentOwner,
  isCurrentOwner,
  isDuplicateKey,
  queuedWriteDefaults,
  useQueuedMutation,
  type QueuedVars,
} from '@/lib/query/queued';
import type { PackingItem } from '@/lib/types';

const keys = {
  list: (tripId: string) => ['packing', tripId] as const,
};

export function usePackingList(tripId: string) {
  return useQuery({
    queryKey: keys.list(tripId),
    queryFn: async (): Promise<PackingItem[]> => {
      const { data, error } = await supabase
        .from('packing_items')
        .select(PACKING_SELECT)
        .eq('trip_id', tripId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export interface PackingItemInput {
  label: string;
  quantity: number;
  assignedTo?: string | null;
}

export interface SavePackingItemVars extends QueuedVars {
  tripId: string;
  /** null = a new item. */
  itemId: string | null;
  input: PackingItemInput;
}

export interface SetPackedVars extends QueuedVars {
  tripId: string;
  itemId: string;
  isPacked: boolean;
}

export interface DeletePackingItemVars extends QueuedVars {
  tripId: string;
  itemId: string;
}

/** What a failed change puts back: that item's fields, nothing else in the list. */
type ItemContext = { itemId: string | null; previous: Partial<PackingItem> | null };

/**
 * The packing writes, registered once at startup so a queued one can be sent
 * after a restart; their optimistic updates and rollbacks live here too.
 * Nothing touches the cache for a write whose account is no longer signed in.
 */
export function registerPackingMutations(queryClient: QueryClient): void {
  const patch = async (
    tripId: string,
    itemId: string,
    change: Partial<PackingItem>,
  ): Promise<ItemContext> => {
    await queryClient.cancelQueries({ queryKey: keys.list(tripId) });
    const item = queryClient.getQueryData<PackingItem[]>(keys.list(tripId))?.find((i) => i.id === itemId);
    const previous = item
      ? (Object.fromEntries(Object.keys(change).map((k) => [k, item[k as keyof PackingItem]])) as Partial<PackingItem>)
      : null;
    queryClient.setQueryData<PackingItem[]>(keys.list(tripId), (items) =>
      items?.map((i) => (i.id === itemId ? { ...i, ...change } : i)),
    );
    return { itemId, previous };
  };
  const rollback = (ownerId: string, tripId: string, context: ItemContext | undefined) => {
    const { itemId, previous } = context ?? {};
    if (!itemId || !previous || !isCurrentOwner(ownerId)) return;
    queryClient.setQueryData<PackingItem[]>(keys.list(tripId), (items) =>
      items?.map((i) => (i.id === itemId ? { ...i, ...previous } : i)),
    );
  };
  const refetch = (vars: { ownerId: string; tripId: string } | undefined) => {
    if (vars && isCurrentOwner(vars.ownerId)) {
      void queryClient.invalidateQueries({ queryKey: keys.list(vars.tripId), refetchType: 'all' });
    }
  };

  queryClient.setMutationDefaults<PackingItem, Error, SavePackingItemVars, ItemContext>(mutationKeys.savePackingItem, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, clientId, tripId, itemId, input }: SavePackingItemVars): Promise<PackingItem> => {
      assertCurrentOwner(ownerId);
      const row = {
        label: input.label,
        quantity: input.quantity,
        assigned_to: input.assignedTo ?? null,
      };
      if (itemId) {
        const { data, error } = await supabase
          .from('packing_items')
          .update(row)
          .eq('id', itemId)
          .select(PACKING_SELECT)
          .single();
        if (error) throw error;
        return data;
      }
      const existing = queryClient.getQueryData<PackingItem[]>(keys.list(tripId));
      const { data, error } = await supabase
        .from('packing_items')
        .insert({
          id: clientId,
          trip_id: tripId,
          ...row,
          sort_order: existing?.length ?? 0,
          created_by: ownerId,
        })
        .select(PACKING_SELECT)
        .single();
      if (!error) return data;
      if (!isDuplicateKey(error)) throw error;
      // Sent before (a retry, or a replay after a restart): it's already there.
      const { data: landed, error: readError } = await supabase
        .from('packing_items')
        .select(PACKING_SELECT)
        .eq('id', clientId)
        .single();
      if (readError) throw error;
      return landed;
    },
    // An edit (a tag dropped into a bag, a rename) shows at once and rolls back
    // if the write fails; a new item waits for its row.
    onMutate: ({ tripId, itemId, input }): Promise<ItemContext> | ItemContext =>
      itemId
        ? patch(tripId, itemId, { label: input.label, quantity: input.quantity, assignedTo: input.assignedTo ?? null })
        : { itemId: null, previous: null },
    onError: (_error, { ownerId, tripId }, context) => rollback(ownerId, tripId, context),
    onSettled: (_data, _error, vars) => refetch(vars),
  });

  // Optimistic toggle so the checkbox answers immediately.
  queryClient.setMutationDefaults<void, Error, SetPackedVars, ItemContext>(mutationKeys.setPacked, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, itemId, isPacked }: SetPackedVars) => {
      assertCurrentOwner(ownerId);
      const { error } = await supabase.from('packing_items').update({ is_packed: isPacked }).eq('id', itemId);
      if (error) throw error;
    },
    onMutate: ({ tripId, itemId, isPacked }) => patch(tripId, itemId, { isPacked }),
    onError: (_error, { ownerId, tripId }, context) => rollback(ownerId, tripId, context),
    onSettled: (_data, _error, vars) => refetch(vars),
  });

  queryClient.setMutationDefaults<void, Error, DeletePackingItemVars>(mutationKeys.deletePackingItem, {
    ...queuedWriteDefaults,
    mutationFn: async ({ ownerId, itemId }: DeletePackingItemVars) => {
      assertCurrentOwner(ownerId);
      const { error } = await supabase.from('packing_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => refetch(vars),
  });
}

export function useSavePackingItem(tripId: string) {
  return useQueuedMutation<PackingItem, SavePackingItemVars, ItemContext>(mutationKeys.savePackingItem, tripId);
}

export function useSetPacked(tripId: string) {
  return useQueuedMutation<void, SetPackedVars, ItemContext>(mutationKeys.setPacked, tripId);
}

export function useDeletePackingItem(tripId: string) {
  return useQueuedMutation<void, DeletePackingItemVars>(mutationKeys.deletePackingItem, tripId);
}

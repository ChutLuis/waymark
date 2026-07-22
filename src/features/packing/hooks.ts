import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { PACKING_SELECT } from '@/lib/supabase/selects';
import { useAuth } from '@/features/auth/AuthContext';
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

export function useSavePackingItem(tripId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      input,
    }: {
      itemId: string | null;
      input: PackingItemInput;
    }): Promise<PackingItem> => {
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
          trip_id: tripId,
          ...row,
          sort_order: existing?.length ?? 0,
          created_by: userId,
        })
        .select(PACKING_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

/** Optimistic toggle so the checkbox answers immediately. */
export function useSetPacked(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, isPacked }: { itemId: string; isPacked: boolean }) => {
      const { error } = await supabase
        .from('packing_items')
        .update({ is_packed: isPacked })
        .eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async ({ itemId, isPacked }) => {
      await queryClient.cancelQueries({ queryKey: keys.list(tripId) });
      const previous = queryClient.getQueryData<PackingItem[]>(keys.list(tripId));
      queryClient.setQueryData<PackingItem[]>(keys.list(tripId), (items) =>
        items?.map((item) => (item.id === itemId ? { ...item, isPacked } : item)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(keys.list(tripId), context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

export function useDeletePackingItem(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('packing_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.list(tripId) }),
  });
}

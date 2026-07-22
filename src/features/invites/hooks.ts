import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { INVITE_SELECT } from '@/lib/supabase/selects';
import { useAuth } from '@/features/auth/AuthContext';
import type { TripInvite } from '@/lib/types';

/** No lookalike characters (0/O, 1/I/L). */
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

/**
 * The current unexpired, unused invite this user can see, created lazily.
 * (RLS shows members the invites they created; owners see all.)
 */
export function useTripInvite(tripId: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['invite', tripId, userId],
    queryFn: async (): Promise<TripInvite> => {
      if (!userId) throw new Error('Not signed in');
      const nowIso = new Date().toISOString();
      // Reuse only an invite THIS user created: RLS returns a member only their
      // own invites (owners see all), so a trip-wide lookup would miss it and
      // mint a fresh row every time. Match RLS by filtering on created_by (B5).
      const { data: active, error: selectError } = await supabase
        .from('trip_invites')
        .select(INVITE_SELECT)
        .eq('trip_id', tripId)
        .eq('created_by', userId)
        .is('accepted_at', null)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selectError) throw selectError;
      if (active) return active;

      const { data, error } = await supabase
        .from('trip_invites')
        .insert({
          trip_id: tripId,
          code: generateInviteCode(),
          created_by: userId,
          expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        })
        .select(INVITE_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Acceptance is a security-definer RPC that validates and joins in one
 * step (INV-2/INV-4); returns the joined trip's id.
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('accept_trip_invite', {
        _code: code.trim().toUpperCase(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

/** "VK4T9QMD" -> "VK4T·9QMD" for display only; the code itself has no dot. */
export function formatInviteCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}·${code.slice(4)}`;
}

export function inviteLink(code: string): string {
  return `https://waymark.app/join?code=${code}`;
}

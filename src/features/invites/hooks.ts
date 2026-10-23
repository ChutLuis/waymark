import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';
import { INVITE_SELECT } from '@/lib/supabase/selects';
import { useAuth } from '@/features/auth/AuthContext';
import type { TripInvite } from '@/lib/types';

/**
 * The caller's current invite for the trip. The security-definer
 * `get_or_create_trip_invite` RPC reuses their newest invite while it has a
 * day left, otherwise mints a 7-day code with cryptographic randomness on
 * the server; clients can no longer insert invites themselves.
 */
export function useTripInvite(tripId: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['invite', tripId, userId],
    enabled: userId !== null,
    queryFn: async (): Promise<TripInvite> => {
      const { data, error } = await supabase
        .rpc('get_or_create_trip_invite', { _trip_id: tripId })
        .select(INVITE_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as TripInvite;
    },
  });
}

/**
 * Acceptance is a security-definer RPC that validates and joins in one
 * step (INV-2/INV-4); returns the joined trip's id. An unknown or revoked
 * code comes back as null (so the server can count the failed guess) and is
 * reported like any other invalid code.
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('accept_trip_invite', {
        _code: code.trim().toUpperCase(),
      });
      if (error) throw error;
      if (!data) throw new Error('invalid invite');
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

/** The join deep link in this build's own scheme (waymark, waymark-test, waymark-dev). */
export function inviteLink(code: string): string {
  return Linking.createURL('join', { queryParams: { code } });
}

export function inviteShareMessage(tripName: string, code: string): string {
  const formatted = code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
  const trimmed = tripName.trim();
  return trimmed
    ? `Join my "${trimmed}" trip on Waymark! Enter invite code: ${formatted}`
    : `Join my trip on Waymark! Enter invite code: ${formatted}`;
}

export interface InvitePreview {
  tripId: string;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  inviterName: string;
  /** The caller is already on this trip, so there is nothing to join. */
  isMember: boolean;
}

/**
 * Read-only preview of the trip behind a valid invite code, for the Join
 * screen, via the security-definer `preview_trip_invite` RPC. Returns exactly
 * the fields the preview needs, plus whether the caller is already a member;
 * RLS on the tables is untouched.
 */
export function usePreviewTripInvite(code: string | null) {
  const normalised = code && /^[A-Z0-9]{8}$/.test(code.toUpperCase()) ? code.toUpperCase() : null;
  return useQuery({
    queryKey: ['invite-preview', normalised],
    enabled: normalised !== null,
    retry: false,
    queryFn: async (): Promise<InvitePreview> => {
      const { data, error } = await supabase.rpc('preview_trip_invite', { _code: normalised as string });
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('invalid invite');
      return {
        tripId: row.trip_id,
        name: row.name,
        destination: row.destination,
        startDate: row.start_date,
        endDate: row.end_date,
        inviterName: row.inviter_name,
        isMember: row.is_member,
      };
    },
  });
}

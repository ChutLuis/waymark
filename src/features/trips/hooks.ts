import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  PROFILE_SELECT,
  TRIP_MEMBER_REF_SELECT,
  TRIP_MEMBER_SELECT,
  TRIP_SELECT,
  tripRowToTrip,
} from '@/lib/supabase/selects';
import { uploadImage } from '@/lib/supabase/storage';
import { useAuth } from '@/features/auth/AuthContext';
import type { PickedImage } from '@/lib/images';
import type { Profile, Trip, TripMember } from '@/lib/types';

export const tripKeys = {
  list: () => ['trips'] as const,
  trip: (tripId: string) => ['trip', tripId] as const,
  members: (tripId: string) => ['trip', tripId, 'members'] as const,
};

async function fetchProfilesById(userIds: string[]): Promise<Map<string, Profile>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .in('id', userIds);
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p]));
}

/** Fallback for a member whose profile row is missing (never onboarded). */
function placeholderProfile(userId: string): Profile {
  return { id: userId, displayName: 'Member', avatarPath: null };
}

export interface TripListItem extends Trip {
  memberProfiles: Profile[];
}

/** All trips the user belongs to (RLS scopes the select — TRIP-3). */
export function useTrips() {
  return useQuery({
    queryKey: tripKeys.list(),
    queryFn: async (): Promise<TripListItem[]> => {
      const { data: trips, error } = await supabase
        .from('trips')
        .select(TRIP_SELECT)
        .order('start_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      if (trips.length === 0) return [];

      const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select(TRIP_MEMBER_REF_SELECT)
        .in('trip_id', trips.map((t) => t.id))
        .order('joined_at', { ascending: true });
      if (membersError) throw membersError;

      const profiles = await fetchProfilesById([...new Set(members.map((m) => m.userId))]);
      return trips.map((trip) => ({
        ...tripRowToTrip(trip),
        memberProfiles: members
          .filter((m) => m.tripId === trip.id)
          .map((m) => profiles.get(m.userId) ?? placeholderProfile(m.userId)),
      }));
    },
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.trip(tripId),
    queryFn: async (): Promise<Trip> => {
      const { data, error } = await supabase
        .from('trips')
        .select(TRIP_SELECT)
        .eq('id', tripId)
        .single();
      if (error) throw error;
      return tripRowToTrip(data);
    },
  });
}

export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: tripKeys.members(tripId),
    queryFn: async (): Promise<TripMember[]> => {
      const { data: members, error } = await supabase
        .from('trip_members')
        .select(TRIP_MEMBER_SELECT)
        .eq('trip_id', tripId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      const profiles = await fetchProfilesById(members.map((m) => m.userId));
      return members.map((m) => ({
        ...m,
        role: m.role as TripMember['role'],
        profile: profiles.get(m.userId) ?? placeholderProfile(m.userId),
      }));
    },
  });
}

export interface CreateTripInput {
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
}

/** Trip + owner membership are created atomically by the RPC — never insert directly. */
export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTripInput): Promise<Trip> => {
      const { data, error } = await supabase.rpc('create_trip', {
        _name: input.name,
        ...(input.destination ? { _destination: input.destination } : {}),
        ...(input.startDate ? { _start: input.startDate } : {}),
        ...(input.endDate ? { _end: input.endDate } : {}),
      });
      if (error) throw error;
      return tripRowToTrip(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.list() }),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      // RLS restricts the delete to the owner; cascades clean up the rest.
      const { error } = await supabase.from('trips').delete().eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
    },
  });
}

/**
 * Uploads to trip-covers/{trip_id}/… (the path shape storage RLS checks)
 * and records it on the trip; the trips_update policy limits this to the
 * owner.
 */
export function useSetTripCover(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (image: PickedImage) => {
      const path = `${tripId}/cover-${Date.now()}.${image.extension}`;
      await uploadImage('trip-covers', path, image.uri, image.contentType);
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_path: path })
        .eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.trip(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.list() });
    },
  });
}

export function useLeaveTrip() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.list() }),
  });
}

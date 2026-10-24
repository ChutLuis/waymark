import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  PROFILE_SELECT,
  TRIP_MEMBER_REF_SELECT,
  TRIP_MEMBER_SELECT,
  TRIP_SELECT,
  tripRowToTrip,
} from '@/lib/supabase/selects';
import { uploadImage } from '@/lib/supabase/storage';
import { mutationKeys } from '@/lib/query/keys';
import {
  assertCurrentOwner,
  isCurrentOwner,
  queuedWriteDefaults,
  useQueuedMutation,
  type QueuedVars,
} from '@/lib/query/queued';
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: tripKeys.trip(tripId),
    // Opened from Home, the trip is already in the list: start from that row
    // so the shell has its header on the first frame of the expand, and
    // refetch on the list's schedule.
    initialData: () => {
      const listed = queryClient.getQueryData<TripListItem[]>(tripKeys.list())?.find((t) => t.id === tripId);
      if (!listed) return undefined;
      const { memberProfiles: _members, ...trip } = listed;
      return trip;
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(tripKeys.list())?.dataUpdatedAt,
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
  /** Optional cover image, uploaded right after the trip is created. */
  coverImage?: PickedImage | null;
}

/** Trip + owner membership are created atomically by the RPC — never insert directly. */
async function createTrip(input: CreateTripInput): Promise<Trip> {
  const { data, error } = await supabase.rpc('create_trip', {
    _name: input.name,
    ...(input.destination ? { _destination: input.destination } : {}),
    ...(input.startDate ? { _start: input.startDate } : {}),
    ...(input.endDate ? { _end: input.endDate } : {}),
  });
  if (error) throw error;
  const trip = tripRowToTrip(data);
  if (input.coverImage) {
    // The trip already exists; a cover upload failure must not fail the
    // whole mutation (or a retry would create a second trip). Best effort.
    try {
      const path = `${trip.id}/cover-${Date.now()}.${input.coverImage.extension}`;
      await uploadImage('trip-covers', path, input.coverImage.uri, input.coverImage.contentType);
      const { error: coverError } = await supabase
        .from('trips')
        .update({ cover_image_path: path })
        .eq('id', trip.id);
      if (!coverError) return { ...trip, coverImagePath: path };
    } catch {
      // Cover is optional; the trip is still created.
    }
  }
  return trip;
}

export interface CreateTripVars extends CreateTripInput, QueuedVars {}

export interface UpdateTripVars extends QueuedVars {
  tripId: string;
  /** Only the fields the person changed: a later queued edit must not put back older values. */
  name?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

async function updateTrip({ ownerId, tripId, name, destination, startDate, endDate }: UpdateTripVars): Promise<Trip> {
  assertCurrentOwner(ownerId);
  const row: {
    name?: string;
    destination?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } = {};
  if (name !== undefined) row.name = name;
  if (destination !== undefined) row.destination = destination;
  if (startDate !== undefined) row.start_date = startDate;
  if (endDate !== undefined) row.end_date = endDate;
  const { data, error } = await supabase
    .from('trips')
    .update(row)
    .eq('id', tripId)
    .select(TRIP_SELECT)
    .single();
  if (error) throw error;
  return tripRowToTrip(data);
}

/**
 * Creating and editing a trip may wait for the connection and be sent after
 * a restart (registered once at startup). A create is never retried: the
 * create_trip RPC can't take an id from the device, so a retry after a lost
 * response could make a second trip. An edit sends only the changed fields,
 * and the last edit sent wins.
 */
export function registerTripMutations(queryClient: QueryClient): void {
  queryClient.setMutationDefaults<Trip, Error, CreateTripVars>(mutationKeys.createTrip, {
    retry: false,
    mutationFn: ({ ownerId, clientId: _clientId, ...input }: CreateTripVars) => {
      assertCurrentOwner(ownerId);
      return createTrip(input);
    },
    onSuccess: (_trip, { ownerId }) => {
      if (isCurrentOwner(ownerId)) void queryClient.invalidateQueries({ queryKey: tripKeys.list(), refetchType: 'all' });
    },
  });
  queryClient.setMutationDefaults<Trip, Error, UpdateTripVars>(mutationKeys.updateTrip, {
    ...queuedWriteDefaults,
    mutationFn: updateTrip,
    onSuccess: (_trip, { ownerId, tripId }) => {
      if (!isCurrentOwner(ownerId)) return;
      void queryClient.invalidateQueries({ queryKey: tripKeys.trip(tripId), refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: tripKeys.list(), refetchType: 'all' });
    },
  });
}

export function useCreateTrip() {
  return useQueuedMutation<Trip, CreateTripVars>(mutationKeys.createTrip, null);
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      // Remove the cover folder first: the row delete cascades, but the stored
      // objects live on. list() + remove() are RLS-limited to the owner's trips.
      const { data: objects } = await supabase.storage.from('trip-covers').list(tripId);
      if (objects && objects.length > 0) {
        await supabase.storage.from('trip-covers').remove(objects.map((o) => `${tripId}/${o.name}`));
      }
      // RLS restricts the delete to the owner; cascades clean up the rest. A
      // delete RLS filters out deletes nothing without an error, so check.
      const { data, error } = await supabase.from('trips').delete().eq('id', tripId).select('id');
      if (error) throw error;
      if (data.length === 0) throw new Error("Only the trip's owner can delete it.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['trip'] });
    },
  });
}

/** Update trip details (name, destination, dates); RLS limits this to the owner. */
export function useUpdateTrip(tripId: string) {
  return useQueuedMutation<Trip, UpdateTripVars>(mutationKeys.updateTrip, tripId);
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
      // The database refuses an owner leaving their own trip with a readable
      // message; a delete that matched nothing is reported too.
      const { data, error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .select('id');
      if (error) throw error;
      if (data.length === 0) throw new Error("You're no longer on this trip.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripKeys.list() }),
  });
}

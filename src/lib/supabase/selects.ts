/**
 * PostgREST select strings that alias snake_case columns to the camelCase
 * domain types in src/lib/types.ts. RLS already limits which rows come
 * back — never re-filter visibility on the client.
 */
import type { Trip } from '@/lib/types';

export const PROFILE_SELECT = 'id, displayName:display_name, avatarPath:avatar_path';

/**
 * Trips are selected raw (snake_case) and mapped through tripRowToTrip so the
 * same mapping serves both PostgREST reads and the create_trip RPC result,
 * which returns snake_case columns that can't be aliased in a select string.
 */
export const TRIP_SELECT =
  'id, name, destination, start_date, end_date, cover_image_path, created_by';

interface TripRow {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_path: string | null;
  created_by: string;
}

/** Single source of truth for the trips snake_case → camelCase Trip mapping. */
export function tripRowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    coverImagePath: row.cover_image_path,
    createdBy: row.created_by,
  };
}

export const TRIP_MEMBER_SELECT = 'id, tripId:trip_id, userId:user_id, role';

/** Lightweight member reference used to group members onto the trips list. */
export const TRIP_MEMBER_REF_SELECT = 'tripId:trip_id, userId:user_id, joinedAt:joined_at';

export const ITINERARY_SELECT =
  'id, tripId:trip_id, title, description, location, startAt:start_at, endAt:end_at, status, sortOrder:sort_order, createdBy:created_by';

export const PACKING_SELECT =
  'id, tripId:trip_id, label, quantity, assignedTo:assigned_to, isPacked:is_packed, sortOrder:sort_order, createdBy:created_by';

export const NOTE_SELECT =
  'id, tripId:trip_id, authorId:author_id, body, isPrivate:is_private, createdAt:created_at, updatedAt:updated_at';

export const INVITE_SELECT =
  'id, tripId:trip_id, code, createdBy:created_by, expiresAt:expires_at, acceptedAt:accepted_at';

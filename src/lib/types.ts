/**
 * App-facing domain types mirroring the SQL schema in docs/ARCHITECTURE.md §5.
 * Column names are camelCased in the data layer via PostgREST select
 * aliasing; the raw generated rows live in src/lib/supabase/database.types.ts.
 */

export type TripRole = 'owner' | 'member';
export type ItineraryStatus = 'planned' | 'confirmed' | 'done';

export interface Profile {
  id: string;
  displayName: string;
  avatarPath: string | null;
}

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: string | null; // ISO date
  endDate: string | null; // ISO date
  coverImagePath: string | null;
  createdBy: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: TripRole;
  profile: Profile;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string | null; // ISO timestamp
  endAt: string | null; // ISO timestamp
  status: ItineraryStatus;
  sortOrder: number;
  createdBy: string | null;
}

export interface PackingItem {
  id: string;
  tripId: string;
  label: string;
  quantity: number;
  assignedTo: string | null; // user id
  isPacked: boolean;
  sortOrder: number;
  createdBy: string | null;
}

export interface TripNote {
  id: string;
  tripId: string;
  authorId: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripInvite {
  id: string;
  tripId: string;
  code: string;
  createdBy: string;
  expiresAt: string;
  acceptedAt: string | null;
}

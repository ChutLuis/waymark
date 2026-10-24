/**
 * What the offline cache keeps on the device, as pure rules (Vitest covers
 * them; persistence.ts does the storage). The cache is stored per account,
 * holds only the data the trip screens need, and never holds a private note's
 * body: private notes are dropped from stored note lists, and a queued save of
 * a private note stays in memory only.
 */
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { queuedMutationName } from './keys';

const PERSIST_PREFIX = 'waymark.query.v1.';

export function persistKey(userId: string): string {
  return `${PERSIST_PREFIX}${userId}`;
}

/** Any account's stored cache. */
export function isPersistKey(key: string): boolean {
  return key.startsWith(PERSIST_PREFIX);
}

/** A stored cache older than this is dropped instead of restored. */
export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Changing this discards every stored cache (bump it when the stored shapes change). */
export const PERSIST_BUSTER = '1';

/** Writes are coalesced at most this often; short, so a resumed write is soon recorded as sent. */
export const PERSIST_THROTTLE_MS = 250;

/**
 * Query families restored on a cold start: the trip list and the trip
 * screens. Invites, invite previews and signed image URLs are left out: they
 * are bearer secrets or expire anyway.
 */
export const PERSISTED_QUERY_FAMILIES = ['trips', 'trip', 'profile', 'itinerary', 'notes', 'packing'] as const;
const PERSISTED_QUERIES = new Set<string>(PERSISTED_QUERY_FAMILIES);

interface QueryLike {
  queryKey: readonly unknown[];
  state: { status: string };
}

export function shouldPersistQuery(query: QueryLike): boolean {
  return query.state.status === 'success' && PERSISTED_QUERIES.has(String(query.queryKey[0]));
}

interface MutationLike {
  options: { mutationKey?: readonly unknown[] };
  state: { isPaused: boolean; variables?: unknown };
}

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[name] : undefined;
}

/**
 * Queued writes kept in memory only: a private note's body must not be stored
 * on the device, and a picked cover photo is a temporary file that may be gone
 * after a restart.
 */
export function isMemoryOnlyMutation(mutation: MutationLike): boolean {
  const name = queuedMutationName(mutation.options.mutationKey);
  const vars = mutation.state.variables;
  if (name === 'saveNote') return field(field(vars, 'input'), 'isPrivate') !== false;
  if (name === 'createTrip') return field(vars, 'coverImage') != null;
  return false;
}

/** A write waiting for the connection that may outlive the app. */
export function shouldPersistMutation(mutation: MutationLike): boolean {
  return (
    mutation.state.isPaused &&
    queuedMutationName(mutation.options.mutationKey) !== null &&
    !isMemoryOnlyMutation(mutation)
  );
}

function isPrivateNote(note: unknown): boolean {
  return field(note, 'isPrivate') !== false;
}

/**
 * The stored form of the cache: note lists without private notes. Anything
 * that doesn't look like a note list is kept as it is.
 */
export function redactPersistedClient(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    if (query.queryKey[0] !== 'notes' || !Array.isArray(query.state.data)) return query;
    return { ...query, state: { ...query.state, data: query.state.data.filter((note) => !isPrivateNote(note)) } };
  });
  const mutations = client.clientState.mutations.filter(
    (mutation) => !isMemoryOnlyMutation({ options: { mutationKey: mutation.mutationKey }, state: mutation.state }),
  );
  return { ...client, clientState: { ...client.clientState, queries, mutations } };
}

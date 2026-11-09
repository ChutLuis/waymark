/** Trip covers and the database row cannot be deleted atomically. An upload
 * between the final list and row deletion can still leave an object behind. */
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export const TRIP_DELETE_UNCERTAIN =
  'Couldn’t finish deleting this trip. Some cover photos may already be removed, and the trip may already be deleted. Check your trips and try again.';
export const TRIP_DELETE_UNAVAILABLE =
  'This trip is unavailable or you no longer have permission to delete it. Some cover photos may already be removed.';

type Result = { data: unknown; error: unknown };

export interface TripDeletionOperations {
  isCurrent: () => boolean;
  owner: () => Promise<Result>;
  list: (limit: number, offset: number) => Promise<Result>;
  remove: (paths: string[]) => Promise<Result>;
  deleteRow: () => Promise<Result>;
}

export class TripDeletionError extends Error {}

/**
 * Runs the account-scoped steps inside `run`, so each take the session gate in
 * turn: other session operations may run between rounds, and every round
 * re-verifies the account. A refused step fails closed like any other error.
 */
export function lockedOperations(
  ops: TripDeletionOperations,
  run: <T>(fn: () => Promise<T>) => Promise<T>,
): TripDeletionOperations {
  const step = <T>(fn: () => Promise<T>) =>
    run(fn).catch((error: unknown) => ({ data: null, error }) as unknown as T);
  return {
    isCurrent: ops.isCurrent,
    owner: () => step(ops.owner),
    list: (limit, offset) => step(() => ops.list(limit, offset)),
    remove: (paths) => step(() => ops.remove(paths)),
    deleteRow: () => step(ops.deleteRow),
  };
}

function fail(message = TRIP_DELETE_UNCERTAIN): never {
  throw new TripDeletionError(message);
}

function assertCurrent(ops: TripDeletionOperations): void {
  if (!ops.isCurrent()) fail();
}

/** Fail closed before row deletion whenever cover cleanup is unresolved. */
export async function deleteTripWithCovers(tripId: string, ops: TripDeletionOperations): Promise<void> {
  assertCurrent(ops);
  const owner = await ops.owner();
  assertCurrent(ops);
  if (owner.error) fail();
  if (!owner.data || typeof owner.data !== 'object' || (owner.data as { role?: unknown }).role !== 'owner') {
    fail(TRIP_DELETE_UNAVAILABLE);
  }

  let previous: Set<string> | null = null;
  for (let page = 0; page <= MAX_PAGES; page += 1) {
    assertCurrent(ops);
    const listed = await ops.list(PAGE_SIZE, 0);
    assertCurrent(ops);
    if (listed.error || !Array.isArray(listed.data)) fail();
    const names: string[] = [];
    for (const object of listed.data) {
      if (!object || typeof object !== 'object') fail();
      const { name, id } = object as { name?: unknown; id?: unknown };
      // Null ids are folder prefixes; the app's cover files are flat.
      if (typeof name !== 'string' || !name || name.includes('/') || name === '.' || name === '..' || typeof id !== 'string' || !id) fail();
      names.push(name);
    }
    if (new Set(names).size !== names.length || names.length > PAGE_SIZE) fail();
    if (names.length === 0) {
      const deleted = await ops.deleteRow();
      assertCurrent(ops);
      if (deleted.error || !Array.isArray(deleted.data)) fail();
      if (deleted.data.length === 0) fail(TRIP_DELETE_UNAVAILABLE);
      if (deleted.data.length !== 1 || deleted.data[0]?.id !== tripId) fail();
      return;
    }
    if (page === MAX_PAGES || (previous && names.some((name) => previous?.has(name)))) fail();
    previous = new Set(names);
    const removed = await ops.remove(names.map((name) => `${tripId}/${name}`));
    assertCurrent(ops);
    if (removed.error || !Array.isArray(removed.data) || removed.data.some((item) => {
      if (!item || typeof item !== 'object') return true;
      const { name } = item as { name?: unknown };
      return typeof name !== 'string' || !name;
    })) fail();
  }
  fail();
}

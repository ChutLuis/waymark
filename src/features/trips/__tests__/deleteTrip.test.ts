import { describe, expect, it, vi } from 'vitest';
import {
  deleteTripWithCovers,
  lockedOperations,
  TripDeletionError,
  TRIP_DELETE_UNCERTAIN,
  TRIP_DELETE_UNAVAILABLE,
  type TripDeletionOperations,
} from '../deleteTrip';

const ok = (data: unknown) => ({ data, error: null });
const file = (name: string) => ({ name, id: name });

function setup(pages: unknown[] = [[]]) {
  const ops: TripDeletionOperations = {
    isCurrent: vi.fn(() => true),
    owner: vi.fn(async () => ok({ role: 'owner' })),
    list: vi.fn(async () => ok(pages.length ? pages.shift() : [])),
    remove: vi.fn(async (paths: string[]) => ok(paths.map((name) => ({ name })))),
    deleteRow: vi.fn(async () => ok([{ id: 'trip' }])),
  };
  return ops;
}

/** Models the Storage list/remove API over more than two full pages. */
function setupStorage(failRemoval?: number) {
  const names = Array.from({ length: 201 }, (_, index) => `cover-${String(index).padStart(3, '0')}.jpg`);
  const remaining = new Set(names);
  const removed: string[] = [];
  const events: string[] = [];
  let attempts = 0;
  const ops: TripDeletionOperations = {
    isCurrent: vi.fn(() => true),
    owner: vi.fn(async () => ok({ role: 'owner' })),
    list: vi.fn(async (limit: number, offset: number) => {
      const page = [...remaining].sort().slice(offset, offset + limit);
      events.push(`list:${page.length}`);
      return ok(page.map(file));
    }),
    remove: vi.fn(async (paths: string[]) => {
      attempts += 1;
      if (attempts === failRemoval) {
        events.push(`remove-failed:${paths.length}`);
        return { data: null, error: new Error('storage unavailable') };
      }
      events.push(`remove:${paths.length}`);
      for (const path of paths) {
        const name = path.replace(/^trip\//, '');
        expect(remaining.delete(name)).toBe(true);
        removed.push(name);
      }
      return ok(paths.map((name) => ({ name })));
    }),
    deleteRow: vi.fn(async () => {
      events.push(`row:${remaining.size}`);
      return ok([{ id: 'trip' }]);
    }),
  };
  return { ops, names, remaining, removed, events };
}

describe('deleteTripWithCovers', () => {
  it('checks ownership and an empty folder before deleting the row', async () => {
    const ops = setup();
    await deleteTripWithCovers('trip', ops);
    expect(ops.list).toHaveBeenCalledWith(100, 0);
    expect(vi.mocked(ops.owner).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ops.list).mock.invocationCallOrder[0]);
    expect(vi.mocked(ops.list).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(ops.deleteRow).mock.invocationCallOrder[0]);
  });

  it('drains and verifies 201 cover objects in bounded first pages before deleting the row', async () => {
    const { ops, names, remaining, removed, events } = setupStorage();
    await deleteTripWithCovers('trip', ops);
    expect(vi.mocked(ops.list).mock.calls).toEqual([[100, 0], [100, 0], [100, 0], [100, 0]]);
    expect(vi.mocked(ops.remove).mock.calls.map(([paths]) => paths.length)).toEqual([100, 100, 1]);
    const listed = await Promise.all(vi.mocked(ops.list).mock.results.map(({ value }) => value));
    expect(listed.map((result) => result.data)).toEqual([
      names.slice(0, 100).map(file), names.slice(100, 200).map(file), names.slice(200).map(file), [],
    ]);
    expect(removed).toEqual(names);
    expect(new Set(removed).size).toBe(201);
    expect(remaining.size).toBe(0);
    expect(events).toEqual(['list:100', 'remove:100', 'list:100', 'remove:100', 'list:1', 'remove:1', 'list:0', 'row:0']);
    expect(ops.deleteRow).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, [null], [{ name: 'folder', id: null }], [file('../nested')]])('rejects malformed or nested listing %s', async (page) => {
    const ops = setup([page]);
    await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('rejects list and remove errors, null results and silent no-progress', async () => {
    for (const mode of ['list error', 'remove error', 'remove null', 'remove malformed', 'no progress']) {
      const ops = setup([[file('a')], [file('a')]]);
      if (mode === 'list error') vi.mocked(ops.list).mockResolvedValueOnce({ data: null, error: new Error() });
      if (mode === 'remove error') vi.mocked(ops.remove).mockResolvedValueOnce({ data: null, error: new Error() });
      if (mode === 'remove null') vi.mocked(ops.remove).mockResolvedValueOnce(ok(null));
      if (mode === 'remove malformed') vi.mocked(ops.remove).mockResolvedValueOnce(ok([{}]));
      if (mode === 'no progress') vi.mocked(ops.remove).mockResolvedValueOnce(ok([]));
      await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
      expect(ops.deleteRow).not.toHaveBeenCalled();
    }
  });

  it('stops at the bound without deleting the row', async () => {
    const pages = Array.from({ length: 101 }, (_, i) => [file(String(i))]);
    const ops = setup(pages);
    await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
    expect(ops.remove).toHaveBeenCalledTimes(100);
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('does not remove covers for a non-owner or changed account', async () => {
    const denied = setup();
    vi.mocked(denied.owner).mockResolvedValueOnce(ok(null));
    await expect(deleteTripWithCovers('trip', denied)).rejects.toThrow(TRIP_DELETE_UNAVAILABLE);
    expect(denied.list).not.toHaveBeenCalled();
    const switched = setup([[file('a')]]);
    vi.mocked(switched.isCurrent).mockReturnValueOnce(true).mockReturnValueOnce(false);
    await expect(deleteTripWithCovers('trip', switched)).rejects.toThrow();
    expect(switched.list).not.toHaveBeenCalled();
  });

  it('does not delete the row when the owner check rejects', async () => {
    const ops = setup();
    vi.mocked(ops.owner).mockRejectedValueOnce(new Error('owner request failed'));
    await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow('owner request failed');
    expect(ops.list).not.toHaveBeenCalled();
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('does not delete the row when the remove request throws', async () => {
    const ops = setup([[file('a')]]);
    vi.mocked(ops.remove).mockRejectedValueOnce(new Error('transport failed'));
    await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow('transport failed');
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('stops when the account changes after listing or removal', async () => {
    for (const checks of [3, 4]) {
      const ops = setup([[file('a')], []]);
      vi.mocked(ops.isCurrent).mockImplementation(() => vi.mocked(ops.isCurrent).mock.calls.length < checks + 1);
      await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
      expect(ops.deleteRow).not.toHaveBeenCalled();
    }
  });

  it('handles database failure, malformed results, and zero affected rows', async () => {
    for (const result of [{ data: null, error: new Error('dropped') }, ok(null), ok([]), ok([{ id: 'other' }])]) {
      const ops = setup();
      vi.mocked(ops.deleteRow).mockResolvedValueOnce(result);
      await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
    }
    const thrown = setup();
    vi.mocked(thrown.deleteRow).mockRejectedValueOnce(new Error('response lost'));
    await expect(deleteTripWithCovers('trip', thrown)).rejects.toThrow();
  });

  it('retries remaining covers after a successful page and a failed second removal', async () => {
    const { ops, names, remaining, removed, events } = setupStorage(2);
    await expect(deleteTripWithCovers('trip', ops)).rejects.toThrow();
    expect(removed).toEqual(names.slice(0, 100));
    expect(remaining.size).toBe(101);
    expect(ops.deleteRow).not.toHaveBeenCalled();
    await deleteTripWithCovers('trip', ops);
    expect(removed).toEqual(names);
    expect(new Set(removed).size).toBe(201);
    expect(remaining.size).toBe(0);
    expect(vi.mocked(ops.list).mock.calls).toEqual([[100, 0], [100, 0], [100, 0], [100, 0], [100, 0]]);
    expect(vi.mocked(ops.remove).mock.calls.map(([paths]) => paths.length)).toEqual([100, 100, 100, 1]);
    expect(events).toEqual([
      'list:100', 'remove:100', 'list:100', 'remove-failed:100',
      'list:100', 'remove:100', 'list:1', 'remove:1', 'list:0', 'row:0',
    ]);
    expect(ops.deleteRow).toHaveBeenCalledTimes(1);
  });
});

describe('lockedOperations', () => {
  /** A `run` that counts calls and can be made to reject on a chosen one. */
  function runRecorder(rejectOn: number | null = null) {
    const seen: string[] = [];
    const run = async <T>(fn: () => Promise<T>): Promise<T> => {
      seen.push('enter');
      if (rejectOn !== null && seen.length === rejectOn) throw new Error('Your session changed');
      return fn();
    };
    return { run, seen };
  }

  it('sends owner, list, remove and deleteRow through run, and leaves isCurrent alone', async () => {
    const { ops, events } = setupStorage();
    const { run, seen } = runRecorder();
    const locked = lockedOperations(ops, run);
    // isCurrent is passed through, not wrapped.
    expect(locked.isCurrent).toBe(ops.isCurrent);
    expect(locked.isCurrent()).toBe(true);
    expect(seen).toEqual([]);

    await deleteTripWithCovers('trip', locked);
    // A 201-cover deletion: 4 listings, 3 removals, 1 owner check, 1 row delete.
    expect(events.filter((event) => event.startsWith('list:')).length).toBe(4);
    expect(events.filter((event) => event.startsWith('remove:')).length).toBe(3);
    // Every step but the pass-through isCurrent went through run.
    expect(seen.length).toBe(
      1 + vi.mocked(ops.list).mock.calls.length + vi.mocked(ops.remove).mock.calls.length
      + vi.mocked(ops.deleteRow).mock.calls.length,
    );
    expect(seen.length).toBe(9);
  });

  it('spreads the gate across rounds instead of holding one slot for the whole run', async () => {
    const { ops } = setupStorage();
    const seen: string[] = [];
    // Each enter is recorded at a different moment, so no step nests inside another.
    let inFlight = 0;
    const nesting: number[] = [];
    const tracked = async <T>(fn: () => Promise<T>): Promise<T> => {
      inFlight += 1;
      nesting.push(inFlight);
      seen.push('enter');
      try {
        return await fn();
      } finally {
        inFlight -= 1;
      }
    };
    await deleteTripWithCovers('trip', lockedOperations(ops, tracked));
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(nesting)).toEqual(new Set([1]));
  });

  it('fails closed with TRIP_DELETE_UNCERTAIN when run rejects on the second list, and never deletes the row', async () => {
    const { ops } = setupStorage();
    // owner=1, list=2 → the second round's listing is refused.
    const { run, seen } = runRecorder(2);
    await expect(deleteTripWithCovers('trip', lockedOperations(ops, run))).rejects.toBeInstanceOf(TripDeletionError);
    await expect(deleteTripWithCovers('trip', lockedOperations(setupStorage().ops, runRecorder(2).run)))
      .rejects.toThrow(TRIP_DELETE_UNCERTAIN);
    expect(seen.length).toBe(2);
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('fails closed when run rejects on owner', async () => {
    const ops = setup();
    const { run } = runRecorder(1);
    await expect(deleteTripWithCovers('trip', lockedOperations(ops, run))).rejects.toThrow();
    expect(ops.list).not.toHaveBeenCalled();
    expect(ops.remove).not.toHaveBeenCalled();
    expect(ops.deleteRow).not.toHaveBeenCalled();
  });

  it('fails closed when run rejects on remove or on the final deleteRow', async () => {
    // owner=1, list=2, remove=3.
    const onRemove = setupStorage();
    await expect(deleteTripWithCovers('trip', lockedOperations(onRemove.ops, runRecorder(3).run))).rejects.toThrow(TRIP_DELETE_UNCERTAIN);
    expect(onRemove.ops.deleteRow).not.toHaveBeenCalled();

    const onRow = setup();
    // owner=1, list=2, deleteRow=3.
    await expect(deleteTripWithCovers('trip', lockedOperations(onRow, runRecorder(3).run))).rejects.toThrow(TRIP_DELETE_UNCERTAIN);
  });
});

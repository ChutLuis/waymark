/**
 * Keys of the writes that may wait for the connection and survive a restart
 * (docs/ARCHITECTURE.md, data access). Each one has its mutation function
 * registered with `setMutationDefaults` at startup, so a write queued before
 * the app was closed can still be sent after it is opened again. Anything not
 * listed (uploads, invites, leaving or deleting a trip, account changes) stays
 * online-only.
 */
export const mutationKeys = {
  createTrip: ['trips', 'create'],
  updateTrip: ['trips', 'update'],
  saveStop: ['itinerary', 'save'],
  deleteStop: ['itinerary', 'delete'],
  setStopStatus: ['itinerary', 'status'],
  saveNote: ['notes', 'save'],
  deleteNote: ['notes', 'delete'],
  savePackingItem: ['packing', 'save'],
  setPacked: ['packing', 'packed'],
  deletePackingItem: ['packing', 'delete'],
} as const;

export type QueuedMutationName = keyof typeof mutationKeys;

/** Which queued write a mutation key belongs to; null for anything online-only. */
export function queuedMutationName(key: readonly unknown[] | undefined): QueuedMutationName | null {
  if (!key || key.length !== 2) return null;
  for (const [name, candidate] of Object.entries(mutationKeys)) {
    if (candidate[0] === key[0] && candidate[1] === key[1]) return name as QueuedMutationName;
  }
  return null;
}

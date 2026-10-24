/**
 * What to say when a write that waited for the connection fails after all,
 * possibly after a restart and long after the sheet that made it closed: which
 * change it was, and why if the server said so. Pure, for Vitest.
 */
import type { QueuedMutationName } from '@/lib/query/keys';
import { serverMessage } from '@/features/trips/errors';
import { isNetworkError } from '@/lib/errors';

function text(value: unknown, name: string): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const field = (value as Record<string, unknown>)[name];
  return typeof field === 'string' && field.trim() ? field.trim() : null;
}

function quoted(value: string | null, max = 40): string {
  if (!value) return '';
  const clipped = value.length > max ? `${value.slice(0, max - 1)}…` : value;
  return ` “${clipped}”`;
}

function whatFailed(name: QueuedMutationName, variables: unknown): string {
  const input = typeof variables === 'object' && variables !== null ? (variables as { input?: unknown }).input : null;
  switch (name) {
    case 'createTrip':
      return `Couldn’t create the trip${quoted(text(variables, 'name'))}.`;
    case 'updateTrip':
      return 'Couldn’t save your changes to the trip.';
    case 'saveStop':
      return `Couldn’t save the stop${quoted(text(input, 'title'))}.`;
    case 'deleteStop':
      return 'Couldn’t delete a stop.';
    case 'setStopStatus':
      return 'Couldn’t update a stop.';
    case 'saveNote':
      return 'Couldn’t save your note.';
    case 'deleteNote':
      return 'Couldn’t delete a note.';
    case 'savePackingItem':
      return `Couldn’t save${quoted(text(input, 'label')) || ' a packing item'}.`;
    case 'setPacked':
      return 'Couldn’t update a packing item.';
    case 'deletePackingItem':
      return 'Couldn’t delete a packing item.';
  }
}

/** "Couldn’t save the stop “Louvre”." plus the reason, for a queued change that failed. */
export function queuedFailureMessage(name: QueuedMutationName, variables: unknown, error: unknown): string {
  const reason = isNetworkError(error)
    ? 'Check your connection and make the change again.'
    : (serverMessage(error) ?? 'It may have been changed or removed by someone else. Make the change again.');
  return `${whatFailed(name, variables)} ${reason}`;
}

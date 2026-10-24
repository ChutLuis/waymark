/**
 * Shared pieces of the writes that may wait for the connection (keys.ts).
 *
 * - Each one carries the account that made it (`ownerId`) and refuses to run,
 *   or to touch the cache, once another account (or nobody) is signed in: a
 *   write that was in flight or waiting to retry when the session changed
 *   must not be sent with the next person's token.
 * - New rows get their id on the device (`clientId`), so a replay or a retry
 *   after a lost response finds its own row instead of making a second one.
 * - They run one at a time per trip, in the order they were made, and a
 *   request that fails because the connection dropped is tried again (it
 *   pauses if the device is offline) instead of being reported as a failure.
 */
import { useLayoutEffect, useState } from 'react';
import { onlineManager, useMutation, type MutationKey, type MutationOptions } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { randomUUID } from 'expo-crypto';
import { isNetworkError } from '@/lib/errors';
import { StaleSessionError, getQueryOwner } from './owner';

export {
  StaleSessionError,
  assertCurrentOwner,
  getQueryOwner,
  isCurrentOwner,
  isDuplicateKey,
  setQueryOwner,
} from './owner';

/** Fields every queued write's variables carry. */
export interface QueuedVars {
  /** The account that made the write. */
  ownerId: string;
  /** The id a new row is inserted with (ignored by updates and deletes). */
  clientId: string;
  tripId?: string;
}

const NETWORK_RETRIES = 3;

/** For writes that are safe to send twice (updates, deletes, inserts with a client id). */
export const queuedWriteDefaults = {
  retry: (failureCount: number, error: unknown) =>
    !(error instanceof StaleSessionError) && isNetworkError(error) && failureCount < NETWORK_RETRIES,
} satisfies Pick<MutationOptions, 'retry'>;

/**
 * Before queued writes restored from the device run: tell TanStack whether
 * the device is actually online (its first guess is "online"), so a cold
 * start offline pauses them instead of failing them.
 */
export async function syncOnlineState(): Promise<void> {
  try {
    const state = await NetInfo.fetch();
    onlineManager.setOnline(state.isConnected === true);
  } catch {
    // Keep TanStack's own idea of the connection.
  }
}

/** A caller that needs the new row's id before the write lands (a stop's reminder) may pick it. */
type QueuedInput<TVars extends QueuedVars> = Omit<TVars, keyof QueuedVars> & { clientId?: string };

/**
 * A queued write's hook: fills in the account, a client id and the trip, and
 * queues the write behind the trip's other writes (`scope`, kept with the
 * write if it is stored). Everything else lives in the defaults registered
 * at startup.
 */
export function useQueuedMutation<TData, TVars extends QueuedVars, TContext = unknown>(
  mutationKey: MutationKey,
  tripId: string | null,
) {
  const mutation = useMutation<TData, Error, TVars, TContext>({
    mutationKey,
    scope: { id: tripId ? `trip:${tripId}` : mutationKey.join(':') },
  });
  const fill = (input: QueuedInput<TVars>): TVars =>
    ({
      ...input,
      ...(tripId ? { tripId } : {}),
      ownerId: getQueryOwner() ?? '',
      clientId: input.clientId ?? randomUUID(),
    }) as unknown as TVars;
  return {
    ...mutation,
    mutate: (input: QueuedInput<TVars>, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate(fill(input), options),
    mutateAsync: (input: QueuedInput<TVars>, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
      mutation.mutateAsync(fill(input), options),
  };
}

/**
 * An editor stays mounted between sheets, and a write queued offline stays
 * pending until it lands, so a sheet opened later would take that earlier
 * write for its own and open locked. Each time the sheet opens this forgets
 * the earlier write's state (`reset`, which must be stable: a mutation's own
 * `reset` is). The write itself carries on: its behaviour lives in the
 * registered defaults, and each sheet acts only on its own session's result.
 * A layout effect, so the sheet never paints locked.
 */
export function useResetOnOpen(visible: boolean, reset: () => void): void {
  useLayoutEffect(() => {
    if (visible) reset();
  }, [visible, reset]);
}

/**
 * The id a sheet's new row is inserted with, one per sheet session
 * (`session` changes each time the sheet opens). Tapping Save again after a
 * failure sends the same id, so a request that reached the server although
 * the app gave up on it (a timeout) lands once instead of twice.
 */
export function useDraftId(session: number): string {
  // Kept out of the React Compiler, which treats render as pure and reused the
  // first random id for every later session (seen on the device): a reused id
  // makes the next new row look already saved (duplicate key = done), so it
  // was silently dropped.
  'use no memo';
  const [draft, setDraft] = useState(() => ({ session, id: randomUUID() }));
  if (draft.session !== session) {
    const next = { session, id: randomUUID() };
    setDraft(next);
    return next.id;
  }
  return draft.id;
}

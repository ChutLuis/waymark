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

type QueuedInput<TVars extends QueuedVars> = Omit<TVars, keyof QueuedVars>;

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
    ({ ...input, ...(tripId ? { tripId } : {}), ownerId: getQueryOwner() ?? '', clientId: randomUUID() }) as unknown as TVars;
  return {
    ...mutation,
    mutate: (input: QueuedInput<TVars>, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate(fill(input), options),
    mutateAsync: (input: QueuedInput<TVars>, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
      mutation.mutateAsync(fill(input), options),
  };
}

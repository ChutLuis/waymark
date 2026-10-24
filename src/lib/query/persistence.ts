/**
 * Keeps the signed-in person's query cache and queued writes on the device,
 * so a restart (even offline) shows their trips and still sends what they
 * changed. One account at a time: AuthContext ends the persisted session and
 * removes the stored cache whenever a session ends or the account changes.
 * The rules for what is stored live in persist.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrate, type QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClientSubscribe, type PersistedClient } from '@tanstack/react-query-persist-client';
import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
  PERSIST_THROTTLE_MS,
  isPersistKey,
  persistKey,
  redactPersistedClient,
  shouldPersistMutation,
  shouldPersistQuery,
} from './persist';
import { syncOnlineState } from './queued';

interface PersistedSession {
  userId: string;
  /** Closed sessions write nothing, even a save that was already scheduled. */
  open: boolean;
  unsubscribe: (() => void) | null;
}

let current: PersistedSession | null = null;

function storageFor(session: PersistedSession) {
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => (session.open ? AsyncStorage.setItem(key, value) : Promise.resolve()),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

/**
 * Restores `userId`'s stored cache into the (empty) client, then keeps storing
 * it and sends any queued writes. Resolves once restored; never rejects.
 */
export async function startPersistedSession(queryClient: QueryClient, userId: string): Promise<void> {
  endPersistedSession();
  const session: PersistedSession = { userId, open: true, unsubscribe: null };
  current = session;
  const persister = createAsyncStoragePersister({
    storage: storageFor(session),
    key: persistKey(userId),
    throttleTime: PERSIST_THROTTLE_MS,
    serialize: (client) => JSON.stringify(redactPersistedClient(client)),
  });

  // Another account's cache can be left behind by a session that ended while
  // the app was closed.
  await purgePersistedQueries(userId);
  try {
    const stored = (await persister.restoreClient()) as PersistedClient | undefined;
    // Signed out, or someone else signed in, while reading: not theirs to see.
    if (!session.open) return;
    if (stored) {
      const fresh = Date.now() - stored.timestamp <= PERSIST_MAX_AGE && stored.buster === PERSIST_BUSTER;
      if (fresh) hydrate(queryClient, stored.clientState);
      else await persister.removeClient();
    }
  } catch {
    // Unreadable: start from an empty cache.
    await AsyncStorage.removeItem(persistKey(userId)).catch(() => {});
  }
  if (!session.open) return;
  session.unsubscribe = persistQueryClientSubscribe({
    queryClient,
    persister,
    buster: PERSIST_BUSTER,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: shouldPersistMutation },
  });
  // Writes queued before the restart run now, or as soon as the connection is
  // back: TanStack learns the real connection state first, so offline they
  // stay paused instead of failing.
  await syncOnlineState();
  if (!session.open) return;
  void queryClient.resumePausedMutations();
}

/** Stops storing the cache at once, before it is cleared. */
export function endPersistedSession(): void {
  if (!current) return;
  current.open = false;
  current.unsubscribe?.();
  current = null;
}

/** Deletes an account's stored cache and queued writes. Never rejects. */
export function removePersistedQueries(userId: string): Promise<void> {
  return AsyncStorage.removeItem(persistKey(userId)).catch(() => {});
}

/** Deletes every stored cache except `except`'s (or the active session's). Never rejects. */
export async function purgePersistedQueries(except: string | null = current?.userId ?? null): Promise<void> {
  try {
    const keep = except === null ? null : persistKey(except);
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => isPersistKey(key) && key !== keep);
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Left for the next start.
  }
}

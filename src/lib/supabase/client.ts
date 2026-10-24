import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { withRequestTimeout } from './timeoutFetch';

/**
 * Session tokens live in the device keychain on native (AUTH-4). Web has no
 * secure store, so it stays on supabase-js's browser default (localStorage) —
 * an accepted v1 tradeoff; no storage adapter is handed to web.
 *
 * SecureStore rejects large values (iOS has historically capped entries near
 * ~2KB) and a refreshed Supabase session can exceed that, so the adapter
 * chunks a value across `${key}.0`, `${key}.1`, … and stores the chunk count
 * at `key`. removeItem deletes every chunk. Values written by the older plain
 * adapter (JSON, never all-digits) are read back transparently.
 */
const CHUNK_SIZE = 1800; // safely under SecureStore's ~2KB per-entry ceiling

// iOS: tokens stay unreadable until the first unlock after boot (background
// refresh still works) and are bound to this device, so a backup restored onto
// another phone doesn't bring the session along. Reads ignore the attribute,
// so sessions saved under the old AFTER_FIRST_UNLOCK setting still load; each
// write re-adds the token chunks with this one. Android ignores the option: its
// values are encrypted with a Keystore key that never leaves the device.
const keychainOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function chunkCount(key: string): Promise<number | null> {
  const head = await SecureStore.getItemAsync(key);
  if (head === null || !/^\d+$/.test(head)) return null;
  return Number.parseInt(head, 10);
}

async function clearChunks(key: string): Promise<void> {
  const count = await chunkCount(key);
  if (count === null) return;
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(`${key}.${i}`);
  }
}

const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const head = await SecureStore.getItemAsync(key);
    if (head === null) return null;
    // Not a chunk-count index: a value from the older plain adapter.
    if (!/^\d+$/.test(head)) return head;
    const count = Number.parseInt(head, 10);
    let value = '';
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // partial/corrupt write — treat as absent
      value += part;
    }
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Drop any stale chunks left by a previous, longer value first.
    await clearChunks(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i], keychainOptions);
    }
    await SecureStore.setItemAsync(key, String(chunks.length), keychainOptions);
  },
  removeItem: async (key: string): Promise<void> => {
    await clearChunks(key);
    await SecureStore.deleteItemAsync(key);
  },
};

const extra = Constants.expoConfig?.extra as
  | { supabaseUrl?: string; supabaseAnonKey?: string }
  | undefined;

const supabaseUrl = extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Web has no secure store; leave it on the browser default (localStorage).
    ...(Platform.OS !== 'web' ? { storage: secureStoreAdapter } : {}),
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Database and auth requests give up after 20 s with no response, so one
  // stalled request can't hold back a trip's queued changes (timeoutFetch.ts).
  global: { fetch: withRequestTimeout((input, init) => fetch(input, init)) },
});

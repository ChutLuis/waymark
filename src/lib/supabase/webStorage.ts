import type { AsyncKeyValueStorage } from './sessionGate';

/** Use the SDK's browser availability check; SSR and blocked storage use memory. */
export function createWebStorage(): AsyncKeyValueStorage {
  let browser: Storage | null = null;
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof globalThis.localStorage === 'object') {
      const candidate = globalThis.localStorage;
      const probe = `lswt-${Math.random()}${Math.random()}`;
      candidate.setItem(probe, probe);
      candidate.removeItem(probe);
      browser = candidate;
    }
  } catch {
    browser = null;
  }
  const memory = new Map<string, string>();
  return {
    getItem: async (key) => browser ? browser.getItem(key) : memory.get(key) ?? null,
    setItem: async (key, value) => { if (browser) browser.setItem(key, value); else memory.set(key, value); },
    removeItem: async (key) => { if (browser) browser.removeItem(key); else memory.delete(key); },
  };
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWebStorage } from '../webStorage';

afterEach(() => vi.unstubAllGlobals());

describe('web auth storage', () => {
  it('uses the existing browser storage keys when available', async () => {
    const data = new Map<string, string>([['existing', 'value']]);
    vi.stubGlobal('window', {}); vi.stubGlobal('document', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
      removeItem: (key: string) => { data.delete(key); },
    });
    const storage = createWebStorage();
    expect(await storage.getItem('existing')).toBe('value');
    await storage.setItem('new', 'next');
    expect(data.get('new')).toBe('next');
    await storage.removeItem('existing');
    expect(data.has('existing')).toBe(false);
  });

  it('uses per-instance memory when browser storage is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    const storage = createWebStorage();
    await storage.setItem('key', 'value');
    expect(await storage.getItem('key')).toBe('value');
    expect(await createWebStorage().getItem('key')).toBeNull();
    await storage.removeItem('key');
    expect(await storage.getItem('key')).toBeNull();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import {
  StaleSessionError,
  assertCurrentOwner,
  getQueryOwner,
  isCurrentOwner,
  isDuplicateKey,
  setQueryOwner,
} from '../owner';

afterEach(() => setQueryOwner(null));

describe('queued write ownership', () => {
  it('belongs to the account that is signed in', () => {
    setQueryOwner('user-a');
    expect(getQueryOwner()).toBe('user-a');
    expect(isCurrentOwner('user-a')).toBe(true);
    expect(() => assertCurrentOwner('user-a')).not.toThrow();
  });

  it('refuses a write made by the previous account after a switch', () => {
    setQueryOwner('user-a');
    setQueryOwner('user-b');
    expect(isCurrentOwner('user-a')).toBe(false);
    expect(() => assertCurrentOwner('user-a')).toThrow(StaleSessionError);
  });

  it('refuses every write once nobody is signed in', () => {
    setQueryOwner('user-a');
    setQueryOwner(null);
    expect(isCurrentOwner('user-a')).toBe(false);
  });

  it('never matches a missing or empty owner', () => {
    setQueryOwner('user-a');
    expect(isCurrentOwner(undefined)).toBe(false);
    expect(isCurrentOwner('')).toBe(false);
    setQueryOwner(null);
    expect(isCurrentOwner(null)).toBe(false);
  });
});

describe('isDuplicateKey', () => {
  it('recognises an insert whose client id already landed', () => {
    expect(isDuplicateKey({ code: '23505', message: 'duplicate key value' })).toBe(true);
  });

  it('leaves every other failure alone', () => {
    expect(isDuplicateKey({ code: '42501' })).toBe(false);
    expect(isDuplicateKey(new Error('Network request failed'))).toBe(false);
    expect(isDuplicateKey(null)).toBe(false);
  });
});

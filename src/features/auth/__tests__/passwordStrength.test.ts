import { describe, expect, it } from 'vitest';
import { LENGTH_HINT, MIN_PASSWORD_LENGTH, STRENGTH_LABELS, strengthOf } from '../passwordStrength';
import { MIN_PASSWORD_LENGTH as SCHEMA_MIN } from '@/lib/validation/schemas';

describe('strengthOf', () => {
  it('is 0 only when empty', () => {
    expect(strengthOf('')).toBe(0);
    expect(STRENGTH_LABELS[0]).toBe('');
  });

  it('uses the form schemas’ minimum, and says it before anything is typed', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(SCHEMA_MIN);
    expect(LENGTH_HINT).toBe('8+ CHARACTERS');
  });

  it('stays at the lowest level below the minimum length', () => {
    // "Ab1!" is short but has a digit, mixed case and a symbol.
    expect(strengthOf('Ab1!')).toBe(1);
    expect(strengthOf('abcdefg')).toBe(1);
    expect(STRENGTH_LABELS[strengthOf('Ab1!')]).toBe('WEAK');
  });

  it('rewards length and character types at/above the minimum', () => {
    expect(strengthOf('abcdefgh')).toBe(1);
    expect(strengthOf('abcdefg1')).toBe(2);
    expect(strengthOf('Abcdefg1')).toBe(3);
    expect(strengthOf('Abcdefg1!')).toBe(4);
  });

  it('caps at 4', () => {
    expect(strengthOf('Abcdefg1!Abcdefg1!')).toBe(4);
  });
});
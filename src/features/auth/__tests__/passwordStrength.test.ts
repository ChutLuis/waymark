import { describe, expect, it } from 'vitest';
import { STRENGTH_LABELS, strengthOf } from '../passwordStrength';

describe('strengthOf', () => {
  it('is 0 only when empty', () => {
    expect(strengthOf('')).toBe(0);
    expect(STRENGTH_LABELS[0]).toBe('');
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
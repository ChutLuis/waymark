import { describe, expect, it } from 'vitest';
import { daysAgoLabel } from '../labels';

const now = new Date(2026, 9, 12, 19, 0);
const at = (d: number, h = 9) => new Date(2026, 9, d, h, 0).toISOString();

describe('daysAgoLabel', () => {
  it('says TODAY and YESTERDAY', () => {
    expect(daysAgoLabel(at(12), now, 'OCT 12')).toBe('TODAY');
    expect(daysAgoLabel(at(11, 23), now, 'OCT 11')).toBe('YESTERDAY');
  });
  it('counts days within a week', () => {
    expect(daysAgoLabel(at(8), now, 'OCT 8')).toBe('4 DAYS AGO');
  });
  it('falls back to the date after a week', () => {
    expect(daysAgoLabel(at(1), now, 'OCT 1')).toBe('OCT 1');
  });
});

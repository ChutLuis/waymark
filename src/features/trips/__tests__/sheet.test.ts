import { describe, expect, it } from 'vitest';
import { codeLength, sheetDays, sheetHeader, typedCode, usedRange, usedSummary } from '../sheet';

describe('sheetDays', () => {
  const days = sheetDays('2026-10-03', '2026-10-12', '2026-10-08');

  it('prints one stamp per day', () => {
    expect(days).toHaveLength(10);
    expect(days[0].label).toBe('SAT 3');
    expect(days[9].label).toBe('MON 12');
  });

  it('marks the days before today used and labels today', () => {
    expect(days.filter((d) => d.used).map((d) => d.day)).toEqual([3, 4, 5, 6, 7]);
    expect(days[5].label).toBe('TODAY · 8');
    expect(days[5].today).toBe(true);
  });

  it('is empty without dates', () => {
    expect(sheetDays(null, '2026-10-12', '2026-10-08')).toEqual([]);
  });

  it('runs across a month boundary', () => {
    const across = sheetDays('2026-03-30', '2026-04-02', '2026-01-01');
    expect(across.map((d) => d.label)).toEqual(['MON 30', 'TUE 31', 'WED 1', 'THU 2']);
  });
});

describe('sheet lines', () => {
  const days = sheetDays('2026-10-03', '2026-10-12', '2026-10-08');

  it('heads the sheet', () => {
    expect(sheetHeader('NIPPON', 'Kyoto & Nara', 10, 2026)).toBe('NIPPON · KYOTO & NARA · TEN DAYS · 2026');
  });

  it('dates the postmark with the used days', () => {
    expect(usedRange(days, 2026)).toBe('3–7 X 26');
    expect(usedRange(sheetDays('2026-10-03', '2026-10-12', '2026-10-01'), 2026)).toBe('');
  });

  it('counts used and to go', () => {
    expect(usedSummary(days)).toBe('5 USED · 5 TO GO');
  });
});

describe('typedCode', () => {
  it('types the code with its space', () => {
    expect(typedCode('8N3BCU8X', 0)).toBe('');
    expect(typedCode('8N3BCU8X', 5)).toBe('8N3B ');
    expect(typedCode('8N3BCU8X', 9)).toBe('8N3B CU8X');
    expect(codeLength('8N3BCU8X')).toBe(9);
  });
});

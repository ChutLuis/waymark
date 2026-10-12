import { describe, expect, it } from 'vitest';
import { albumSummary, moreLine, postmarkMonth, sheetHeading, sheetsByYear } from '../shoebox';

const trip = (id: string, start: string, end: string) => ({ id, startDate: start, endDate: end });
const past = [
  trip('lisbon', '2026-03-21', '2026-03-31'),
  trip('chiang', '2026-10-06', '2026-10-11'),
  trip('rome', '2024-05-01', '2024-05-08'),
  trip('oslo', '2023-12-28', '2024-01-03'),
  trip('lima', '2023-02-01', '2023-02-09'),
];

describe('sheetsByYear', () => {
  it('makes one sheet per year, newest first, newest trip first', () => {
    expect(sheetsByYear(past).map((s) => [s.year, s.trips.map((t) => t.id)])).toEqual([
      [2026, ['chiang', 'lisbon']],
      [2024, ['rome', 'oslo']],
      [2023, ['lima']],
    ]);
  });
});

describe('shoebox lines', () => {
  it('heads a sheet', () => {
    expect(sheetHeading(2026, 3)).toBe('2026 · THREE TRIPS');
    expect(sheetHeading(2023, 1)).toBe('2023 · ONE TRIP');
  });

  it('sums up the album', () => {
    expect(albumSummary(past)).toBe('5 trips, postmarked · 2023 to 2026');
    expect(albumSummary([past[0]])).toBe('1 trip, postmarked · 2026');
  });

  it('says how far back the rest go', () => {
    expect(moreLine(past, 2026)).toBe('and 4 more, back to 2023');
  });

  it('says "this year" when every past trip is from this year', () => {
    expect(moreLine(past.slice(0, 2), 2026)).toBe('and 1 more this year');
    expect(moreLine(past.slice(0, 2), 2027)).toBe('and 1 more, back to 2026');
  });

  it('names the postmark month', () => {
    expect(postmarkMonth(past[0])).toBe('MAR');
  });
});

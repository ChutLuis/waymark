import { describe, expect, it } from 'vitest';
import {
  albumSummary,
  cancelLineYs,
  moreLine,
  postmarkCity,
  postmarkMonth,
  sheetHeading,
  sheetRows,
  sheetsByYear,
  stampCellWidth,
} from '../shoebox';

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

describe('postmarkCity', () => {
  it('uses the illustrated country’s chip', () => {
    expect(postmarkCity({ ...trip('kyoto', '2026-03-01', '2026-03-07'), destination: 'Kyoto, Japan' })).toBe('京都 · KYOTO');
  });

  it('falls back to the destination, then the name, uppercased', () => {
    expect(postmarkCity({ ...trip('berlin', '2026-02-01', '2026-02-03'), destination: 'Berlin weekend' })).toBe('BERLIN WEEKEND');
    expect(postmarkCity({ ...trip('berlin', '2026-02-01', '2026-02-03'), name: 'Berlin weekend' })).toBe('BERLIN WEEKEND');
    expect(postmarkCity(trip('nameless', '2026-02-01', '2026-02-03'))).toBe('');
  });

  it('ignores a blank destination', () => {
    expect(postmarkCity({ ...trip('x', '2026-02-01', '2026-02-03'), name: 'Oslo', destination: '   ' })).toBe('OSLO');
  });
});

describe('sheetRows', () => {
  it('marks a short row centred and a full row flush', () => {
    expect(sheetRows(['a', 'b', 'c', 'd', 'e', 'f'], 4)).toEqual([
      { trips: ['a', 'b', 'c', 'd'], centered: false },
      { trips: ['e', 'f'], centered: true },
    ]);
  });

  it('centres a single short row, and stops when a sheet divides evenly', () => {
    expect(sheetRows(['a', 'b'], 4)).toEqual([{ trips: ['a', 'b'], centered: true }]);
    expect(sheetRows(['a', 'b', 'c', 'd'], 4)).toEqual([{ trips: ['a', 'b', 'c', 'd'], centered: false }]);
    expect(sheetRows([], 4)).toEqual([]);
  });
});

describe('stampCellWidth', () => {
  it('floors the quarter to a whole device pixel', () => {
    // 390 - 32 padding - 3 × 8 gaps = 334; /4 = 83.5, floored on a 2x screen.
    expect(stampCellWidth(390, 4, 8, 16, 2)).toBe(83.5);
    expect(stampCellWidth(391, 4, 8, 16, 2)).toBe(83.5);
  });
});

describe('cancelLineYs', () => {
  it('keeps every line inside the postmark box', () => {
    // The design's band: 22 × 16, pitch 5, stroke 1.5, first baseline at 3.
    expect(cancelLineYs(16, 5, 1.5, 3)).toEqual([3, 8, 13]);
  });

  it('never returns a baseline whose stroke leaves the box', () => {
    for (const y of cancelLineYs(16, 5, 1.5, 3)) {
      expect(y - 1.25 - 0.75).toBeGreaterThanOrEqual(0);
      expect(y + 0.75).toBeLessThanOrEqual(16);
    }
  });

  it('fits a fourth line only when the box is tall enough', () => {
    expect(cancelLineYs(22, 5, 1.5, 3)).toEqual([3, 8, 13, 18]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildCalendarMonth,
  dayAccessibilityLabel,
  dayRangeRole,
  nextWeekend,
  nightsFrom,
  parseYearMonth,
  rangeSummary,
  shiftMonth,
  stepRangeSelection,
  weekBand,
} from '../dateRange';

describe('stepRangeSelection', () => {
  it('starts a new range on the first tap', () => {
    expect(stepRangeSelection({ start: null, end: null }, '2026-10-14')).toEqual({
      start: '2026-10-14',
      end: null,
    });
  });

  it('completes the range on the second tap on or after start', () => {
    expect(stepRangeSelection({ start: '2026-10-14', end: null }, '2026-10-20')).toEqual({
      start: '2026-10-14',
      end: '2026-10-20',
    });
    expect(stepRangeSelection({ start: '2026-10-14', end: null }, '2026-10-14')).toEqual({
      start: '2026-10-14',
      end: '2026-10-14',
    });
  });

  it('moves start earlier when tapping before start while awaiting end', () => {
    expect(stepRangeSelection({ start: '2026-10-14', end: null }, '2026-10-10')).toEqual({
      start: '2026-10-10',
      end: null,
    });
  });

  it('restarts the range when tapping after a completed range', () => {
    expect(
      stepRangeSelection({ start: '2026-10-14', end: '2026-10-20' }, '2026-11-02'),
    ).toEqual({
      start: '2026-11-02',
      end: null,
    });
  });

  it('restarts from a tapped endpoint of a finished range instead of shrinking it', () => {
    const range = { start: '2026-10-14', end: '2026-10-20' };
    expect(stepRangeSelection(range, '2026-10-14')).toEqual({ start: '2026-10-14', end: null });
    expect(stepRangeSelection(range, '2026-10-20')).toEqual({ start: '2026-10-20', end: null });
    expect(stepRangeSelection(range, '2026-10-17')).toEqual({ start: '2026-10-17', end: null });
  });

  it('alternates one predictable pair of states when the same day is tapped again and again', () => {
    const day = '2026-10-14';
    let state: { start: string | null; end: string | null } = { start: null, end: null };
    const roles: string[] = [];
    for (let tap = 0; tap < 4; tap++) {
      state = stepRangeSelection(state, day);
      roles.push(dayRangeRole(day, state.start, state.end));
    }
    // Waiting for a return date, then a one-day trip, then waiting again.
    expect(roles).toEqual(['pending', 'single', 'pending', 'single']);
    expect(state).toEqual({ start: day, end: day });
  });
});

describe('dayRangeRole', () => {
  it('classifies start, middle, end, single and outside days', () => {
    expect(dayRangeRole('2026-10-14', '2026-10-14', '2026-10-14')).toBe('single');
    expect(dayRangeRole('2026-10-14', '2026-10-14', '2026-10-18')).toBe('start');
    expect(dayRangeRole('2026-10-16', '2026-10-14', '2026-10-18')).toBe('middle');
    expect(dayRangeRole('2026-10-18', '2026-10-14', '2026-10-18')).toBe('end');
    expect(dayRangeRole('2026-10-19', '2026-10-14', '2026-10-18')).toBe('none');
    expect(dayRangeRole('2026-10-13', '2026-10-14', '2026-10-18')).toBe('none');
  });

  it('marks a leave date that still waits for its return date as pending, not a one-day trip', () => {
    expect(dayRangeRole('2026-10-14', '2026-10-14', null)).toBe('pending');
    expect(dayRangeRole('2026-10-15', '2026-10-14', null)).toBe('none');
  });

  it('has no roles without a start, and never paints an inverted range', () => {
    expect(dayRangeRole('2026-10-14', null, null)).toBe('none');
    expect(dayRangeRole('2026-10-14', null, '2026-10-14')).toBe('none');
    expect(dayRangeRole('2026-10-14', '2026-10-14', '2026-10-10')).toBe('single');
    expect(dayRangeRole('2026-10-12', '2026-10-14', '2026-10-10')).toBe('none');
  });
});

describe('weekBand', () => {
  // October 2026: the week of Mon 12 – Sun 18 and the first, partial week.
  const october = buildCalendarMonth(2026, 9);
  const midWeek = october[2];
  const firstWeek = october[0];
  const lastWeek = october[4];

  it('runs from the centre of the start day to the centre of the end day', () => {
    expect(weekBand(midWeek, '2026-10-13', '2026-10-16')).toEqual({ from: 1.5, to: 4.5 });
  });

  it('runs to the week edge when the range carries on, and from it when it began earlier', () => {
    expect(weekBand(midWeek, '2026-10-16', '2026-10-25')).toEqual({ from: 4.5, to: 7 });
    expect(weekBand(midWeek, '2026-10-05', '2026-10-14')).toEqual({ from: 0, to: 2.5 });
    expect(weekBand(midWeek, '2026-10-01', '2026-10-31')).toEqual({ from: 0, to: 7 });
  });

  it('starts at the first day of the month when the range began in an earlier month', () => {
    // 1 Oct 2026 is a Thursday (column 3).
    expect(weekBand(firstWeek, '2026-09-28', '2026-10-02')).toEqual({ from: 3, to: 4.5 });
  });

  it('stops at the last day of the month when the range carries into the next', () => {
    // 31 Oct 2026 is a Saturday (column 5); Sunday is an empty cell.
    expect(weekBand(lastWeek, '2026-10-28', '2026-11-03')).toEqual({ from: 2.5, to: 6 });
  });

  it('has no band for one-day trips, a pending start or weeks outside the range', () => {
    expect(weekBand(midWeek, '2026-10-14', '2026-10-14')).toBeNull();
    expect(weekBand(midWeek, '2026-10-14', null)).toBeNull();
    expect(weekBand(midWeek, '2026-10-20', '2026-10-24')).toBeNull();
    expect(weekBand(midWeek, null, null)).toBeNull();
  });
});

describe('presets', () => {
  it('adds nights to a start date across month and year ends', () => {
    expect(nightsFrom('2026-10-14', 5)).toEqual({ start: '2026-10-14', end: '2026-10-19' });
    expect(nightsFrom('2026-10-28', 7)).toEqual({ start: '2026-10-28', end: '2026-11-04' });
    expect(nightsFrom('2026-12-30', 5)).toEqual({ start: '2026-12-30', end: '2027-01-04' });
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it.each([
    ['Monday', '2026-10-19', '2026-10-23'],
    ['Wednesday', '2026-10-21', '2026-10-23'],
    ['Thursday', '2026-10-22', '2026-10-23'],
    ['Friday', '2026-10-23', '2026-10-23'],
    ['Saturday', '2026-10-24', '2026-10-30'],
    ['Sunday', '2026-10-25', '2026-10-30'],
  ])('picks the next Friday to Sunday from a %s', (_weekday, from, friday) => {
    const weekend = nextWeekend(from);
    expect(weekend.start).toBe(friday);
    expect(weekend.end).toBe(addDays(friday, 2));
    expect(new Date(`${weekend.start}T00:00:00Z`).getUTCDay()).toBe(5);
    expect(new Date(`${weekend.end}T00:00:00Z`).getUTCDay()).toBe(0);
  });

  it('keeps the weekend whole across a month end', () => {
    expect(nextWeekend('2026-10-29')).toEqual({ start: '2026-10-30', end: '2026-11-01' });
  });
});

describe('rangeSummary', () => {
  it('summarises a range within a month, across months and across years', () => {
    expect(rangeSummary('2026-11-13', '2026-11-23')).toBe('13–23 NOV · 10 NIGHTS');
    expect(rangeSummary('2026-09-28', '2026-10-06')).toBe('28 SEP – 6 OCT · 8 NIGHTS');
    expect(rangeSummary('2026-12-30', '2027-01-02')).toBe('30 DEC – 2 JAN · 3 NIGHTS');
    expect(rangeSummary('2026-10-19', '2026-10-20')).toBe('19–20 OCT · 1 NIGHT');
  });

  it('prints a one-day trip once, not as a range from a day to itself', () => {
    expect(rangeSummary('2026-10-14', '2026-10-14')).toBe('14 OCT · 1 DAY');
  });

  it('keeps the same month in different years apart', () => {
    expect(rangeSummary('2026-10-30', '2027-10-02')).toBe('30 OCT – 2 OCT · 337 NIGHTS');
  });
});

describe('dayAccessibilityLabel', () => {
  it('names the day and its place in the trip', () => {
    expect(dayAccessibilityLabel('2026-10-07', 'middle', false)).toBe('Wednesday 7 October, in your trip');
    expect(dayAccessibilityLabel('2026-10-03', 'start', false)).toBe('Saturday 3 October, trip start');
    expect(dayAccessibilityLabel('2026-10-12', 'end', false)).toBe('Monday 12 October, trip end');
    expect(dayAccessibilityLabel('2026-10-12', 'single', false)).toBe('Monday 12 October, one-day trip');
    expect(dayAccessibilityLabel('2026-10-12', 'pending', false)).toBe(
      'Monday 12 October, trip start, choose a return date',
    );
  });

  it('adds today and leaves days outside the trip plain', () => {
    expect(dayAccessibilityLabel('2026-10-19', 'none', true)).toBe('Monday 19 October, today');
    expect(dayAccessibilityLabel('2026-10-20', 'none', false)).toBe('Tuesday 20 October');
    expect(dayAccessibilityLabel('2026-10-19', 'middle', true)).toBe('Monday 19 October, in your trip, today');
  });
});

describe('buildCalendarMonth & navigation', () => {
  it('builds a Monday-first 7-column grid for October 2026', () => {
    // 1 Oct 2026 is a Thursday (index 3 in Mon..Sun)
    const weeks = buildCalendarMonth(2026, 9);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toBe('2026-10-01');
    const allDays = weeks.flat().filter(Boolean);
    expect(allDays).toHaveLength(31);
    expect(allDays[30]).toBe('2026-10-31');
  });

  it('shifts months across year boundaries and parses ISO dates', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(parseYearMonth('2026-10-16', new Date(2025, 0, 1))).toEqual({ year: 2026, month: 9 });
  });
});

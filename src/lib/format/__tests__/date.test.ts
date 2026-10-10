import { describe, expect, it } from 'vitest';
import {
  dayKey,
  formatDate,
  formatDateDayFirst,
  formatDateRange,
  formatDateTime,
  formatDateTimeDayFirst,
  formatDayHeader,
  formatNoteTime,
  formatShortDate,
  formatTime,
  formatTimePadded,
  initials,
} from '../date';

describe('formatDayHeader', () => {
  it('formats a full day header', () => {
    expect(formatDayHeader('2026-10-12T10:40:00')).toBe('Monday, October 12');
  });
});

describe('formatTime', () => {
  it('pads minutes', () => {
    expect(formatTime('2026-10-12T09:05:00')).toBe('9:05');
  });
  it('keeps 24-hour times', () => {
    expect(formatTime('2026-10-12T20:00:00')).toBe('20:00');
  });
});

describe('formatTimePadded', () => {
  it('pads a morning hour', () => {
    expect(formatTimePadded('2026-10-12T07:00:00')).toBe('07:00');
  });
  it('pads hours and minutes', () => {
    expect(formatTimePadded('2026-10-12T09:05:00')).toBe('09:05');
  });
  it('keeps 24-hour times', () => {
    expect(formatTimePadded('2026-10-12T20:00:00')).toBe('20:00');
  });
});

describe('formatDateTime', () => {
  it('combines day-first date and time', () => {
    expect(formatDateTime('2026-10-12T10:40:00')).toBe('12 Oct, 10:40');
  });
});

describe('formatDateDayFirst', () => {
  it('reads day first with a weekday', () => {
    expect(formatDateDayFirst('2026-11-13')).toBe('Fri 13 Nov');
  });
  it('accepts date-only strings without a timezone shift', () => {
    expect(formatDateDayFirst('2026-03-28')).toBe('Sat 28 Mar');
  });
});

describe('formatDateTimeDayFirst', () => {
  it('reads day first', () => {
    expect(formatDateTimeDayFirst('2026-10-12T10:40:00')).toBe('12 Oct, 10:40');
  });
});

describe('formatDate', () => {
  it('reads day first', () => {
    expect(formatDate('2026-11-13')).toBe('Fri 13 Nov');
  });
});

describe('formatNoteTime', () => {
  const now = new Date(2026, 6, 21, 12, 0, 0);
  it('says Today for today', () => {
    expect(formatNoteTime('2026-07-21T08:00:00', now)).toBe('Today');
  });
  it('says Yesterday', () => {
    expect(formatNoteTime('2026-07-20T08:00:00', now)).toBe('Yesterday');
  });
  it('counts recent days', () => {
    expect(formatNoteTime('2026-07-19T08:00:00', now)).toBe('2 days ago');
  });
  it('falls back to day-month', () => {
    expect(formatNoteTime('2026-03-12T08:00:00', now)).toBe('12 Mar');
  });
});

describe('formatDateRange', () => {
  it('collapses same-month ranges', () => {
    expect(formatDateRange('2026-10-12', '2026-10-19')).toBe('Oct 12 – 19');
  });
  it('spells out cross-month ranges', () => {
    expect(formatDateRange('2026-10-28', '2026-11-02')).toBe('Oct 28 – Nov 2');
  });
  it('handles missing ends', () => {
    expect(formatDateRange('2026-10-12', null)).toBe('From Oct 12');
    expect(formatDateRange(null, null)).toBe('');
  });
});

describe('formatShortDate', () => {
  const now = new Date(2026, 6, 21, 12, 0, 0);
  it('says Today for the same day', () => {
    expect(formatShortDate('2026-07-21T08:00:00', now)).toBe('Today');
  });
  it('says Yesterday for the previous day', () => {
    expect(formatShortDate('2026-07-20T23:00:00', now)).toBe('Yesterday');
  });
  it('falls back to a short date', () => {
    expect(formatShortDate('2026-07-14T09:00:00', now)).toBe('Jul 14');
  });
});

describe('dayKey', () => {
  it('produces a local calendar key', () => {
    expect(dayKey('2026-10-12T00:30:00')).toBe('2026-10-12');
  });
});

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Mia Junot')).toBe('MJ');
  });
  it('handles single names', () => {
    expect(initials('Alex')).toBe('AL');
  });
  it('handles empty strings', () => {
    expect(initials('  ')).toBe('?');
  });
});

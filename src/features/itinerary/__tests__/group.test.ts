import { describe, expect, it } from 'vitest';
import {
  groupItineraryByDay,
  newItemStartAt,
  nextStop,
  stopsLeavingDates,
  stopsToGo,
  tripDayBounds,
  unscheduledKicker,
  unscheduledStops,
  UNSCHEDULED_KEY,
} from '../group';
import type { ItineraryItem } from '@/lib/types';

function item(partial: Partial<ItineraryItem> & { id: string }): ItineraryItem {
  return {
    tripId: 'trip-1',
    title: partial.id,
    description: null,
    location: null,
    startAt: null,
    endAt: null,
    status: 'planned',
    sortOrder: 0,
    createdBy: 'user-1',
    ...partial,
  };
}

describe('groupItineraryByDay', () => {
  it('groups by local day and sorts days ascending', () => {
    const sections = groupItineraryByDay([
      item({ id: 'b', startAt: '2026-10-13T09:30:00' }),
      item({ id: 'a', startAt: '2026-10-12T10:40:00' }),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-10-12', '2026-10-13']);
    expect(sections[0].title).toBe('Monday, October 12');
  });

  it('sorts items inside a day by time, then sortOrder', () => {
    const sections = groupItineraryByDay([
      item({ id: 'late', startAt: '2026-10-12T20:00:00' }),
      item({ id: 'early', startAt: '2026-10-12T10:40:00' }),
      item({ id: 'tie-2', startAt: '2026-10-12T15:00:00', sortOrder: 2 }),
      item({ id: 'tie-1', startAt: '2026-10-12T15:00:00', sortOrder: 1 }),
    ]);
    expect(sections[0].items.map((i) => i.id)).toEqual(['early', 'tie-1', 'tie-2', 'late']);
  });

  it('collects untimed items in a trailing Unscheduled section', () => {
    const sections = groupItineraryByDay([
      item({ id: 'untimed', startAt: null }),
      item({ id: 'timed', startAt: '2026-10-12T10:40:00' }),
    ]);
    expect(sections.at(-1)?.key).toBe(UNSCHEDULED_KEY);
    expect(sections.at(-1)?.items.map((i) => i.id)).toEqual(['untimed']);
  });

  it('returns no sections for an empty list', () => {
    expect(groupItineraryByDay([])).toEqual([]);
  });
});

describe('stopsToGo', () => {
  it('counts every stop that is not done, whatever its time', () => {
    const stops = [
      item({ id: 'overdue', startAt: '2026-10-12T08:00:00', status: 'planned' }),
      item({ id: 'confirmed', startAt: '2026-10-12T09:00:00', status: 'confirmed' }),
      item({ id: 'done', startAt: '2026-10-12T23:00:00', status: 'done' }),
    ];
    expect(stopsToGo(stops)).toBe(2);
  });

  it('is zero only when every stop is done', () => {
    expect(stopsToGo([item({ id: 'a', status: 'done' })])).toBe(0);
    expect(stopsToGo([])).toBe(0);
  });
});

describe('nextStop', () => {
  const now = new Date('2026-10-12T12:00:00');

  it('skips stops already marked done, even in the future', () => {
    const next = nextStop(
      [
        item({ id: 'done-later', startAt: '2026-10-12T13:00:00', status: 'done' }),
        item({ id: 'planned-later', startAt: '2026-10-12T15:00:00' }),
      ],
      now,
    );
    expect(next?.id).toBe('planned-later');
  });

  it('ignores overdue stops: they are not next', () => {
    expect(nextStop([item({ id: 'overdue', startAt: '2026-10-12T08:00:00' })], now)).toBeNull();
  });
});

describe('newItemStartAt', () => {
  it('prefills 10:00 on the selected local day, including a DST change day', () => {
    for (const day of ['2026-10-19', '2026-03-08', '2026-11-01']) {
      const date = new Date(newItemStartAt(day)!);
      const [year, month, number] = day.split('-').map(Number);
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([year, month, number]);
      expect([date.getHours(), date.getMinutes()]).toEqual([10, 0]);
    }
  });

  it('keeps ANY and undated trips unscheduled', () => {
    expect(newItemStartAt('ANY')).toBeNull();
    expect(newItemStartAt(null)).toBeNull();
  });

  it('rejects invalid date keys rather than rolling into another day', () => {
    expect(newItemStartAt('2026-02-30')).toBeNull();
    expect(newItemStartAt('2026-13-01')).toBeNull();
    expect(newItemStartAt('not a date')).toBeNull();
  });
});

describe('tripDayBounds', () => {
  it('runs from local midnight on the first day to the end of the last', () => {
    const bounds = tripDayBounds('2026-11-07', '2026-11-11');
    expect(bounds?.minimumDate).toEqual(new Date(2026, 10, 7, 0, 0, 0, 0));
    expect(bounds?.maximumDate).toEqual(new Date(2026, 10, 11, 23, 59, 59, 999));
  });

  it('lets an end run to the end of the day after the trip', () => {
    expect(tripDayBounds('2026-11-07', '2026-11-11')?.latestEnd).toEqual(new Date(2026, 10, 12, 23, 59, 59, 999));
    expect(tripDayBounds('2026-12-30', '2026-12-31')?.latestEnd).toEqual(new Date(2027, 0, 1, 23, 59, 59, 999));
  });

  it('allows a one-day trip its whole day', () => {
    const bounds = tripDayBounds('2026-11-07', '2026-11-07');
    expect(bounds?.minimumDate).toEqual(new Date(2026, 10, 7));
    expect(bounds?.maximumDate).toEqual(new Date(2026, 10, 7, 23, 59, 59, 999));
  });

  it('leaves undated, half-dated and backwards trips unconstrained', () => {
    expect(tripDayBounds(null, null)).toBeNull();
    expect(tripDayBounds('2026-11-07', null)).toBeNull();
    expect(tripDayBounds(null, '2026-11-11')).toBeNull();
    expect(tripDayBounds('2026-11-11', '2026-11-07')).toBeNull();
  });
});

describe('unscheduledStops', () => {
  const start = '2026-11-07';
  const end = '2026-11-11';

  it('collects stops dated outside the trip, so no stop is ever invisible', () => {
    const result = unscheduledStops(
      [
        item({ id: 'in', startAt: '2026-11-08T10:00:00' }),
        item({ id: 'after', startAt: '2026-11-14T09:00:00' }),
        item({ id: 'before', startAt: '2026-11-03T18:00:00' }),
      ],
      start,
      end,
    );
    expect(result.items.map((i) => i.id)).toEqual(['before', 'after']);
    expect([...result.outsideIds].sort()).toEqual(['after', 'before']);
    expect(result.kind).toBe('outside');
  });

  it('keeps the first and last days of the trip on their stamps, by local day', () => {
    const result = unscheduledStops(
      [
        item({ id: 'first-morning', startAt: '2026-11-07T00:00:00' }),
        item({ id: 'last-night', startAt: '2026-11-11T23:59:00' }),
        item({ id: 'eve', startAt: '2026-11-06T23:59:00' }),
        item({ id: 'day-after', startAt: '2026-11-12T00:00:00' }),
      ],
      start,
      end,
    );
    expect(result.items.map((i) => i.id)).toEqual(['eve', 'day-after']);
  });

  it('lists out-of-range stops by date, then untimed ones by their order', () => {
    const result = unscheduledStops(
      [
        item({ id: 'untimed-2', sortOrder: 2 }),
        item({ id: 'late', startAt: '2026-12-01T09:00:00', sortOrder: 0 }),
        item({ id: 'untimed-1', sortOrder: 1 }),
        item({ id: 'early', startAt: '2026-10-01T09:00:00', sortOrder: 5 }),
      ],
      start,
      end,
    );
    expect(result.items.map((i) => i.id)).toEqual(['early', 'late', 'untimed-1', 'untimed-2']);
    expect(result.outsideIds.has('untimed-1')).toBe(false);
    expect(result.kind).toBe('mixed');
  });

  it('holds only untimed stops when every dated stop is on a trip day', () => {
    const result = unscheduledStops(
      [item({ id: 'in', startAt: '2026-11-09T12:00:00' }), item({ id: 'any' })],
      start,
      end,
    );
    expect(result.items.map((i) => i.id)).toEqual(['any']);
    expect(result.kind).toBe('untimed');
  });

  it('is empty when every stop has a trip day', () => {
    const result = unscheduledStops([item({ id: 'in', startAt: '2026-11-09T12:00:00' })], start, end);
    expect(result.items).toEqual([]);
    expect(result.kind).toBeNull();
  });

  it('counts no stop as outside a trip without dates (it lists them all)', () => {
    const result = unscheduledStops(
      [item({ id: 'dated', startAt: '2026-11-09T12:00:00' }), item({ id: 'any' })],
      null,
      null,
    );
    expect(result.items.map((i) => i.id)).toEqual(['any']);
    expect(result.kind).toBe('untimed');
  });
});

describe('unscheduledKicker', () => {
  it('names what the trailing stamp holds', () => {
    expect(unscheduledKicker('untimed')).toBe('ANYTIME');
    expect(unscheduledKicker('outside')).toBe('OUTSIDE TRIP DATES');
    expect(unscheduledKicker('mixed')).toBe('ANYTIME · OTHER DAYS');
    expect(unscheduledKicker(null)).toBe('ANYTIME');
  });
});

describe('stopsLeavingDates', () => {
  const stops = [
    item({ id: 'd1', startAt: '2026-11-07T10:00:00' }),
    item({ id: 'd3', startAt: '2026-11-09T10:00:00' }),
    item({ id: 'd5', startAt: '2026-11-11T10:00:00' }),
    item({ id: 'already-out', startAt: '2026-11-20T10:00:00' }),
    item({ id: 'untimed' }),
  ];
  const trip = { startDate: '2026-11-07', endDate: '2026-11-11' };

  it('counts stops a shorter trip leaves off its days', () => {
    expect(stopsLeavingDates(stops, trip, { startDate: '2026-11-08', endDate: '2026-11-10' })).toBe(2);
  });

  it('does not count stops already outside, untimed ones, or unchanged dates', () => {
    expect(stopsLeavingDates(stops, trip, trip)).toBe(0);
    expect(stopsLeavingDates(stops, trip, { startDate: '2026-11-01', endDate: '2026-11-30' })).toBe(0);
  });

  it('counts dated stops an undated trip listed that the new dates leave out', () => {
    expect(
      stopsLeavingDates(stops, { startDate: null, endDate: null }, { startDate: '2026-11-09', endDate: '2026-11-09' }),
    ).toBe(3);
  });

  it('moves nothing when the dates are removed', () => {
    expect(stopsLeavingDates(stops, trip, { startDate: null, endDate: null })).toBe(0);
  });
});

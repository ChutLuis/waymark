import { describe, expect, it } from 'vitest';
import { groupItineraryByDay, newItemStartAt, nextStop, stopsToGo, UNSCHEDULED_KEY } from '../group';
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

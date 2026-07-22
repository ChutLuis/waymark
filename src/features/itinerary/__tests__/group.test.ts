import { describe, expect, it } from 'vitest';
import { groupItineraryByDay, UNSCHEDULED_KEY } from '../group';
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

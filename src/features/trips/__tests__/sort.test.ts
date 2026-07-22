import { describe, expect, it } from 'vitest';
import { daysUntilLabel, splitTrips } from '../sort';
import type { Trip } from '@/lib/types';

const TODAY = '2026-07-21';

function trip(partial: Partial<Trip> & { id: string }): Trip {
  return {
    name: partial.id,
    destination: null,
    startDate: null,
    endDate: null,
    coverImagePath: null,
    createdBy: 'u1',
    ...partial,
  };
}

describe('splitTrips', () => {
  it('separates past trips and keeps dateless trips current', () => {
    const { current, past } = splitTrips(
      [
        trip({ id: 'past', startDate: '2026-03-02', endDate: '2026-03-09' }),
        trip({ id: 'dateless' }),
        trip({ id: 'future', startDate: '2026-10-12', endDate: '2026-10-19' }),
      ],
      TODAY,
    );
    expect(current.map((t) => t.id)).toEqual(['future', 'dateless']);
    expect(past.map((t) => t.id)).toEqual(['past']);
  });

  it('keeps an in-progress trip current until its end date passes', () => {
    const { current } = splitTrips(
      [trip({ id: 'ongoing', startDate: '2026-07-15', endDate: '2026-07-25' })],
      TODAY,
    );
    expect(current.map((t) => t.id)).toEqual(['ongoing']);
  });

  it('sorts current by soonest start and past by most recent', () => {
    const { current, past } = splitTrips(
      [
        trip({ id: 'later', startDate: '2026-12-01' }),
        trip({ id: 'sooner', startDate: '2026-08-01' }),
        trip({ id: 'old', startDate: '2025-01-01', endDate: '2025-01-05' }),
        trip({ id: 'recent-past', startDate: '2026-06-01', endDate: '2026-06-08' }),
      ],
      TODAY,
    );
    expect(current.map((t) => t.id)).toEqual(['sooner', 'later']);
    expect(past.map((t) => t.id)).toEqual(['recent-past', 'old']);
  });
});

describe('daysUntilLabel', () => {
  it('counts down to the start date', () => {
    expect(daysUntilLabel('2026-10-12', TODAY)).toBe('in 83 days');
    expect(daysUntilLabel('2026-07-22', TODAY)).toBe('tomorrow');
    expect(daysUntilLabel('2026-07-21', TODAY)).toBe('today');
  });
  it('returns null once the start has passed', () => {
    expect(daysUntilLabel('2026-07-20', TODAY)).toBeNull();
  });
});

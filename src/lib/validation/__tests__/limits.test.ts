import { describe, expect, it } from 'vitest';
import { LIMITS, itineraryItemSchemaFor, noteSchema, packingItemSchema, tripSchema } from '../schemas';

const trip = { name: 'Lisbon', destination: 'Portugal', startDate: '2026-11-06', endDate: '2026-11-08' };

describe('tripSchema limits', () => {
  it('accepts a normal trip', () => {
    expect(tripSchema.safeParse(trip).success).toBe(true);
  });

  it('accepts a trip of exactly a year and refuses a longer one, like create_trip', () => {
    expect(tripSchema.safeParse({ ...trip, startDate: '2026-01-01', endDate: '2027-01-02' }).success).toBe(true);
    const tooLong = tripSchema.safeParse({ ...trip, startDate: '2026-01-01', endDate: '2027-01-03' });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe('A trip can be up to a year long');
  });

  it('refuses a name longer than the database allows', () => {
    expect(tripSchema.safeParse({ ...trip, name: 'x'.repeat(LIMITS.tripName) }).success).toBe(true);
    expect(tripSchema.safeParse({ ...trip, name: 'x'.repeat(LIMITS.tripName + 1) }).success).toBe(false);
  });
});

describe('content limits', () => {
  it('caps note bodies and packing quantities', () => {
    expect(noteSchema.safeParse({ body: 'x'.repeat(LIMITS.noteBody + 1), isPrivate: true }).success).toBe(false);
    expect(packingItemSchema.safeParse({ label: 'Tent', quantity: 1000, assignedTo: null }).success).toBe(false);
    expect(packingItemSchema.safeParse({ label: 'Tent', quantity: 999, assignedTo: null }).success).toBe(true);
  });
});

describe('itineraryItemSchemaFor', () => {
  const stop = {
    title: 'Louvre',
    description: '',
    location: '',
    startAt: '2026-11-08T10:00:00',
    endAt: '2026-11-08T12:00:00',
    status: 'planned' as const,
  };
  const range = { startDate: '2026-11-07', endDate: '2026-11-11' };

  it('accepts a stop on one of the trip days, and an untimed one', () => {
    expect(itineraryItemSchemaFor(range).safeParse(stop).success).toBe(true);
    expect(itineraryItemSchemaFor(range).safeParse({ ...stop, startAt: null, endAt: null }).success).toBe(true);
  });

  it('refuses a start or end outside the trip, on the field that is wrong', () => {
    const early = itineraryItemSchemaFor(range).safeParse({ ...stop, startAt: '2026-11-06T23:00:00' });
    expect(early.success).toBe(false);
    expect(early.error?.issues.map((i) => i.path.join('.'))).toEqual(['startAt']);
    expect(early.error?.issues[0].message).toBe('Pick a day within the trip (Nov 7 – 11)');

    const late = itineraryItemSchemaFor(range).safeParse({ ...stop, endAt: '2026-11-13T00:30:00' });
    expect(late.error?.issues.map((i) => i.path.join('.'))).toEqual(['endAt']);
    expect(late.error?.issues[0].message).toBe('End within the trip or the day after (Nov 7 – 12)');

    const lateStart = itineraryItemSchemaFor(range).safeParse({
      ...stop,
      startAt: '2026-11-12T09:00:00',
      endAt: '2026-11-12T10:00:00',
    });
    expect(lateStart.error?.issues.map((i) => i.path.join('.'))).toEqual(['startAt']);
  });

  it('lets a stop on the last evening end after midnight, until the end of the next day', () => {
    const overnight = { ...stop, startAt: '2026-11-11T22:00:00', endAt: '2026-11-12T01:30:00' };
    expect(itineraryItemSchemaFor(range).safeParse(overnight).success).toBe(true);
    expect(itineraryItemSchemaFor(range).safeParse({ ...overnight, endAt: '2026-11-12T23:59:00' }).success).toBe(true);
  });

  it('takes any date for a trip without dates', () => {
    expect(itineraryItemSchemaFor(null).safeParse({ ...stop, startAt: '2030-01-01T10:00:00', endAt: null }).success).toBe(
      true,
    );
  });
});

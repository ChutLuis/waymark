import { describe, expect, it } from 'vitest';
import { LIMITS, noteSchema, packingItemSchema, tripSchema } from '../schemas';

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

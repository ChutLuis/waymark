import { describe, expect, it } from 'vitest';
import {
  OFFLINE_MESSAGE,
  TripUnavailableError,
  failureMessage,
  isInvalidId,
  isNetworkError,
  retryTripLoad,
  serverMessage,
} from '../errors';

describe('isNetworkError', () => {
  it('recognises a fetch that never reached the server', () => {
    expect(isNetworkError({ message: 'TypeError: Network request failed', code: '' })).toBe(true);
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(true);
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
  });

  it('leaves server errors alone', () => {
    expect(isNetworkError({ code: 'P0001', message: 'invalid invite' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('serverMessage', () => {
  it('turns a raised message into a sentence', () => {
    expect(serverMessage({ code: 'P0001', message: 'trip owners cannot leave their own trip' })).toBe(
      'Trip owners cannot leave their own trip.',
    );
    expect(serverMessage({ code: 'P0001', message: 'Delete the trip instead!' })).toBe('Delete the trip instead!');
  });

  it("shows the database functions' own validation and refusal messages", () => {
    expect(serverMessage({ code: '22023', message: 'A trip can be up to a year long' })).toBe(
      'A trip can be up to a year long.',
    );
    expect(
      serverMessage({ code: '42501', message: "The trip owner can't leave the trip. Delete it instead." }),
    ).toBe("The trip owner can't leave the trip. Delete it instead.");
  });

  it('ignores messages not written for people', () => {
    expect(serverMessage({ code: '42501', message: 'permission denied for table trip_members' })).toBeNull();
    expect(
      serverMessage({ code: '42501', message: 'new row violates row-level security policy for table "trips"' }),
    ).toBeNull();
    expect(serverMessage({ code: '23514', message: 'new row for relation "trips" violates check constraint' })).toBeNull();
    expect(serverMessage({ code: 'P0001', message: '  ' })).toBeNull();
    expect(serverMessage(new Error('boom'))).toBeNull();
    expect(serverMessage('P0001')).toBeNull();
  });
});

describe('failureMessage', () => {
  const fallback = 'Couldn’t leave the trip. Try again.';

  it('reads a failed fetch as offline', () => {
    expect(failureMessage({ message: 'TypeError: Network request failed', code: '' }, fallback)).toBe(OFFLINE_MESSAGE);
  });

  it("shows the server's own words", () => {
    expect(failureMessage({ code: 'P0001', message: 'trip owners cannot leave' }, fallback)).toBe(
      'Trip owners cannot leave.',
    );
  });

  it('falls back for anything else', () => {
    expect(failureMessage({ code: '42501', message: 'permission denied for table trip_members' }, fallback)).toBe(
      fallback,
    );
    expect(failureMessage(new Error('boom'), fallback)).toBe(fallback);
    expect(failureMessage(null, fallback)).toBe(fallback);
  });
});

describe('retryTripLoad', () => {
  it('retries a failed load once', () => {
    const dropped = { message: 'TypeError: Network request failed', code: '' };
    expect(retryTripLoad(0, dropped)).toBe(true);
    expect(retryTripLoad(1, dropped)).toBe(false);
  });

  it('never retries a trip that is gone', () => {
    expect(retryTripLoad(0, new TripUnavailableError())).toBe(false);
    expect(isNetworkError(new TripUnavailableError())).toBe(false);
  });
});

describe('isInvalidId', () => {
  it('recognises an id Postgres refuses as a uuid', () => {
    expect(isInvalidId({ code: '22P02', message: 'invalid input syntax for type uuid: "undefined"' })).toBe(true);
    expect(isInvalidId({ code: 'PGRST116', message: 'no rows' })).toBe(false);
    expect(isInvalidId(null)).toBe(false);
  });
});

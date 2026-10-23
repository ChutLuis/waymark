import { describe, expect, it } from 'vitest';
import {
  OFFLINE_MESSAGE,
  RESET_COOLDOWN_MS,
  normalizeEmail,
  shouldSendReset,
  updatePasswordFailure,
} from '../passwordReset';

describe('shouldSendReset', () => {
  const now = 1_000_000;

  it('sends the first request for an email', () => {
    expect(shouldSendReset(undefined, now)).toBe(true);
  });

  it('holds a repeat inside the cooldown, which would kill the link on its way', () => {
    expect(shouldSendReset(now - 1, now)).toBe(false);
    expect(shouldSendReset(now - RESET_COOLDOWN_MS + 1, now)).toBe(false);
  });

  it('sends again once the cooldown has passed', () => {
    expect(shouldSendReset(now - RESET_COOLDOWN_MS, now)).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('treats case and stray spaces as the same address', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });
});

describe('updatePasswordFailure', () => {
  it('reports a dropped connection, whatever the error says', () => {
    expect(updatePasswordFailure({ code: 'same_password' }, true)).toEqual({
      message: OFFLINE_MESSAGE,
      expired: false,
    });
  });

  it('treats a missing or dead session as an expired link', () => {
    for (const error of [
      { name: 'AuthSessionMissingError' },
      { code: 'session_not_found' },
      { code: 'refresh_token_not_found' },
      { code: 'user_not_found' },
      { code: 'reauthentication_needed' },
    ]) {
      expect(updatePasswordFailure(error, false).expired).toBe(true);
    }
  });

  it('explains a reused or weak password without ending the session', () => {
    expect(updatePasswordFailure({ code: 'same_password' }, false)).toEqual({
      message: 'That’s the password you already have. Choose a new one.',
      expired: false,
    });
    expect(updatePasswordFailure({ code: 'weak_password' }, false).expired).toBe(false);
  });

  it('falls back to a plain retry message', () => {
    expect(updatePasswordFailure({ code: 'unexpected_failure' }, false)).toEqual({
      message: 'Couldn’t save your new password. Try again.',
      expired: false,
    });
  });
});

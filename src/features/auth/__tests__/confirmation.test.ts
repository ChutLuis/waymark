import { describe, expect, it } from 'vitest';
import { AuthApiError } from '@supabase/supabase-js';
import {
  CONFIRMATION_COOLDOWN_MS,
  RESEND_COOLDOWN_MESSAGE,
  RESEND_FAILURE_MESSAGE,
  isEmailNotConfirmed,
  isResendRateLimit,
  resendFailureMessage,
  shouldSendConfirmation,
} from '../confirmation';

describe('confirmation errors', () => {
  it('recognizes the auth-js email_not_confirmed code, not error text', () => {
    expect(isEmailNotConfirmed({ code: 'email_not_confirmed' })).toBe(true);
    expect(isEmailNotConfirmed(new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'))).toBe(true);
    expect(isEmailNotConfirmed({ message: 'Email not confirmed' })).toBe(false);
    expect(isEmailNotConfirmed({ code: 'invalid_credentials' })).toBe(false);
    expect(isEmailNotConfirmed(null)).toBe(false);
  });

  it('maps rate-limit codes and HTTP 429 to a friendly wait message', () => {
    for (const error of [{ code: 'over_email_send_rate_limit' }, { status: 429 }]) {
      expect(isResendRateLimit(error)).toBe(true);
      expect(resendFailureMessage(error)).toBe(RESEND_COOLDOWN_MESSAGE);
    }
  });

  it('does not show raw errors for other failures', () => {
    expect(resendFailureMessage(new Error('server details'))).toBe(RESEND_FAILURE_MESSAGE);
    expect(resendFailureMessage(null)).toBe(RESEND_FAILURE_MESSAGE);
    expect(isResendRateLimit({ status: 400 })).toBe(false);
  });
});

describe('confirmation resend cooldown', () => {
  const now = 1_000_000;

  it('allows a first request and waits a full minute after a prior request', () => {
    expect(shouldSendConfirmation(undefined, now)).toBe(true);
    expect(shouldSendConfirmation(now, now)).toBe(false);
    expect(shouldSendConfirmation(now - CONFIRMATION_COOLDOWN_MS + 1, now)).toBe(false);
    expect(shouldSendConfirmation(now - CONFIRMATION_COOLDOWN_MS, now)).toBe(true);
  });

  it('waits if the device clock moved backwards', () => {
    expect(shouldSendConfirmation(now + 1, now)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  callbackNext,
  codeFromParsedUrl,
  errorFromParsedUrl,
  isCallbackRoute,
  nextFromParsedUrl,
} from '../callbackUrl';

/**
 * These call shapes mirror what expo-linking's Linking.parse returns, so the
 * assertions cover the same inputs the app produces without needing
 * expo-linking (and its react-native dependency) at test time.
 */
const parsed = (path: string, hostname = '', queryParams: Record<string, string> = {}) => ({
  path,
  hostname,
  queryParams,
});

describe('isCallbackRoute', () => {
  it('accepts the triple-slash form Linking.createURL produces', () => {
    expect(isCallbackRoute(parsed('auth-callback'))).toBe(true);
  });

  it('accepts the host form, where the route name is the host', () => {
    expect(isCallbackRoute(parsed('', 'auth-callback'))).toBe(true);
  });

  it('tolerates a trailing slash', () => {
    expect(isCallbackRoute(parsed('auth-callback/'))).toBe(true);
  });

  it('rejects other routes', () => {
    expect(isCallbackRoute(parsed('join'))).toBe(false);
    expect(isCallbackRoute(parsed('auth-callback-extra'))).toBe(false);
    expect(isCallbackRoute(parsed(''))).toBe(false);
  });
});

describe('codeFromParsedUrl', () => {
  it('reads the PKCE code off a callback', () => {
    expect(codeFromParsedUrl(parsed('auth-callback', '', { code: 'abc123' }))).toBe('abc123');
  });

  it('ignores an invite deep link, which also carries ?code=', () => {
    expect(codeFromParsedUrl(parsed('join', '', { code: 'ABCD1234' }))).toBeNull();
  });

  it('returns null when the callback has no code', () => {
    expect(codeFromParsedUrl(parsed('auth-callback'))).toBeNull();
  });

  it('ignores a repeated ?code=, which arrives as an array', () => {
    expect(codeFromParsedUrl(parsed('auth-callback', '', { code: ['a', 'b'] as never }))).toBeNull();
  });
});

describe('errorFromParsedUrl', () => {
  it('reads the error Supabase sends for an expired link', () => {
    expect(errorFromParsedUrl(parsed('auth-callback', '', { error: 'access_denied', error_code: 'otp_expired' })))
      .toBe('otp_expired');
  });

  it('falls back to the plain error param', () => {
    expect(errorFromParsedUrl(parsed('auth-callback', '', { error: 'access_denied' }))).toBe('access_denied');
  });

  it('reports no error for a successful callback', () => {
    expect(errorFromParsedUrl(parsed('auth-callback', '', { code: 'abc123' }))).toBeNull();
  });

  it('reads the error off an expired reset link, which keeps its next param', () => {
    expect(
      errorFromParsedUrl(
        parsed('auth-callback', '', { error_code: 'otp_expired', next: 'reset-password' }),
      ),
    ).toBe('otp_expired');
  });
});

describe('password-reset callbacks', () => {
  // Supabase appends the code to the redirect's own query (keys sorted):
  // waymark-dev:///auth-callback?code=…&next=reset-password
  const resetLink = parsed('auth-callback', '', { code: 'pkce-code', next: 'reset-password' });

  it('still yields the PKCE code, so the shared exchange handles it', () => {
    expect(codeFromParsedUrl(resetLink)).toBe('pkce-code');
  });

  it('asks for the reset screen', () => {
    expect(nextFromParsedUrl(resetLink)).toBe('reset-password');
    expect(nextFromParsedUrl(parsed('', 'auth-callback', { code: 'x', next: 'reset-password' }))).toBe(
      'reset-password',
    );
  });

  it('lands a plain confirmation on the default route', () => {
    expect(nextFromParsedUrl(parsed('auth-callback', '', { code: 'abc123' }))).toBeNull();
  });

  it('ignores next on any other route', () => {
    expect(nextFromParsedUrl(parsed('join', '', { code: 'ABCD1234', next: 'reset-password' }))).toBeNull();
  });
});

describe('callbackNext', () => {
  it('accepts only known destinations', () => {
    expect(callbackNext('reset-password')).toBe('reset-password');
    expect(callbackNext('/profile')).toBeNull();
    expect(callbackNext('https://example.com')).toBeNull();
    expect(callbackNext(undefined)).toBeNull();
  });

  it('ignores a repeated key, which arrives as an array', () => {
    expect(callbackNext(['reset-password', 'reset-password'])).toBeNull();
  });
});
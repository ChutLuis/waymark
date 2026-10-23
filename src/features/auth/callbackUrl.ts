import type { ParsedURL } from 'expo-linking';

/**
 * Pure URL matching for the auth callback, split out from authDeepLink.ts so it
 * can be unit-tested without the Supabase client or expo-linking's runtime
 * (which pulls in react-native and cannot be parsed by Vitest).
 *
 * Every helper takes an already-parsed URL; callers do the `Linking.parse`.
 */

/** Path of the callback route; anything else in a deep link is not ours. */
export const CALLBACK_PATH = 'auth-callback';

/**
 * Where a callback goes once its code is exchanged. Email confirmations carry
 * none and land on Home; a password-reset link asks for the reset screen.
 * Supabase keeps the redirect's own query when it appends `code`, so the
 * value survives the round trip through the email.
 */
export const RESET_PASSWORD_NEXT = 'reset-password';

export type CallbackNext = typeof RESET_PASSWORD_NEXT;

/**
 * True when a parsed deep link points at the callback route. Accepts both
 * `scheme:///auth-callback` (what Linking.createURL produces for a build) and
 * `scheme://auth-callback`, where the route name arrives as the host instead of
 * the path. Trailing slashes are tolerated.
 */
export function isCallbackRoute(parsed: Pick<ParsedURL, 'path' | 'hostname'>): boolean {
  const path = (parsed.path ?? '').replace(/^\/+|\/+$/g, '');
  return (path || parsed.hostname || '') === CALLBACK_PATH;
}

/** The `code` carried by a parsed callback URL, or null if this is not one. */
export function codeFromParsedUrl(
  parsed: Pick<ParsedURL, 'path' | 'hostname' | 'queryParams'>,
): string | null {
  if (!isCallbackRoute(parsed)) return null;
  const code = parsed.queryParams?.code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

/** Supabase's error code when the user returns with an expired or used link. */
export function errorFromParsedUrl(
  parsed: Pick<ParsedURL, 'path' | 'hostname' | 'queryParams'>,
): string | null {
  if (!isCallbackRoute(parsed)) return null;
  const error = parsed.queryParams?.error_code ?? parsed.queryParams?.error;
  return typeof error === 'string' && error.length > 0 ? error : null;
}

/**
 * Reads a callback's `next` value (a route param or a parsed query value).
 * Only known destinations count; anything else, including a repeated key that
 * arrives as an array, means the default landing.
 */
export function callbackNext(value: unknown): CallbackNext | null {
  return value === RESET_PASSWORD_NEXT ? RESET_PASSWORD_NEXT : null;
}

/** The `next` destination of a parsed callback URL, or null. */
export function nextFromParsedUrl(
  parsed: Pick<ParsedURL, 'path' | 'hostname' | 'queryParams'>,
): CallbackNext | null {
  if (!isCallbackRoute(parsed)) return null;
  return callbackNext(parsed.queryParams?.next);
}

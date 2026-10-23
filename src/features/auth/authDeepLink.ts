import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase/client';
import { CALLBACK_PATH, RESET_PASSWORD_NEXT, codeFromParsedUrl } from './callbackUrl';
import { getLaunchUrl } from './launchUrl';

/**
 * The URL Supabase should send the user back to after they confirm their email.
 * It must be registered in the hosted project under Authentication → URL
 * Configuration → Redirect URLs, otherwise Supabase falls back to the site URL
 * and the app never sees the callback. Register the wildcard per variant
 * (`waymark-dev://**`, `waymark-test://**`, `waymark://**`) so the exact slash
 * form doesn't have to match, plus the web origin if web sign-up is used.
 *
 * The scheme is per-variant (app.config.ts), so a link sent to the test build
 * reopens the test build and not a development install.
 */
/**
 * Set when a password-reset link has just signed the person in, so the reset
 * screen only ever opens for that recovery session — not for any signed-in
 * session that reaches `/reset-password` by a link (the server doesn't ask for
 * the current password).
 */
let passwordRecovery = false;

export function markPasswordRecovery(): void {
  passwordRecovery = true;
}

export function isPasswordRecovery(): boolean {
  return passwordRecovery;
}

export function endPasswordRecovery(): void {
  passwordRecovery = false;
}

export function authRedirectUrl(): string {
  return Linking.createURL(`/${CALLBACK_PATH}`);
}

/**
 * Where a password-reset email sends the user: the same callback route, which
 * exchanges the code (signing them in with a recovery session) and then opens
 * the reset screen because of `next`. Covered by the same registered wildcards.
 */
export function passwordResetRedirectUrl(): string {
  return Linking.createURL(`/${CALLBACK_PATH}`, { queryParams: { next: RESET_PASSWORD_NEXT } });
}

/**
 * One exchange per code. A code can arrive twice — a cold start replays the
 * launch URL while expo-router also routes it — and re-exchanging fails with an
 * already-used-code error, so concurrent callers share one promise.
 *
 * Only successes are cached: Android keeps returning the launch URL for the
 * life of the process, so caching the success is what prevents a second
 * exchange. A failure is dropped so the user can retry a valid link after a
 * flaky network rather than being stuck with a cached `false`.
 */
const inflight = new Map<string, Promise<boolean>>();

/**
 * Exchanges a PKCE auth code for a session. The client uses
 * `flowType: 'pkce'` with `detectSessionInUrl: false` (lib/supabase/client.ts),
 * so supabase-js deliberately does NOT consume the callback itself — nothing
 * would establish a session without this. The verifier is stored through the
 * same SecureStore adapter, so the exchange can read it back.
 * `onAuthStateChange` in AuthContext then picks the session up.
 */
export function exchangeCode(code: string): Promise<boolean> {
  const existing = inflight.get(code);
  if (existing) return existing;
  const exchange = supabase.auth.exchangeCodeForSession(code).then(
    ({ error }) => {
      if (error) inflight.delete(code);
      return !error;
    },
    () => {
      // A SecureStore failure rejects rather than returning { error }; swallow
      // it so a background listener never surfaces an unhandled rejection.
      inflight.delete(code);
      return false;
    },
  );
  inflight.set(code, exchange);
  return exchange;
}

/** Exchanges the code carried by a callback URL, if it is one. */
function handleAuthCallbackUrl(url: string | null): Promise<boolean> {
  const code = url ? codeFromParsedUrl(Linking.parse(url)) : null;
  return code ? exchangeCode(code) : Promise.resolve(false);
}

/**
 * Watches for auth callbacks on cold start and on warm foreground, so a link
 * tapped while the app is backgrounded is handled without a relaunch. Returns a
 * cleanup function.
 *
 * This runs alongside expo-router's own routing, which lands the user on
 * app/auth-callback.tsx — that screen shows the waiting or expired state.
 */
export function watchAuthCallback(): () => void {
  // On web the launch URL is location.href, and a warm return is a real page
  // load, so the same listener works.
  getLaunchUrl().then(handleAuthCallbackUrl).catch(() => false);
  const sub = Linking.addEventListener('url', ({ url }) => {
    void handleAuthCallbackUrl(url);
  });
  return () => sub.remove();
}
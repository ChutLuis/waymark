import * as Linking from 'expo-linking';
import { sessionGate, supabase } from '@/lib/supabase/client';
import { sessionIdentityFromSession } from '@/lib/supabase/sessionGate';
import { CALLBACK_PATH, RESET_PASSWORD_NEXT, codeFromParsedUrl } from './callbackUrl';
import { getLaunchUrl } from './launchUrl';
import { recordNoticeSession } from './deletionNotice';
import { exchangeOnThisDevice } from './authExchange';
import { createExchangeCoordinator, finalizeAuthCallback, startPasswordRecovery, syncRecoveryIdentity, type ExchangeResult } from './recovery';

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
 * exchange. A failure is dropped rather than cached — but that does not make a
 * failed link retryable: auth-js deletes the PKCE code verifier on ANY exchange
 * failure, network errors included, so a link whose exchange failed is spent
 * and the person must request a new one. A refusal (a live session is stored)
 * is dropped too, so the link is reconsidered once that session is gone. A
 * successful result contains only coordination identity, never an auth token.
 */
const exchanges = createExchangeCoordinator((code) => exchangeOnThisDevice(code, {
  gate: sessionGate,
  exchangeCodeForSession: (c) => supabase.auth.exchangeCodeForSession(c),
  onEstablished: (identity) => {
    syncRecoveryIdentity(identity);
    recordNoticeSession();
  },
}));

/**
 * Exchanges a PKCE auth code for a session. The client uses
 * `flowType: 'pkce'` with `detectSessionInUrl: false` (lib/supabase/client.ts),
 * so supabase-js deliberately does NOT consume the callback itself — nothing
 * would establish a session without this. The verifier is stored through the
 * same SecureStore adapter, so the exchange can read it back.
 * `onAuthStateChange` in AuthContext then picks the session up.
 */
export function exchangeCode(code: string): Promise<ExchangeResult> {
  return exchanges.exchange(code);
}

/** Claim only after this exchange matches the reconciled session. */
export async function completeAuthCallback(code: string, result: ExchangeResult | null, session: unknown, reset: boolean, stillCurrent: () => boolean): Promise<'wait' | 'failed' | 'ready'> {
  return finalizeAuthCallback(code, result, sessionIdentityFromSession(session), reset, {
    isRetired: sessionGate.isRetired,
    stillCurrent,
    runExclusive: (fn) => sessionGate.runExclusive('maintain', fn),
    readIdentity: sessionGate.storedSessionIdentity,
    claim: exchanges.claim,
    startRecovery: (identity) => startPasswordRecovery(identity, sessionGate.isRetired),
  });
}

export function subscribeAuthRetirement(listener: () => void): () => void {
  return sessionGate.onRetire(() => listener());
}
export function isAuthIdentityRetired(userId: string): boolean {
  return sessionGate.isRetired(userId);
}

/** Exchanges the code carried by a callback URL, if it is one. */
function handleAuthCallbackUrl(url: string | null): Promise<ExchangeResult> {
  const code = url ? codeFromParsedUrl(Linking.parse(url)) : null;
  return code ? exchangeCode(code) : Promise.resolve({ kind: 'failed' });
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
  getLaunchUrl().then(handleAuthCallbackUrl).catch(() => ({ kind: 'failed' as const }));
  const sub = Linking.addEventListener('url', ({ url }) => {
    void handleAuthCallbackUrl(url);
  });
  return () => sub.remove();
}

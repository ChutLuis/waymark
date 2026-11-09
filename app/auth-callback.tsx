import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { completeAuthCallback, exchangeCode, isAuthIdentityRetired, subscribeAuthRetirement } from '@/features/auth/authDeepLink';
import type { ExchangeResult } from '@/features/auth/recovery';
import { RESET_PASSWORD_NEXT, callbackNext } from '@/features/auth/callbackUrl';
import { spacing, useTheme } from '@/theme';

/**
 * Lands here from an auth email link, e.g.
 * waymark-test:///auth-callback?code=…. expo-router routes the incoming URL to
 * this screen and its query becomes the route params; the PKCE code is
 * exchanged for a session, then the user is sent on:
 * - an email confirmation goes Home — a brand-new account has no profile row
 *   yet, so the (app) guard forwards them to onboarding;
 * - a password-reset link (`next=reset-password`) signs them in with a
 *   recovery session and opens the reset screen.
 *
 * Without this route the link landed on +not-found, which sits outside both the
 * (app) and (auth) groups, so no guard would move a freshly confirmed user.
 *
 * The exchange is shared with the root layout's watcher (single-flight), so a
 * warm-start link is handled whichever of the two sees it first.
 */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    next?: string;
  }>();

  // A repeated query key arrives as an array at runtime despite the annotation.
  const code = typeof params.code === 'string' ? params.code : undefined;
  const errorCodeParam = params.error_code ?? params.error;
  const errorCode = typeof errorCodeParam === 'string' ? errorCodeParam : null;
  const isReset = callbackNext(params.next) === RESET_PASSWORD_NEXT;
  const [exchange, setExchange] = useState<{ code: string; result: ExchangeResult } | null>(null);
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const [timedOutCode, setTimedOutCode] = useState<string | null>(null);
  const result = exchange && exchange.code === code ? exchange.result : null;
  const failed = failedCode === code;
  const timedOut = !!code && timedOutCode === code;
  const navigated = useRef(false);
  const retired = useSyncExternalStore(subscribeAuthRetirement,
    () => result?.kind === 'success' && isAuthIdentityRetired(result.identity.userId), () => false);

  // Nobody should stare at a spinner forever: a code that never settles (the
  // exchange hung, or the reconciler could not confirm it) gets its own state.
  // Keying the timer by code means a new link starts its own countdown.
  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => setTimedOutCode(code), 20_000);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    navigated.current = false;
    let cancelled = false;
    exchangeCode(code).then((exchange) => {
      if (cancelled) return;
      setExchange({ code, result: exchange });
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    // A refusal is final for this screen: it renders its own message and must
    // never fall through to the loading state.
    if (!code || !result || result.kind === 'signed-in' || errorCode || navigated.current) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled || navigated.current) return;
      const state = await completeAuthCallback(code, result, session, isReset, () => !cancelled && !navigated.current);
      if (cancelled) return;
      if (state === 'failed') setFailedCode(code);
      if (state === 'ready') {
        navigated.current = true;
        router.replace(isReset ? '/reset-password' as never : '/');
      }
    });
    return () => { cancelled = true; };
  }, [code, result, session, isReset, errorCode, retired, router]);

  // A link that arrived while a live session is stored is refused outright:
  // its code is still usable, but exchanging it here would replace the account
  // the person is using.
  if (result?.kind === 'signed-in') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          title="You’re already signed in"
          body={isReset
            ? 'This reset link can’t be used while you’re signed in. Sign out, then ask for a new link from the sign-in screen.'
            : 'This link can’t be used while you’re signed in. Sign out first if it was meant for another account.'}
          actionLabel="Go to your trips"
          onAction={() => router.replace('/')}
        />
      </View>
    );
  }

  // A callback with neither a code nor an error is a dead link (web bookmark,
  // or an email client that stripped the query), not a pending confirmation.
  if (failed || errorCode || !code) {
    if (isReset) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {session ? (
            <EmptyState
              title="That reset link has expired"
              body="Reset links only work once, and they expire. You're signed in, so there's nothing more to do."
              actionLabel="Go to your trips"
              onAction={() => router.replace('/')}
            />
          ) : (
            <EmptyState
              title="That reset link has expired"
              body="Reset links work once, and only on the device that asked for them. Ask for a new one and open it here."
              actionLabel="Request a new link"
              onAction={() => router.replace('/forgot-password' as never)}
            >
              <Button
                label="Back to sign in"
                variant="text"
                size="sm"
                onPress={() => router.replace('/sign-in')}
                style={{ marginTop: spacing.s3 }}
              />
            </EmptyState>
          )}
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          title="That link has expired"
          body="Confirmation links only work once, and they expire. Sign in with your email and password — if you already confirmed, you're all set."
          actionLabel="Back to sign in"
          onAction={() => router.replace('/sign-in')}
        />
      </View>
    );
  }

  // A code that never settled: the sign-in may well have worked, so send the
  // person to their trips rather than claiming a failure.
  if (timedOut) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState
          title="Couldn’t finish opening this link"
          body="Your sign-in may still have worked. Check your connection, then go to your trips."
          actionLabel="Go to your trips"
          onAction={() => router.replace('/')}
        >
          {!session ? (
            <Button
              label="Back to sign in"
              variant="text"
              size="sm"
              onPress={() => router.replace('/sign-in')}
              style={{ marginTop: spacing.s3 }}
            />
          ) : null}
        </EmptyState>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LoadingState message={isReset ? 'Opening your reset link…' : 'Confirming your email…'} />
    </View>
  );
}

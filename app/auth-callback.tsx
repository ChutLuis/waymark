import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { exchangeCode, markPasswordRecovery } from '@/features/auth/authDeepLink';
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    exchangeCode(code).then((ok) => {
      if (cancelled) return;
      if (!ok) setFailed(true);
      // Waits for this link's own exchange: a session that already existed
      // isn't the recovery session the reset needs.
      else if (isReset) {
        markPasswordRecovery();
        router.replace('/reset-password' as never);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, isReset, router]);

  // A live session — restored or freshly exchanged — means a confirmation
  // worked. Once the replace runs this screen unmounts, so there is no loop.
  if (session && !isReset) return <Redirect href="/" />;

  // Past the session check above, a callback with neither a code nor an error is
  // a dead link (web bookmark, an email client that stripped the query) — not a
  // pending confirmation.
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LoadingState message={isReset ? 'Opening your reset link…' : 'Confirming your email…'} />
    </View>
  );
}

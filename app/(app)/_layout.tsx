import type { ReactNode } from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useMyProfile } from '@/features/auth/hooks';
import { useTheme } from '@/theme';

/**
 * First-run users without a profile row are routed to onboarding before
 * they can reach anything else (PROF-1). The Redirect renders as a
 * sibling of the Stack — replacing the navigator with a Redirect whose
 * target lives inside it re-resolves navigation forever.
 */
function OnboardingGate({ children }: { children: ReactNode }) {
  const profile = useMyProfile();
  const pathname = usePathname();

  if (profile.isPending) return <LoadingState message="Getting your trips…" />;
  if (profile.isError) {
    return <ErrorState title="That didn't work" onRetry={() => profile.refetch()} />;
  }
  return (
    <>
      {profile.data === null && pathname !== '/onboarding' ? (
        <Redirect href="/onboarding" />
      ) : null}
      {children}
    </>
  );
}

export default function AppLayout() {
  const { colors } = useTheme();
  const { session, isRestoring } = useAuth();

  // Session restore happens before any authenticated UI shows (AUTH-3).
  if (isRestoring) return <LoadingState />;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <OnboardingGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface.bg },
        }}
      >
        {/* The create-trip sheet draws its own scrim over the list. */}
        <Stack.Screen
          name="trips/new"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </OnboardingGate>
  );
}

import type { ReactNode } from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useMyProfile } from '@/features/auth/hooks';
import { useReminderReconcile } from '@/features/reminders/hooks';
import { useTheme } from '@/theme';

/** Cancels reminders for trips the person can no longer open (left, removed, deleted). */
function ReminderReconcile() {
  useReminderReconcile();
  return null;
}

/**
 * First-run users without a profile row are routed to onboarding before
 * they can reach anything else (PROF-1). The Redirect renders as a
 * sibling of the Stack — replacing the navigator with a Redirect whose
 * target lives inside it re-resolves navigation forever.
 */
function OnboardingGate({ children }: { children: ReactNode }) {
  const profile = useMyProfile();
  const pathname = usePathname();

  if (profile.isPending) {
    // Nothing is cached across launches, so a cold start offline waits here
    // until the connection returns; say so rather than spin silently.
    return (
      <LoadingState
        message={
          profile.fetchStatus === 'paused'
            ? 'You’re offline. Your trips will load when you’re back online.'
            : 'Getting your trips…'
        }
      />
    );
  }
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
      <ReminderReconcile />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg, flex: 1, minHeight: 0 },
        }}
      >
        {/* The trip shell runs its own expand from the Home postcard (or a
            push) and collapse, over Home, which stays visible underneath. */}
        <Stack.Screen
          name="trips/[tripId]"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        {/* The shoebox album pushes and pops itself over Home, like the Trip page. */}
        <Stack.Screen
          name="shoebox"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
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

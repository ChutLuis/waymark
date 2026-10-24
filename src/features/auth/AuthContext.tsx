import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { endPersistedSession, purgePersistedQueries, removePersistedQueries } from '@/lib/query/persistence';
import { setQueryOwner } from '@/lib/query/queued';
import { clearPendingInviteCode } from '@/features/invites/pendingInvite';
import { purgeAllReminders, purgeUserReminders, setReminderUser } from '@/features/reminders/store';

interface AuthState {
  session: Session | null;
  /** Convenience accessor; null while signed out. */
  userId: string | null;
  /** True until the persisted session has been restored (AUTH-3). */
  isRestoring: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  userId: null,
  isRestoring: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();
  // Tracks whose data currently populates the cache so we can wipe it whenever
  // the signed-in user changes — not just on the manual Sign-Out button (A1).
  const cachedUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // An auth event carries a session at least as new as the restored one.
    let eventSeen = false;
    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!mounted) return;
        if (!eventSeen) {
          cachedUserId.current = data.session?.user.id ?? null;
          setQueryOwner(cachedUserId.current);
          setReminderUser(cachedUserId.current);
          setSession(data.session);
        }
        // Nobody signed in, and not because the network is down: the last
        // session was revoked or expired while the app was closed, so none of
        // that person's reminders may fire for whoever uses the device now.
        if (cachedUserId.current === null && !isAuthRetryableFetchError(error)) {
          void purgeAllReminders();
          void purgePersistedQueries(null);
        }
        setIsRestoring(false);
      },
      () => {
        // The stored session couldn't be read: continue signed out instead of
        // waiting forever.
        if (mounted) setIsRestoring(false);
      },
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      eventSeen = true;
      const nextUserId = next?.user.id ?? null;
      // A session ending any way (sign-out, token-refresh failure, remote
      // revocation, account deletion) or a different user signing in must not
      // leave the previous user's cached trips/notes readable (in memory or
      // stored), their queued writes waiting to be sent, their reminders
      // scheduled, or their stashed invite waiting — clear before the new user
      // reads.
      if (nextUserId !== cachedUserId.current) {
        const previousUserId = cachedUserId.current;
        // Stop storing first, so the cleared cache isn't written back, and
        // retire the previous account's queued writes: one still in flight or
        // waiting to retry refuses to run, or to touch the cache, from now on.
        endPersistedSession();
        setQueryOwner(nextUserId);
        queryClient.clear();
        cachedUserId.current = nextUserId;
        setReminderUser(nextUserId);
        if (previousUserId !== null) {
          void removePersistedQueries(previousUserId);
          void purgeUserReminders(previousUserId);
          clearPendingInviteCode();
        }
      }
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Token refresh should only tick while the app is foregrounded.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onChange = (state: string) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    onChange(AppState.currentState);
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, userId: session?.user.id ?? null, isRestoring }),
    [session, isRestoring],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** For code paths that only run inside the authenticated group. */
export function useRequiredUserId(): string {
  const { userId } = useAuth();
  if (!userId) throw new Error('useRequiredUserId called outside the authenticated area');
  return userId;
}

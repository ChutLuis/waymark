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
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

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
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      cachedUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setIsRestoring(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextUserId = next?.user.id ?? null;
      // A session ending any way (sign-out, token-refresh failure, remote
      // revocation) or a different user signing in must not leave the previous
      // user's cached trips/notes readable — clear before the new user reads.
      if (nextUserId !== cachedUserId.current) {
        queryClient.clear();
        cachedUserId.current = nextUserId;
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

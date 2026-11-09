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
import { type Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { sessionGate, supabase } from '@/lib/supabase/client';
import { sessionIdentityFromSession } from '@/lib/supabase/sessionGate';
import { endPersistedSession, purgePersistedQueries, removePersistedQueries } from '@/lib/query/persistence';
import { setQueryOwner } from '@/lib/query/queued';
import { clearPendingInviteCode } from '@/features/invites/pendingInvite';
import { purgeAllReminders, purgeUserReminders, setReminderUser } from '@/features/reminders/store';
import { clearDeletionNotice, getDeletionNotice, recordNoticeSession } from './deletionNotice';
import { alignVerifiedOwner, createSessionReconciler, quiesceAuthRuntime } from './sessionTransitions';
import { retireRecovery, syncRecoveryIdentity } from './recovery';

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

/**
 * The mounted reconciler, so a sign-out that ends the session outside the SDK
 * (expired token, offline) can still ask the provider to clear what the
 * previous account left behind. No-op until the provider mounts.
 */
let mountedReconcile: (() => void) | null = null;

export function reconcileAuthSession(): void {
  mountedReconcile?.();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();
  // Tracks whose data currently populates the cache so we can wipe it whenever
  // the signed-in user changes — not just on the manual Sign-Out button (A1).
  const cachedUserId = useRef<string | null>(null);

  useEffect(() => {
    // A provider remount can inherit module-scoped queued-write ownership.
    // Quiesce memory immediately, but leave offline storage alone until a
    // successful session read proves it safe to purge.
    quiesceAuthRuntime({
      endPersistence: endPersistedSession, setOwner: setQueryOwner,
      setReminderOwner: setReminderUser, clearCache: () => queryClient.clear(),
    });
    let firstRestore = true;
    const reconciler = createSessionReconciler<Session>({
      readSession: async () => {
        const { data, error } = await supabase.auth.getSession();
        return { session: data.session, error };
      },
      readIdentity: sessionGate.storedSessionIdentity,
      isRetired: sessionGate.isRetired,
      currentUser: () => cachedUserId.current,
      apply: (next) => {
        const nextUserId = next?.user.id ?? null;
        // A session ending or another user signing in must not leave the
        // previous account's cache, queued writes or reminders readable.
        if (nextUserId !== cachedUserId.current) {
          const previousUserId = cachedUserId.current;
          if (nextUserId) recordNoticeSession();
          // Stop persistence before clearing and retire the old queued writes.
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
        alignVerifiedOwner(nextUserId, { setOwner: setQueryOwner, setReminderOwner: setReminderUser });
        syncRecoveryIdentity(sessionIdentityFromSession(next));
        if (nextUserId && getDeletionNotice()?.ownerId !== nextUserId) clearDeletionNotice();
        setSession(next);
      },
      ready: (verifiedEmpty) => {
        // A failed read is not proof of an empty session; retry this purge when
        // a later successful read establishes who is signed in.
        if (firstRestore && (verifiedEmpty || cachedUserId.current !== null)) {
          firstRestore = false;
          if (verifiedEmpty && cachedUserId.current === null) {
            void purgeAllReminders();
            void purgePersistedQueries(null);
          }
        }
        setIsRestoring(false);
      },
      // An unusable stored value would otherwise mask the truth forever.
      removeCorrupt: () => sessionGate.removeSessionIf({ corrupt: true }),
    });
    const unsubscribeRetirement = sessionGate.onRetire((id) => { retireRecovery(id); reconciler.retire(id); });
    mountedReconcile = reconciler.reconcile;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // SDK awaits subscribers: schedule the read, never await it here.
      reconciler.reconcile();
    });
    reconciler.reconcile();
    return () => {
      if (mountedReconcile === reconciler.reconcile) mountedReconcile = null;
      reconciler.dispose();
      unsubscribeRetirement();
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Token refresh should only tick while the app is foregrounded.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onChange = (state: string) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        // Coming back to the foreground is a free chance to catch up on a read
        // that failed while the device was asleep or offline.
        reconcileAuthSession();
      } else {
        supabase.auth.stopAutoRefresh();
      }
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

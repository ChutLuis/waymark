import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError, isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { sessionGate, supabase } from '@/lib/supabase/client';
import { isSessionGateError, sessionIdentityFromSession, type SessionIdentity } from '@/lib/supabase/sessionGate';
import { removePersistedQueries } from '@/lib/query/persistence';
import { PROFILE_SELECT } from '@/lib/supabase/selects';
import { uploadImage } from '@/lib/supabase/storage';
import type { PickedImage } from '@/lib/images';
import type { Profile } from '@/lib/types';
import { clearPendingInviteCode } from '@/features/invites/pendingInvite';
import { purgeUserReminders } from '@/features/reminders/store';
import { isCurrentOwner } from '@/lib/query/owner';
import { useAuth, reconcileAuthSession } from './AuthContext';
import { authRedirectUrl, passwordResetRedirectUrl } from './authDeepLink';
import { isResendRateLimit, RESEND_COOLDOWN_MESSAGE, shouldSendConfirmation } from './confirmation';
import { classifyAccountDeletion, finishAccountDeletion } from './deleteAccount';
import { getNoticeGeneration, isNoticeGenerationCurrent, recordNoticeSession, startDeletionNotice, updateDeletionNotice } from './deletionNotice';
import { runForAccount } from './sessionTransitions';
import { signOutAccount } from './signOut';
import { recoveryAuthorized, sameIdentity, syncRecoveryIdentity } from './recovery';
import {
  OFFLINE_MESSAGE,
  normalizeEmail,
  shouldSendReset,
  updatePasswordFailure,
  type PasswordUpdateFailure,
} from './passwordReset';

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Auth actions run at once, even offline: by default TanStack would hold them
 * until the connection returns, leaving the button spinning with no word of
 * why. Failing fast is what lets sign-out end the session on this device even
 * when the server can't be reached.
 */
const AUTH_NETWORK_MODE = 'always';

export function useSignIn() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email, password }: Credentials) => {
      const { error } = await sessionGate.runExclusive('establish', async () => {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (!result.error && result.data.session) {
          syncRecoveryIdentity(sessionIdentityFromSession(result.data.session));
          recordNoticeSession();
        }
        return result;
      });
      if (error) throw error;
    },
  });
}

export interface SignUpResult {
  /** False when email confirmation is required before a session exists. */
  hasSession: boolean;
}

/** Shared across both screens; a rejected resend can discard the PKCE verifier. */
const confirmationRequestedAt = new Map<string, number>();

export function useSignUp() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email, password }: Credentials): Promise<SignUpResult> => {
      const { data, error } = await sessionGate.runExclusive('establish', async () => {
        const result = await supabase.auth.signUp({
          email,
          password,
          // Return confirmation links to this build's callback route.
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (!result.error && result.data.session) {
          syncRecoveryIdentity(sessionIdentityFromSession(result.data.session));
          recordNoticeSession();
        }
        if (!result.error && !result.data.session) confirmationRequestedAt.set(normalizeEmail(email), Date.now());
        return result;
      });
      if (error) throw error;
      return { hasSession: data.session !== null };
    },
  });
}

export function useResendConfirmation() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email }: { email: string }): Promise<void> => {
      const key = normalizeEmail(email);
      await sessionGate.runExclusive('maintain', async () => {
        if (!shouldSendConfirmation(confirmationRequestedAt.get(key), Date.now())) {
          throw Object.assign(new Error(RESEND_COOLDOWN_MESSAGE), { code: 'over_email_send_rate_limit' });
        }
        // auth-js GoTrueClient.ts:2673–2690 creates and sends a PKCE challenge;
        // helpers.ts:309–315 stores its verifier, replacing the previous one.
        const { error } = await supabase.auth.resend({
          type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) {
          if (isResendRateLimit(error)) confirmationRequestedAt.set(key, Date.now());
          throw error;
        }
        confirmationRequestedAt.set(key, Date.now());
      });
    },
  });
}

/**
 * Clears what a signed-in person leaves on this device besides the session:
 * their scheduled and delivered reminders, and a stashed invite code.
 * AuthContext repeats this whenever a session ends; doing it here first means
 * it's finished before the screen changes.
 */
async function clearDeviceTraces(userId: string | null): Promise<void> {
  if (userId) await purgeUserReminders(userId);
  clearPendingInviteCode();
}

export function useSignOut() {
  const { session } = useAuth();
  const actor = sessionIdentityFromSession(session);
  const mutation = useMutation({
    networkMode: AUTH_NETWORK_MODE,
    // Ending the session on this device must not depend on the server: the
    // SDK's sign-out keeps an expired session when it can't refresh, so
    // signOutAccount removes it directly. The cache is AuthContext's job —
    // it clears on SIGNED_OUT and on the reconcile this requests.
    mutationFn: async (captured: SessionIdentity | null) =>
      signOutAccount(captured, {
        gate: sessionGate,
        isOnline: () => onlineManager.isOnline(),
        clearDeviceTraces,
        signOut: (options) => supabase.auth.signOut(options),
        reconcile: reconcileAuthSession,
      }),
  });
  return {
    ...mutation,
    mutate: (_variables?: void, options?: Parameters<typeof mutation.mutate>[1]) => mutation.mutate(actor, options),
    mutateAsync: (_variables?: void, options?: Parameters<typeof mutation.mutateAsync>[1]) => mutation.mutateAsync(actor, options),
  };
}

export const DELETE_ACCOUNT_FAILED_MESSAGE =
  'We couldn’t confirm whether your account was deleted. Your trips may have changed. Check your connection and try again.';

/** The handover had already run: trips are handed over or deleted, the account isn't gone yet. */
export const DELETE_ACCOUNT_UNFINISHED_MESSAGE =
  'Your account is partly deleted: your trips have been handed over or removed. Tap Delete account again to finish.';

/**
 * Deletes the account through the delete-account Edge Function (the auth user
 * can only be deleted with the service role). The function is resumable: on
 * uncertain outcomes keep a retry message on the Profile sheet, including a
 * distinct message when the trips were already handed over. Device cleanup
 * is attempted only once the account is confirmed deleted or absent.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { userId, session } = useAuth();
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async (): Promise<void> => {
      const ownerId = userId;
      const actor = sessionIdentityFromSession(session);
      if (!ownerId || !actor || actor.userId !== ownerId || !session?.access_token) {
        throw new Error('Please sign in again before trying to delete your account.');
      }
      const noticeGeneration = getNoticeGeneration();
      const outcome = await classifyAccountDeletion(ownerId, session.access_token, {
        isCurrent: () => isCurrentOwner(ownerId),
        invoke: (accessToken) => supabase.functions.invoke('delete-account', {
          method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
        }),
        httpStatus: (error) => error instanceof FunctionsHttpError ? error.context.status : null,
        errorBody: async (error) => error instanceof FunctionsHttpError ? error.context.clone().json() : null,
        getUser: async () => runForAccount(sessionGate, actor, async () => {
          const { data, error } = await supabase.auth.getUser(session.access_token);
          return { userId: data.user?.id ?? null, userNotFound: isAuthApiError(error) && error.code === 'user_not_found' };
        }),
      });
      if (outcome !== 'confirmed' && outcome !== 'absent') {
        if (isCurrentOwner(ownerId)) {
          const current = await sessionGate.storedSessionIdentity().catch(() => null);
          if (current?.kind === 'present' && sameIdentity(current.identity, actor) && isCurrentOwner(ownerId)) {
            void queryClient.invalidateQueries({ predicate: (query) =>
              ['trips', 'trip', 'itinerary', 'notes', 'packing'].includes(String(query.queryKey[0])) });
          }
        }
        if (outcome === 'partial') throw new Error(DELETE_ACCOUNT_UNFINISHED_MESSAGE);
        if (outcome === 'unauthorized') throw new Error('Couldn’t authorize deletion. Sign in again and check your account before retrying.');
        throw new Error(DELETE_ACCOUNT_FAILED_MESSAGE);
      }
      await finishAccountDeletion(ownerId, outcome, {
        wasActive: (id) => isCurrentOwner(id) && isNoticeGenerationCurrent(noticeGeneration),
        retire: sessionGate.retire,
        runExclusive: (fn) => sessionGate.runExclusive('maintain', fn),
        readIdentity: sessionGate.storedSessionIdentity,
        signOut: () => supabase.auth.signOut({ scope: 'local' }),
        removeSessionIf: (id) => sessionGate.removeSessionIf({ userId: id }),
        purgeReminders: purgeUserReminders,
        removePersisted: removePersistedQueries,
        isBusy: (error) => isSessionGateError(error) && error.reason === 'busy',
        startNotice: startDeletionNotice,
        updateNotice: updateDeletionNotice,
      });
    },
  });
}

/** Last reset request per address, so a quick repeat doesn't kill the link on its way. */
const resetRequestedAt = new Map<string, number>();

/**
 * Emails a password-reset link that opens this app (PKCE: it works on the
 * device that asked for it). Only a failure to reach the server is reported.
 * Any answer from it, including the rate limit only an existing account can
 * hit, ends in the same neutral confirmation, so the screen never reveals
 * which emails have accounts.
 */
export function useRequestPasswordReset() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email }: { email: string }): Promise<void> => {
      const key = normalizeEmail(email);
      if (!shouldSendReset(resetRequestedAt.get(key), Date.now())) return;
      const { error } = await sessionGate.runExclusive('maintain', () => supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetRedirectUrl(),
      }));
      if (isSessionGateError(error)) throw error;
      if (error && isAuthRetryableFetchError(error)) throw new Error(OFFLINE_MESSAGE);
      resetRequestedAt.set(key, Date.now());
    },
  });
}

/** Thrown by useUpdatePassword with a message for the reset screen. */
export class PasswordUpdateError extends Error {
  readonly expired: boolean;

  constructor({ message, expired }: PasswordUpdateFailure) {
    super(message);
    this.name = 'PasswordUpdateError';
    this.expired = expired;
  }
}

/** Sets a new password for the signed-in (usually recovery) session. */
export function useUpdatePassword() {
  const { session } = useAuth();
  const actor = sessionIdentityFromSession(session);
  const mutation = useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ password, captured }: { password: string; captured: SessionIdentity | null }): Promise<void> => {
      const { error } = await runForAccount(sessionGate, captured, () => {
        if (!recoveryAuthorized(captured, sessionGate.isRetired)) throw new Error('Your reset link has expired. Request a new one.');
        return supabase.auth.updateUser({ password });
      });
      if (error) {
        if (isSessionGateError(error)) throw new PasswordUpdateError({ message: error.message, expired: false });
        throw new PasswordUpdateError(updatePasswordFailure(error, isAuthRetryableFetchError(error)));
      }
    },
  });
  return {
    ...mutation,
    mutate: (input: { password: string }, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate({ ...input, captured: actor }, options),
    mutateAsync: (input: { password: string }, options?: Parameters<typeof mutation.mutateAsync>[1]) =>
      mutation.mutateAsync({ ...input, captured: actor }, options),
  };
}

export const profileKeys = {
  me: (userId: string | null) => ['profile', 'me', userId] as const,
};

/** The signed-in user's profile row; null when onboarding hasn't run yet. */
export function useMyProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: profileKeys.me(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Uploads to avatars/{user_id}/… — the exact path shape the storage RLS
 * policy checks — and returns the stored object path.
 */
export function useUploadAvatar() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (image: PickedImage): Promise<string> => {
      if (!userId) throw new Error('Not signed in');
      const path = `${userId}/avatar-${Date.now()}.${image.extension}`;
      return uploadImage('avatars', path, image.uri, image.contentType);
    },
  });
}

export function useUpsertProfile() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      displayName: string;
      avatarPath?: string | null;
    }): Promise<Profile> => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: input.displayName,
          ...(input.avatarPath !== undefined ? { avatar_path: input.avatarPath } : {}),
        })
        .select(PROFILE_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => {
      // Written synchronously so the onboarding gate sees the new profile
      // before the screen navigates away — no stale-null redirect bounce.
      queryClient.setQueryData(profileKeys.me(userId), profile);
      // Names/avatars surface on the trips list and member lists — refresh just
      // those, not every trip's detail query (which carries no profile data).
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'trip' && query.queryKey[2] === 'members',
      });
    },
  });
}

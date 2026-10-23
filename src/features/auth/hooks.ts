import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError, isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { PROFILE_SELECT } from '@/lib/supabase/selects';
import { uploadImage } from '@/lib/supabase/storage';
import type { PickedImage } from '@/lib/images';
import type { Profile } from '@/lib/types';
import { clearPendingInviteCode } from '@/features/invites/pendingInvite';
import { purgeUserReminders } from '@/features/reminders/store';
import { useAuth } from './AuthContext';
import { authRedirectUrl, passwordResetRedirectUrl } from './authDeepLink';
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
 * Auth actions run (or fail) at once, even offline: by default TanStack would
 * hold them until the connection returns, leaving the button spinning with no
 * word of why. Signing out then still ends the session on this device.
 */
const AUTH_NETWORK_MODE = 'always';

export function useSignIn() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email, password }: Credentials) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
  });
}

export interface SignUpResult {
  /** False when email confirmation is required before a session exists. */
  hasSession: boolean;
}

export function useSignUp() {
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ email, password }: Credentials): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // When the project requires email confirmation, the link must come back
        // into this app rather than the Supabase site URL; the callback route
        // exchanges the code it carries for a session (authDeepLink.ts).
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      return { hasSession: data.session !== null };
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
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async () => {
      await clearDeviceTraces(userId);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // No authenticated data may remain readable after sign-out (AUTH-2).
    onSettled: () => queryClient.clear(),
  });
}

export const DELETE_ACCOUNT_FAILED_MESSAGE =
  'We couldn’t delete your account. Nothing changed — try again in a moment.';

/** The handover had already run: trips are handed over or deleted, the account isn't gone yet. */
export const DELETE_ACCOUNT_UNFINISHED_MESSAGE =
  'Your account is partly deleted: your trips have been handed over or removed. Tap Delete account again to finish.';

/** Whether the function failed after its handover committed (it says so in `stage`). */
async function failedAfterHandover(error: unknown): Promise<boolean> {
  if (!(error instanceof FunctionsHttpError)) return false;
  try {
    const body = (await (error.context as Response).clone().json()) as { stage?: unknown };
    return body.stage === 'after_prepare';
  } catch {
    return false;
  }
}

/**
 * A retry after the success response was lost: the function can't verify a
 * user who no longer exists and answers 401. Asking the auth server tells that
 * apart from a real failure.
 */
async function deletionAlreadyFinished(error: unknown): Promise<boolean> {
  if (!(error instanceof FunctionsHttpError) || error.context?.status !== 401) return false;
  const { error: userError } = await supabase.auth.getUser();
  return isAuthApiError(userError) && userError.code === 'user_not_found';
}

/**
 * Deletes the account through the delete-account Edge Function (the auth user
 * can only be deleted with the service role). The function is resumable: on
 * any failure it answers with a generic error and the person can simply retry,
 * so a failure leaves the session alone and throws a message the Profile sheet
 * shows as is — saying so when the trips were already handed over. Only after
 * success is the device cleared.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error && !(await deletionAlreadyFinished(error).catch(() => false))) {
        if (await failedAfterHandover(error)) {
          // The trips list on screen is stale: refetch it before the person retries.
          void queryClient.invalidateQueries({ queryKey: ['trips'] });
          throw new Error(DELETE_ACCOUNT_UNFINISHED_MESSAGE);
        }
        throw new Error(DELETE_ACCOUNT_FAILED_MESSAGE);
      }
      // The account is gone on the server; nothing of it may stay here.
      await clearDeviceTraces(userId);
      // Local scope: there is no server session left to revoke. supabase-js
      // removes the stored session even when the request itself fails.
      await supabase.auth.signOut({ scope: 'local' });
    },
    onSuccess: () => queryClient.clear(),
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetRedirectUrl(),
      });
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
  return useMutation({
    networkMode: AUTH_NETWORK_MODE,
    mutationFn: async ({ password }: { password: string }): Promise<void> => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw new PasswordUpdateError(updatePasswordFailure(error, isAuthRetryableFetchError(error)));
      }
    },
  });
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { PROFILE_SELECT } from '@/lib/supabase/selects';
import { uploadImage } from '@/lib/supabase/storage';
import type { PickedImage } from '@/lib/images';
import type { Profile } from '@/lib/types';
import { useAuth } from './AuthContext';

export interface Credentials {
  email: string;
  password: string;
}

export function useSignIn() {
  return useMutation({
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
    mutationFn: async ({ email, password }: Credentials): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { hasSession: data.session !== null };
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    // No authenticated data may remain readable after sign-out (AUTH-2).
    onSettled: () => queryClient.clear(),
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

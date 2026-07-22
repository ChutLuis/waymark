import { useQuery } from '@tanstack/react-query';
import { supabase } from './client';

export type StorageBucket = 'trip-covers' | 'avatars';

// A signed URL stays valid for its full TTL even after the viewer loses trip
// access, so this is a deliberate exposure window. Kept at 1h: these URLs only
// front cover/avatar images (no private text), the risk is a stale image
// lingering in a cache, and a shorter TTL would mean far more re-signing on
// scroll. Revisit if signed URLs ever front anything sensitive. (A3)
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Buckets are private; objects render through short-lived signed URLs.
 * Object paths must keep the RLS-enforced shape: the first folder is the
 * owning trip id (trip-covers) or user id (avatars).
 */
export function useSignedUrl(bucket: StorageBucket, path: string | null) {
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: path !== null,
    staleTime: (SIGNED_URL_TTL_SECONDS - 300) * 1000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Uploads and returns the stored object path. */
export async function uploadImage(
  bucket: StorageBucket,
  path: string,
  localUri: string,
  contentType: string,
): Promise<string> {
  const response = await fetch(localUri);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

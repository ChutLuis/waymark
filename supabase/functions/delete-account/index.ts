// Deletes the calling user's account.
//
// The client can't delete an auth user, so this runs with the service role:
//   1. delete_account_prepare() hands each trip the user owns to its
//      earliest-joined co-member (or deletes it when they are alone), moves
//      covers they uploaded to trips that live on over to each trip's owner,
//      and removes their memberships. It is idempotent and remembers the
//      trips it deleted, so a retry after a failure picks up where it left.
//   2. Every object still tied to the user (account_storage_objects: their
//      avatars, the covers of their deleted trips, anything else they own) is
//      removed through the Storage API, page by page, and checked to be gone.
//   3. Only then is the auth user deleted, which cascades the rest (profile,
//      notes, invites). trips.created_by refuses the delete if a trip were
//      somehow still owned, so a shared trip can never cascade away.
// Any failure returns a generic error code; the client can simply retry.
//
// Auth: the caller's JWT is verified; only that user is deleted. Never trust a
// user id from the request body.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Storage removes at most this many paths per call. */
const REMOVE_BATCH = 100;
/**
 * The listing RPC returns at most the API's max_rows (1000) per call, so
 * cleanup lists and removes in rounds until nothing is left.
 */
const MAX_ROUNDS = 20;

interface StorageObjectRef {
  bucket_id: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    console.error('delete-account: missing function environment');
    return json({ error: 'server_misconfigured' }, 500);
  }

  // Identify the caller from their own token (anon client, not service role).
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return json({ error: 'unauthorized' }, 401);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: prepareError } = await admin.rpc('delete_account_prepare', { _user_id: userId });
  if (prepareError) {
    console.error('delete-account: prepare failed', prepareError.message);
    return json({ error: 'prepare_failed' }, 500);
  }

  // From here on the handover has committed: the user's trips are already
  // handed over or deleted, so a failure says so (`stage`) and a retry finishes.
  try {
    await removeAccountObjects(admin, userId);
  } catch (error) {
    console.error('delete-account: storage cleanup failed', error instanceof Error ? error.message : error);
    return json({ error: 'cleanup_incomplete', stage: 'after_prepare' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('delete-account: auth delete failed', deleteError.message);
    return json({ error: 'delete_failed', stage: 'after_prepare' }, 500);
  }

  return json({ ok: true }, 200);
});

/**
 * Removes every object account_storage_objects() lists for the user, in
 * rounds, until the list comes back empty. Throws when a removal fails or
 * objects remain, so the caller reports a retryable failure instead of
 * deleting the user over leftovers.
 */
async function removeAccountObjects(admin: SupabaseClient, userId: string): Promise<void> {
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const objects = await listAccountObjects(admin, userId);
    if (objects.length === 0) return;

    const byBucket = new Map<string, string[]>();
    for (const object of objects) {
      const paths = byBucket.get(object.bucket_id) ?? [];
      paths.push(object.name);
      byBucket.set(object.bucket_id, paths);
    }
    for (const [bucket, paths] of byBucket) {
      for (let start = 0; start < paths.length; start += REMOVE_BATCH) {
        const batch = paths.slice(start, start + REMOVE_BATCH);
        const { error } = await admin.storage.from(bucket).remove(batch);
        if (error) throw new Error(`remove from ${bucket}: ${error.message}`);
      }
    }
  }
  const left = await listAccountObjects(admin, userId);
  if (left.length > 0) {
    throw new Error(`${left.length} object(s) still tied to the account`);
  }
}

async function listAccountObjects(admin: SupabaseClient, userId: string): Promise<StorageObjectRef[]> {
  const { data, error } = await admin.rpc('account_storage_objects', { _user_id: userId });
  if (error) throw new Error(`list objects: ${error.message}`);
  return (data as StorageObjectRef[] | null) ?? [];
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

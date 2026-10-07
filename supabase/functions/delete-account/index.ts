// Deletes the calling user's account.
//
// The client can't delete an auth user, so this runs with the service role.
// It first calls delete_account_prepare() to hand over any trips the user owns
// to their earliest-joined co-member (or delete ownerless trips), then removes
// the auth user, which cascades the rest (profile, memberships, authored rows).
//
// Auth: the caller's JWT is verified; only that user is deleted. Never trust a
// user id from the request body.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const admin = createClient(url, serviceKey);

  // Hand over / delete owned trips before the auth row disappears.
  const { error: prepareError } = await admin.rpc('delete_account_prepare', {
    _user_id: userId,
  });
  if (prepareError) {
    return json({ error: 'prepare_failed', detail: prepareError.message }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json({ error: 'delete_failed', detail: deleteError.message }, 500);
  }

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
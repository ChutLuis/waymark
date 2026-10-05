-- =====================================================================
-- F1 follow-up: revoke helper execute from anon explicitly.
-- =====================================================================
-- The 20260722040128 hardening revoked EXECUTE from PUBLIC only, but Supabase's
-- default grants give `anon` EXECUTE on functions in the public schema directly,
-- so `is_trip_member`/`is_trip_owner` stayed callable as PostgREST RPCs by anon.
-- This revokes from anon too, keeping the grant to authenticated that RLS policy
-- evaluation needs. No table RLS is touched.
-- =====================================================================

revoke execute on function is_trip_member(uuid) from anon, public;
revoke execute on function is_trip_owner(uuid)  from anon, public;
grant  execute on function is_trip_member(uuid) to authenticated;
grant  execute on function is_trip_owner(uuid)  to authenticated;
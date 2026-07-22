-- Waymark: widen avatar reads to trip-mates (F7) + harden membership-helper grants (F1).
-- New migration; does NOT modify 20260721145016_init_schema.sql.

-- F1: the membership helpers are internal plumbing for RLS policies, not a public
-- API. Remove the default PUBLIC execute grant (which let anon call them as a
-- PostgREST RPC) and grant only to authenticated, which policy evaluation needs.
revoke execute on function is_trip_member(uuid) from public;
revoke execute on function is_trip_owner(uuid)  from public;
grant  execute on function is_trip_member(uuid) to authenticated;
grant  execute on function is_trip_owner(uuid)  to authenticated;

-- F7: an avatar object is readable by its owner OR by a user who shares a trip
-- with the owner (mirrors profiles_select), but writable by the owner only.
-- Replaces the prior owner-only-read avatars_rw policy, which made teammates'
-- photos never load in AvatarStack.
drop policy avatars_rw on storage.objects;

create policy avatars_read on storage.objects for select using (
  bucket_id = 'avatars' and (
    ((storage.foldername(name))[1])::uuid = auth.uid()
    or exists (
      select 1 from trip_members me
      join trip_members them on them.trip_id = me.trip_id
      where me.user_id = auth.uid()
        and them.user_id = ((storage.foldername(name))[1])::uuid
    )
  )
);

create policy avatars_insert on storage.objects for insert with check (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);
create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
) with check (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);
create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid()
);

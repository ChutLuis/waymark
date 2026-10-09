-- =====================================================================
-- Invites opened by someone already on the trip
-- =====================================================================
-- preview_trip_invite also reports whether the caller is already a member,
-- so the Join screen can open the trip instead of offering to join it.
--
-- accept_trip_invite returns the trip id for a caller who is already a
-- member without marking the invite used: the single-use code stays
-- available for the person it was meant for. Unknown, used and expired codes
-- are rejected exactly as before, for members and non-members alike.
--
-- Table RLS is NOT relaxed.
-- =====================================================================

-- The result columns change, so the function is dropped and recreated.
drop function preview_trip_invite(text);

create function preview_trip_invite(_code text)
returns table (
  trip_id      uuid,
  name         text,
  destination  text,
  start_date   date,
  end_date     date,
  inviter_name text,
  is_member    boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare v_invite trip_invites;
begin
  select * into v_invite from trip_invites where code = upper(trim(_code));
  if not found then raise exception 'invalid invite'; end if;
  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;

  return query
    select t.id, t.name, t.destination, t.start_date, t.end_date,
           coalesce(p.display_name, 'A member')::text,
           exists (
             select 1 from trip_members m
             where m.trip_id = t.id and m.user_id = auth.uid()
           )
    from trips t
    left join profiles p on p.id = v_invite.created_by
    where t.id = v_invite.trip_id;
end $$;

revoke execute on function preview_trip_invite(text) from public, anon;
grant  execute on function preview_trip_invite(text) to authenticated;

create or replace function accept_trip_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite trip_invites;
begin
  select * into v_invite from trip_invites where code = _code for update;
  if not found then raise exception 'invalid invite'; end if;
  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;

  -- Already on the trip: nothing to join, and the code is left unused.
  if exists (
    select 1 from trip_members
    where trip_id = v_invite.trip_id and user_id = auth.uid()
  ) then
    return v_invite.trip_id;
  end if;

  insert into trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), 'member') on conflict (trip_id, user_id) do nothing;
  update trip_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.trip_id;
end $$;

revoke execute on function accept_trip_invite(text) from public, anon;
grant  execute on function accept_trip_invite(text) to authenticated;

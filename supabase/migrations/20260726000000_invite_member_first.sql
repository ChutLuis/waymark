-- =====================================================================
-- Members are recognised before an invite's state is checked
-- =====================================================================
-- A member opening a used or expired invite to their own trip was told to
-- ask for a new invite. Both invite functions now check membership first:
-- for a member, preview_trip_invite returns the trip with is_member = true
-- and accept_trip_invite returns the trip id, whatever the invite's state,
-- and neither touches the invite.
--
-- Non-members get exactly the same errors as before (invalid, already
-- used, expired). An unknown code is still rejected for everyone.
--
-- Table RLS is NOT relaxed.
-- =====================================================================

create or replace function preview_trip_invite(_code text)
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
declare
  v_invite trip_invites;
  v_member boolean;
begin
  select * into v_invite from trip_invites where code = upper(trim(_code));
  if not found then raise exception 'invalid invite'; end if;

  v_member := exists (
    select 1 from trip_members
    where trip_members.trip_id = v_invite.trip_id and user_id = auth.uid()
  );
  if not v_member then
    if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
    if v_invite.expires_at < now() then raise exception 'invite expired'; end if;
  end if;

  return query
    select t.id, t.name, t.destination, t.start_date, t.end_date,
           coalesce(p.display_name, 'A member')::text,
           v_member
    from trips t
    left join profiles p on p.id = v_invite.created_by
    where t.id = v_invite.trip_id;
end $$;

create or replace function accept_trip_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite trip_invites;
begin
  select * into v_invite from trip_invites where code = _code for update;
  if not found then raise exception 'invalid invite'; end if;

  -- Already on the trip: nothing to join, and the code is left as it is.
  if exists (
    select 1 from trip_members
    where trip_id = v_invite.trip_id and user_id = auth.uid()
  ) then
    return v_invite.trip_id;
  end if;

  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;

  insert into trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), 'member') on conflict (trip_id, user_id) do nothing;
  update trip_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.trip_id;
end $$;

revoke execute on function preview_trip_invite(text) from public, anon;
grant  execute on function preview_trip_invite(text) to authenticated;
revoke execute on function accept_trip_invite(text) from public, anon;
grant  execute on function accept_trip_invite(text) to authenticated;

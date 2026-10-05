-- =====================================================================
-- preview_trip_invite(code)
-- =====================================================================
-- A read-only, security-definer helper for the Join screen: it lets a
-- signed-in non-member preview the trip behind a valid invite code (name,
-- destination, dates) and the inviter's display name, without opening up
-- the trips/trip_members tables to non-members. It returns exactly those
-- fields and nothing else, and only for an unexpired, unused code.
--
-- Table RLS is NOT relaxed. This mirrors accept_trip_invite's validation.
-- =====================================================================

create or replace function preview_trip_invite(_code text)
returns table (
  trip_id      uuid,
  name         text,
  destination  text,
  start_date   date,
  end_date     date,
  inviter_name text
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
           coalesce(p.display_name, 'A member')::text
    from trips t
    left join profiles p on p.id = v_invite.created_by
    where t.id = v_invite.trip_id;
end $$;

revoke execute on function preview_trip_invite(text) from public, anon;
grant  execute on function preview_trip_invite(text) to authenticated;
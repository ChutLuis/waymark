-- Account deletion: hand over the trips a departing owner leaves behind, then
-- let the auth-user cascade remove everything else.
--
-- The client can't delete an auth user, so deletion runs in the
-- `delete-account` Edge Function with the service role. This function does the
-- part that is pure data: before the auth row disappears,
--   * every trip the user owns that has other members passes ownership to the
--     member who joined first (owner role + trips.created_by), so the trip and
--     its itinerary/packing/notes survive for them;
--   * every trip the user owns with no other members is deleted (its rows
--     cascade).
-- The remaining rows the user authored (profile, their notes, their
-- memberships, invites) fall away with the auth-user cascade.

create or replace function public.delete_account_prepare(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trip_id uuid;
  v_heir uuid;
begin
  if _user_id is null then
    raise exception 'delete_account_prepare: user id is required';
  end if;

  -- Trips this user owns, oldest first, so behaviour is deterministic.
  for v_trip_id in
    select t.id
    from public.trips t
    where t.created_by = _user_id
    order by t.created_at
  loop
    -- The member who joined first, excluding the departing owner.
    select m.user_id
    into v_heir
    from public.trip_members m
    where m.trip_id = v_trip_id
      and m.user_id <> _user_id
    order by m.joined_at, m.user_id
    limit 1;

    if v_heir is null then
      -- No one else on the trip: delete it (children cascade).
      delete from public.trips where id = v_trip_id;
    else
      -- Hand the trip to the earliest-joined remaining member.
      update public.trips
        set created_by = v_heir
        where id = v_trip_id;

      update public.trip_members
        set role = 'member'
        where trip_id = v_trip_id
          and user_id = _user_id;

      update public.trip_members
        set role = 'owner'
        where trip_id = v_trip_id
          and user_id = v_heir;
    end if;
  end loop;

  -- Drop the departing user's remaining memberships (on trips they didn't own
  -- and on the trips just handed over). The auth cascade would do this too;
  -- doing it here leaves the database consistent as soon as prepare returns.
  delete from public.trip_members where user_id = _user_id;
end;
$$;

-- Service-role only: this is invoked from the Edge Function, never the client.
revoke all on function public.delete_account_prepare(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_prepare(uuid) to service_role;
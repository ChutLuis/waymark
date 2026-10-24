-- =====================================================================
-- create_trip takes the trip's id from the device
-- =====================================================================
-- A new trip can wait offline and be sent after a restart. Stops, notes and
-- packing items are inserted with an id made on the device, so a request
-- sent twice (a retry after a lost response, or a replay of a write that was
-- sent but not yet recorded as sent) lands once. create_trip now takes the
-- same optional id: a second call with an id the caller already created
-- returns that trip instead of making another, and an id that belongs to
-- someone else's trip is refused. Without an id it behaves as before.
--
-- The signature changes, so the old function is dropped rather than left
-- as an overload (PostgREST can't choose between the two).
-- Table RLS is NOT relaxed.
-- =====================================================================

drop function public.create_trip(text, text, date, date);

create function public.create_trip(
  _name text,
  _destination text default null,
  _start date default null,
  _end date default null,
  _id uuid default null
)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(_name, ''));
  v_destination text := nullif(btrim(coalesce(_destination, '')), '');
  v_trip public.trips;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if char_length(v_name) = 0 then
    raise exception 'Give the trip a name' using errcode = '22023';
  end if;
  if char_length(v_name) > 200 then
    raise exception 'Trip names can be up to 200 characters' using errcode = '22023';
  end if;
  if v_destination is not null and char_length(v_destination) > 120 then
    raise exception 'Destinations can be up to 120 characters' using errcode = '22023';
  end if;
  if _start is not null and _end is not null then
    if _end < _start then
      raise exception 'A trip can''t end before it starts' using errcode = '22023';
    end if;
    if _end - _start > 366 then
      raise exception 'A trip can be up to a year long' using errcode = '22023';
    end if;
  end if;

  insert into public.trips (id, name, destination, start_date, end_date, created_by)
  values (coalesce(_id, gen_random_uuid()), v_name, v_destination, _start, _end, v_uid)
  on conflict (id) do nothing
  returning * into v_trip;

  if v_trip.id is null then
    -- Sent before: the caller's own trip comes back as it is now (a later
    -- edit is not undone); anyone else's id is refused.
    select * into v_trip from public.trips where id = _id and created_by = v_uid;
    if v_trip.id is null then
      raise exception 'That trip id is already in use' using errcode = '23505';
    end if;
    return v_trip;
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'owner');
  return v_trip;
end $$;

revoke execute on function public.create_trip(text, text, date, date, uuid) from public, anon;
grant execute on function public.create_trip(text, text, date, date, uuid) to authenticated;

-- =====================================================================
-- Integrity, invites and account deletion (audit of 2026-10-19)
-- =====================================================================
-- 1. Trips are created only through create_trip, which validates its input;
--    table checks back that up for every other write path.
-- 2. A trip keeps its owner: an owner can't remove their own membership
--    (they delete the trip instead), and deleting a user who still owns
--    trips is refused rather than cascading those shared trips away.
-- 3. Packing items can only be assigned to members, and a member's
--    assignments and unused invites go when they leave.
-- 4. The server mints invites (cryptographic randomness, fixed shape and
--    lifetime); an invite stops working once the member who made it leaves;
--    unknown-code guesses are throttled per user.
-- 5. Trip covers: members read, only the owner writes. Buckets get size and
--    type limits.
-- 6. Account deletion is resumable: deleted trips are remembered, covers in
--    trips that live on pass to the trip's owner, and the Edge Function can
--    list every object it still has to remove.
-- 7. Security-definer functions and triggers pin search_path to ''.
--
-- Table RLS is NOT relaxed anywhere.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------

-- A folder name that is not a uuid must not abort a whole statement.
create or replace function public.try_uuid(_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return _value::uuid;
exception when invalid_text_representation then
  return null;
end $$;

create or replace function public.is_trip_member(_trip_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(_trip_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.prevent_note_reassignment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.trip_id <> old.trip_id or new.author_id <> old.author_id then
    raise exception 'cannot reassign note trip or author';
  end if;
  return new;
end $$;

-- Only reviewed server code (security-definer functions such as the
-- account-deletion handover, or the service role) may change a trip's
-- creator; a client's own UPDATE runs as `authenticated` and can't.
create or replace function public.prevent_trip_creator_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.created_by is distinct from old.created_by then
    raise exception 'cannot change trip creator';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. Trips: RPC-only creation, validated values
-- ---------------------------------------------------------------------

drop policy if exists trips_insert on public.trips;
revoke insert on public.trips from authenticated, anon;

alter table public.trips
  add constraint trips_name_check
    check (char_length(btrim(name)) between 1 and 200) not valid,
  add constraint trips_destination_check
    check (destination is null or char_length(destination) <= 120) not valid,
  add constraint trips_dates_check
    check (
      start_date is null or end_date is null
      or (end_date >= start_date and end_date - start_date <= 366)
    ) not valid;

create or replace function public.create_trip(
  _name text,
  _destination text default null,
  _start date default null,
  _end date default null
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

  insert into public.trips (name, destination, start_date, end_date, created_by)
  values (v_name, v_destination, _start, _end, v_uid)
  returning * into v_trip;
  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip.id, v_uid, 'owner');
  return v_trip;
end $$;

-- Deleting a user who still owns trips would cascade their shared trips away.
-- The delete-account flow hands trips over first; anything else is refused.
alter table public.trips drop constraint trips_created_by_fkey;
alter table public.trips
  add constraint trips_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete restrict;

-- ---------------------------------------------------------------------
-- 2. Memberships: the owner stays; leaving releases assignments and invites
-- ---------------------------------------------------------------------

-- A client can't remove the owner's membership: the trip would be left with
-- nobody who can edit or delete it, so the owner deletes the trip instead.
-- Server code (account deletion, the cascade of a trip delete) runs as the
-- function or table owner and is not limited.
create or replace function public.guard_owner_membership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon')
     and old.role = 'owner'
     and exists (select 1 from public.trips where id = old.trip_id) then
    raise exception 'The trip owner can''t leave the trip. Delete it instead.'
      using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists trg_guard_owner_membership on public.trip_members;
create trigger trg_guard_owner_membership
  before delete on public.trip_members
  for each row execute function public.guard_owner_membership();

-- Someone who leaves (or is removed) takes nothing with them by accident:
-- their packing items become unassigned and their unused invites stop
-- existing. Skipped when the trip itself is being deleted.
create or replace function public.release_departed_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.trips where id = old.trip_id) then
    update public.packing_items
       set assigned_to = null
     where trip_id = old.trip_id and assigned_to = old.user_id;
    delete from public.trip_invites
     where trip_id = old.trip_id and created_by = old.user_id and accepted_at is null;
  end if;
  return null;
end $$;

drop trigger if exists trg_release_departed_member on public.trip_members;
create trigger trg_release_departed_member
  after delete on public.trip_members
  for each row execute function public.release_departed_member();

-- ---------------------------------------------------------------------
-- 3. Shared content: assignees are members, creators can't be spoofed
-- ---------------------------------------------------------------------

create or replace function public.check_packing_assignee() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT'
          or new.assigned_to is distinct from old.assigned_to
          or new.trip_id is distinct from old.trip_id)
     and not exists (
       select 1 from public.trip_members
       where trip_id = new.trip_id and user_id = new.assigned_to
     ) then
    raise exception 'Packing items can only be assigned to trip members'
      using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_check_packing_assignee on public.packing_items;
create trigger trg_check_packing_assignee
  before insert or update on public.packing_items
  for each row execute function public.check_packing_assignee();

-- A client's insert is attributed to the caller whatever it sends, and the
-- attribution can't be rewritten later.
create or replace function public.stamp_item_creator() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from old.created_by then
      new.created_by := old.created_by;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_stamp_itinerary_creator on public.itinerary_items;
create trigger trg_stamp_itinerary_creator
  before insert or update on public.itinerary_items
  for each row execute function public.stamp_item_creator();

drop trigger if exists trg_stamp_packing_creator on public.packing_items;
create trigger trg_stamp_packing_creator
  before insert or update on public.packing_items
  for each row execute function public.stamp_item_creator();

alter table public.trip_notes
  add constraint trip_notes_body_check
    check (char_length(btrim(body)) between 1 and 10000) not valid;

alter table public.itinerary_items
  add constraint itinerary_items_title_check
    check (char_length(btrim(title)) between 1 and 200) not valid,
  add constraint itinerary_items_description_check
    check (description is null or char_length(description) <= 4000) not valid,
  add constraint itinerary_items_location_check
    check (location is null or char_length(location) <= 300) not valid,
  add constraint itinerary_items_times_check
    check (start_at is null or end_at is null or end_at >= start_at) not valid;

alter table public.packing_items
  add constraint packing_items_label_check
    check (char_length(btrim(label)) between 1 and 200) not valid,
  add constraint packing_items_quantity_max
    check (quantity <= 999) not valid;

alter table public.profiles
  add constraint profiles_display_name_check
    check (char_length(btrim(display_name)) between 1 and 60) not valid;

-- ---------------------------------------------------------------------
-- 4. Invites: minted by the server, revoked with their creator, throttled
-- ---------------------------------------------------------------------

drop policy if exists invites_insert on public.trip_invites;
revoke insert, update on public.trip_invites from authenticated, anon;

alter table public.trip_invites
  add constraint trip_invites_code_check
    check (code ~ '^[A-Z0-9]{8}$') not valid,
  add constraint trip_invites_lifetime_check
    check (expires_at <= created_at + interval '30 days') not valid;

-- Eight characters from an alphabet without lookalikes (0/O, 1/I/L).
-- Rejection sampling keeps every character equally likely: 248 = 8 × 31.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_bytes bytea;
  v_byte int;
begin
  while char_length(v_code) < 8 loop
    v_bytes := extensions.gen_random_bytes(16);
    for i in 0 .. 15 loop
      v_byte := get_byte(v_bytes, i);
      if v_byte < 248 and char_length(v_code) < 8 then
        v_code := v_code || substr(v_alphabet, (v_byte % 31) + 1, 1);
      end if;
    end loop;
  end loop;
  return v_code;
end $$;

-- The caller's newest invite for the trip while it has a day left, so the
-- invite card keeps showing one code; otherwise a fresh 7-day invite.
create or replace function public.get_or_create_trip_invite(_trip_id uuid)
returns public.trip_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.trip_invites;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip_id and m.user_id = v_uid
  ) then
    raise exception 'not a member of this trip' using errcode = '42501';
  end if;

  select * into v_invite
  from public.trip_invites i
  where i.trip_id = _trip_id
    and i.created_by = v_uid
    and i.accepted_at is null
    and i.expires_at > now() + interval '1 day'
  order by i.created_at desc
  limit 1;
  if found then
    return v_invite;
  end if;

  for attempt in 1 .. 5 loop
    begin
      insert into public.trip_invites (trip_id, code, created_by, expires_at)
      values (_trip_id, public.generate_invite_code(), v_uid, now() + interval '7 days')
      returning * into v_invite;
      return v_invite;
    exception when unique_violation then
      null; -- a code collision: draw again
    end;
  end loop;
  raise exception 'could not create an invite code, try again';
end $$;

-- Failed lookups of unknown or revoked codes, per user, for throttling.
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_user_time on public.invite_attempts (user_id, attempted_at desc);
alter table public.invite_attempts enable row level security;
alter table public.invite_attempts force row level security;
revoke all on public.invite_attempts from anon, authenticated;

-- Ten failed guesses in fifteen minutes pause further lookups for that user.
create or replace function public.invite_lookups_paused(_uid uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select count(*) >= 10
  from public.invite_attempts a
  where a.user_id = _uid and a.attempted_at > now() - interval '15 minutes';
$$;

-- Unknown and revoked codes return no row (preview) or null (accept) instead
-- of raising: an exception would roll back the attempt being recorded. The
-- app reads both as "invalid invite". Used and expired codes still raise,
-- and a member gets their own trip back whatever the invite's state.
create or replace function public.preview_trip_invite(_code text)
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
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_invite public.trip_invites;
  v_member boolean;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if public.invite_lookups_paused(v_uid) then
    raise exception 'too many attempts';
  end if;

  select * into v_invite
  from public.trip_invites i
  where i.code = upper(btrim(coalesce(_code, '')));
  if not found then
    insert into public.invite_attempts (user_id) values (v_uid);
    return;
  end if;

  v_member := exists (
    select 1 from public.trip_members m
    where m.trip_id = v_invite.trip_id and m.user_id = v_uid
  );
  if not v_member then
    if not exists (
      select 1 from public.trip_members m
      where m.trip_id = v_invite.trip_id and m.user_id = v_invite.created_by
    ) then
      insert into public.invite_attempts (user_id) values (v_uid);
      return;
    end if;
    if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
    if v_invite.expires_at < now() then raise exception 'invite expired'; end if;
  end if;

  return query
    select t.id, t.name, t.destination, t.start_date, t.end_date,
           coalesce(p.display_name, 'A member')::text,
           v_member
    from public.trips t
    left join public.profiles p on p.id = v_invite.created_by
    where t.id = v_invite.trip_id;
end $$;

create or replace function public.accept_trip_invite(_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.trip_invites;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if public.invite_lookups_paused(v_uid) then
    raise exception 'too many attempts';
  end if;

  select * into v_invite
  from public.trip_invites i
  where i.code = upper(btrim(coalesce(_code, '')))
  for update;
  if not found then
    insert into public.invite_attempts (user_id) values (v_uid);
    return null;
  end if;

  -- Already on the trip: nothing to join, and the code is left as it is.
  if exists (
    select 1 from public.trip_members m
    where m.trip_id = v_invite.trip_id and m.user_id = v_uid
  ) then
    return v_invite.trip_id;
  end if;

  if not exists (
    select 1 from public.trip_members m
    where m.trip_id = v_invite.trip_id and m.user_id = v_invite.created_by
  ) then
    insert into public.invite_attempts (user_id) values (v_uid);
    return null;
  end if;
  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, v_uid, 'member')
  on conflict (trip_id, user_id) do nothing;
  update public.trip_invites
     set accepted_at = now(), accepted_by = v_uid
   where id = v_invite.id;
  return v_invite.trip_id;
end $$;

-- ---------------------------------------------------------------------
-- 5. Storage: members read covers, the owner writes them; bucket limits
-- ---------------------------------------------------------------------

drop policy if exists trip_covers_rw on storage.objects;

create policy trip_covers_read on storage.objects for select
  using (
    bucket_id = 'trip-covers'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

create policy trip_covers_insert on storage.objects for insert
  with check (
    bucket_id = 'trip-covers'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );

create policy trip_covers_update on storage.objects for update
  using (
    bucket_id = 'trip-covers'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'trip-covers'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );

create policy trip_covers_delete on storage.objects for delete
  using (
    bucket_id = 'trip-covers'
    and public.is_trip_owner(((storage.foldername(name))[1])::uuid)
  );

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id in ('trip-covers', 'avatars');

-- ---------------------------------------------------------------------
-- 6. Account deletion: resumable, and no object left owned by the user
-- ---------------------------------------------------------------------

-- Trips deleted by delete_account_prepare, so a retry after a failed storage
-- cleanup still knows whose cover folders to remove. Rows go with the user.
create table public.account_deletion_trips (
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, trip_id)
);
alter table public.account_deletion_trips enable row level security;
alter table public.account_deletion_trips force row level security;
revoke all on public.account_deletion_trips from anon, authenticated;

-- Idempotent: running it again after a partial failure is safe and returns
-- every trip deleted for this user so far, not just the ones deleted now.
create or replace function public.delete_account_prepare(_user_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
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
    select t.id from public.trips t
    where t.created_by = _user_id
    order by t.created_at, t.id
  loop
    select m.user_id into v_heir
    from public.trip_members m
    where m.trip_id = v_trip_id and m.user_id <> _user_id
    order by m.joined_at, m.user_id
    limit 1;

    if v_heir is null then
      insert into public.account_deletion_trips (user_id, trip_id)
      values (_user_id, v_trip_id)
      on conflict do nothing;
      delete from public.trips where id = v_trip_id;
    else
      update public.trips set created_by = v_heir where id = v_trip_id;
      update public.trip_members set role = 'member'
       where trip_id = v_trip_id and user_id = _user_id;
      update public.trip_members set role = 'owner'
       where trip_id = v_trip_id and user_id = v_heir;
    end if;
  end loop;

  -- Covers the user uploaded to trips that live on now belong to each trip's
  -- owner, so the user owns no object the trip still shows.
  update storage.objects o
     set owner = t.created_by, owner_id = t.created_by::text
    from public.trips t
   where o.bucket_id = 'trip-covers'
     and (o.owner = _user_id or o.owner_id = _user_id::text)
     and t.id = public.try_uuid((storage.foldername(o.name))[1])
     and t.created_by <> _user_id;

  delete from public.trip_members where user_id = _user_id;

  return coalesce(
    (select array_agg(d.trip_id order by d.deleted_at, d.trip_id)
     from public.account_deletion_trips d
     where d.user_id = _user_id),
    '{}'::uuid[]
  );
end $$;

-- Every object the delete-account function must remove before the user goes:
-- their avatar folder, the cover folders of the trips deleted for them, and
-- anything else still owned by them.
create or replace function public.account_storage_objects(_user_id uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where (o.bucket_id = 'avatars'
         and public.try_uuid((storage.foldername(o.name))[1]) = _user_id)
     or (o.bucket_id = 'trip-covers'
         and public.try_uuid((storage.foldername(o.name))[1]) in (
           select d.trip_id from public.account_deletion_trips d
           where d.user_id = _user_id))
     or o.owner = _user_id
     or o.owner_id = _user_id::text
  order by o.bucket_id, o.name;
$$;

-- ---------------------------------------------------------------------
-- 7. Grants (Supabase grants EXECUTE on new functions to anon/authenticated
--    by default, so internal ones are revoked explicitly)
-- ---------------------------------------------------------------------

revoke execute on function public.try_uuid(text) from public, anon, authenticated;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.invite_lookups_paused(uuid) from public, anon, authenticated;
revoke execute on function public.guard_owner_membership() from public, anon, authenticated;
revoke execute on function public.release_departed_member() from public, anon, authenticated;
revoke execute on function public.check_packing_assignee() from public, anon, authenticated;
revoke execute on function public.stamp_item_creator() from public, anon, authenticated;

revoke execute on function public.create_trip(text, text, date, date) from public, anon;
grant execute on function public.create_trip(text, text, date, date) to authenticated;
revoke execute on function public.get_or_create_trip_invite(uuid) from public, anon;
grant execute on function public.get_or_create_trip_invite(uuid) to authenticated;
revoke execute on function public.preview_trip_invite(text) from public, anon;
grant execute on function public.preview_trip_invite(text) to authenticated;
revoke execute on function public.accept_trip_invite(text) from public, anon;
grant execute on function public.accept_trip_invite(text) to authenticated;

revoke all on function public.delete_account_prepare(uuid) from public, anon, authenticated;
grant execute on function public.delete_account_prepare(uuid) to service_role;
revoke all on function public.account_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.account_storage_objects(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 8. Validate the new checks against existing rows. A check that existing
--    data breaks stays NOT VALID (it still checks every new write) instead
--    of failing the whole migration on a hosted project.
-- ---------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.connamespace = 'public'::regnamespace
      and c.contype = 'c'
      and not c.convalidated
  loop
    begin
      execute format('alter table %s validate constraint %I', r.tbl, r.conname);
    exception when check_violation then
      raise notice '% on %: existing rows break it, so it stays NOT VALID and checks new writes only',
        r.conname, r.tbl;
    end;
  end loop;
end $$;

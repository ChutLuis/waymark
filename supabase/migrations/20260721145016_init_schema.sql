-- Waymark init_schema — tables → triggers → helpers → RLS → policies → RPCs → storage

-- 1. TABLES (ARCHITECTURE §5)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null, destination text, start_date date, end_date date,
  cover_image_path text,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create table trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  code text not null unique, invited_email text,
  created_by uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create table itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  title text not null, description text, location text,
  start_at timestamptz, end_at timestamptz,
  status text not null default 'planned' check (status in ('planned','confirmed','done')),
  sort_order integer not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  label text not null,
  quantity integer not null default 1 check (quantity > 0),
  assigned_to uuid references auth.users on delete set null,
  is_packed boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  body text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_trip_members_user on trip_members (user_id);
create index idx_itinerary_trip on itinerary_items (trip_id);
create index idx_packing_trip   on packing_items (trip_id);
create index idx_notes_trip      on trip_notes (trip_id);
create index idx_invites_trip    on trip_invites (trip_id);

-- 2. updated_at TRIGGER
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger touch_profiles  before update on profiles        for each row execute function set_updated_at();
create trigger touch_trips     before update on trips           for each row execute function set_updated_at();
create trigger touch_itinerary before update on itinerary_items for each row execute function set_updated_at();
create trigger touch_packing   before update on packing_items   for each row execute function set_updated_at();
create trigger touch_notes     before update on trip_notes      for each row execute function set_updated_at();

-- 3. MEMBERSHIP HELPERS (SECURITY §4) — before policies; security definer avoids recursion
create or replace function is_trip_member(_trip_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from trip_members where trip_id = _trip_id and user_id = auth.uid());
$$;
create or replace function is_trip_owner(_trip_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from trip_members where trip_id = _trip_id and user_id = auth.uid() and role = 'owner');
$$;

-- 4. ENABLE + FORCE RLS
alter table profiles        enable row level security;
alter table trips           enable row level security;
alter table trip_members    enable row level security;
alter table trip_invites    enable row level security;
alter table itinerary_items enable row level security;
alter table packing_items   enable row level security;
alter table trip_notes      enable row level security;
alter table profiles        force row level security;
alter table trips           force row level security;
alter table trip_members    force row level security;
alter table trip_invites    force row level security;
alter table itinerary_items force row level security;
alter table packing_items   force row level security;
alter table trip_notes      force row level security;

-- 5. POLICIES (SECURITY §5)
create policy profiles_select on profiles for select using (
  id = auth.uid() or exists (
    select 1 from trip_members me join trip_members them on them.trip_id = me.trip_id
    where me.user_id = auth.uid() and them.user_id = profiles.id));
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy trips_select on trips for select using (is_trip_member(id));
create policy trips_insert on trips for insert with check (created_by = auth.uid());
create policy trips_update on trips for update using (is_trip_owner(id)) with check (is_trip_owner(id));
create policy trips_delete on trips for delete using (is_trip_owner(id));

create policy trip_members_select on trip_members for select using (is_trip_member(trip_id));
create policy trip_members_delete on trip_members for delete using (user_id = auth.uid() or is_trip_owner(trip_id));

create policy invites_select on trip_invites for select using (created_by = auth.uid() or is_trip_owner(trip_id));
create policy invites_insert on trip_invites for insert with check (is_trip_member(trip_id) and created_by = auth.uid());

create policy itinerary_all on itinerary_items for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));
create policy packing_all   on packing_items   for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

create policy notes_select on trip_notes for select using (
  is_trip_member(trip_id) and (is_private = false or author_id = auth.uid()));
create policy notes_insert on trip_notes for insert with check (is_trip_member(trip_id) and author_id = auth.uid());
create policy notes_update on trip_notes for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy notes_delete on trip_notes for delete using (author_id = auth.uid());

-- 6. PRIVILEGED RPCs (security definer) — clients call these, never direct inserts
create or replace function create_trip(_name text, _destination text default null,
  _start date default null, _end date default null)
returns trips language plpgsql security definer set search_path = public as $$
declare v_trip trips;
begin
  insert into trips (name, destination, start_date, end_date, created_by)
  values (_name, _destination, _start, _end, auth.uid()) returning * into v_trip;
  insert into trip_members (trip_id, user_id, role) values (v_trip.id, auth.uid(), 'owner');
  return v_trip;
end $$;

create or replace function accept_trip_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite trip_invites;
begin
  select * into v_invite from trip_invites where code = _code for update;
  if not found then raise exception 'invalid invite'; end if;
  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;
  insert into trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), 'member') on conflict (trip_id, user_id) do nothing;
  update trip_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.trip_id;
end $$;

revoke execute on function create_trip(text,text,date,date) from public, anon;
revoke execute on function accept_trip_invite(text)         from public, anon;
grant  execute on function create_trip(text,text,date,date) to authenticated;
grant  execute on function accept_trip_invite(text)         to authenticated;

-- 7. STORAGE (SECURITY §6)
insert into storage.buckets (id, name, public)
values ('trip-covers','trip-covers',false), ('avatars','avatars',false)
on conflict (id) do nothing;

create policy trip_covers_rw on storage.objects for all
  using (bucket_id = 'trip-covers' and is_trip_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'trip-covers' and is_trip_member(((storage.foldername(name))[1])::uuid));
create policy avatars_rw on storage.objects for all
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid())
  with check (bucket_id = 'avatars' and ((storage.foldername(name))[1])::uuid = auth.uid());

-- 8. GRANTS (RLS gates which rows; roles still need table-level privileges)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  profiles, trips, trip_members, trip_invites, itinerary_items, packing_items, trip_notes
  to authenticated;

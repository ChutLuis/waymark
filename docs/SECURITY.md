# Waymark - Security and Row Level Security

This document is the contract for how Waymark keeps shared content shared and
private content private. It is written so the rules can be implemented directly
as migrations and verified by tests.

## 1. Model in one sentence

A user can read and write trip content only for trips they are a member of, and
a private note can be read only by the member who wrote it.

## 2. Authentication

- Supabase Auth issues a JWT whose `sub` claim is the user id, available in
  policies as `auth.uid()`.
- On native, the session is persisted in secure device storage; on web, in the
  default browser storage.
- The client uses only the anonymous public key. The service-role key never
  ships in the app; privileged writes use the `create_trip` and
  `accept_trip_invite` security-definer RPCs.
- A secret-exposure audit of the exported bundle found only public values: the
  Supabase URL, Supabase anon key, and EAS project ID.

### Client-side hardening

- Sessions use `expo-secure-store` through a chunked adapter with
  `keychainAccessible: AFTER_FIRST_UNLOCK` on native.
- Auth uses the PKCE flow.
- The TanStack Query cache is cleared whenever the authenticated user changes,
  preventing cross-user data bleed on shared devices.

## 3. Principles

- RLS is enabled and forced on every table. Access requires both a table grant
  to `authenticated` and a passing RLS policy; these are two separate gates.
- Membership is resolved through one security-definer helper function so that
  policies never reference each other in a way that recurses.
- Membership helpers revoke `execute` from `PUBLIC` and `anon` and grant it to
  `authenticated` only.
- Writes validate both membership and ownership. For example, a note insert must
  set `author_id = auth.uid()` and target a trip the user belongs to.
- Adding access is done through reviewed policies, never by loosening a table to
  "authenticated can do anything".
- Trip creation and invite acceptance go through the `create_trip` and
  `accept_trip_invite` security-definer RPCs.

## 4. Membership helper (avoids recursion)

Policies on `trips`, `itinerary_items`, `packing_items`, and `trip_notes` need
to ask "is the current user a member of this trip". Asking that with a normal
subquery against `trip_members` from within a policy that also guards
`trip_members` causes infinite recursion. The fix is a single security-definer
function that reads membership with the definer's rights:

```sql
create or replace function is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = _trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_trip_owner(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = _trip_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;
```

## 5. Policies by table

Enable RLS on every table first, for example:

```sql
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table trip_invites enable row level security;
alter table itinerary_items enable row level security;
alter table packing_items enable row level security;
alter table trip_notes enable row level security;
alter table profiles enable row level security;
```

### 5.1 profiles

- Read: own profile, plus profiles of users who share a trip with you.
- Write: own profile only.

```sql
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or exists (
    select 1
    from trip_members me
    join trip_members them on them.trip_id = me.trip_id
    where me.user_id = auth.uid()
      and them.user_id = profiles.id
  )
);

create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
```

### 5.2 trips

- Read: members. Insert: any authenticated user, recorded as creator.
  Update and delete: owner only.

```sql
create policy trips_select on trips for select
  using (is_trip_member(id));

create policy trips_insert on trips for insert
  with check (created_by = auth.uid());

create policy trips_update on trips for update
  using (is_trip_owner(id)) with check (is_trip_owner(id));

create policy trips_delete on trips for delete
  using (is_trip_owner(id));
```

Creating the owner membership row is done atomically with trip creation by a
security-definer function `create_trip(...)` that inserts the trip and the
owner's `trip_members` row, so a trip is never left without an owner.

### 5.3 trip_members

- Read: members of the same trip (so members can see each other).
- Insert: only through the invite-acceptance function and the trip-creation
  function (both security-definer); no direct client insert.
- Delete: a member can remove themselves; an owner can remove others.

```sql
create policy trip_members_select on trip_members for select
  using (is_trip_member(trip_id));

create policy trip_members_delete on trip_members for delete
  using (
    user_id = auth.uid()          -- leave a trip
    or is_trip_owner(trip_id)     -- owner removes a member
  );
```

No insert or update policy is granted to clients; membership changes flow
through reviewed functions.

### 5.4 trip_invites

- Read: the creator or a trip owner. Insert: members of the trip.
  Acceptance mutates the invite through a function, not a client update.

```sql
create policy invites_select on trip_invites for select
  using (created_by = auth.uid() or is_trip_owner(trip_id));

create policy invites_insert on trip_invites for insert
  with check (is_trip_member(trip_id) and created_by = auth.uid());
```

Acceptance function (security definer) validates and joins in one step:

```sql
create or replace function accept_trip_invite(_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite trip_invites;
begin
  select * into v_invite
  from trip_invites
  where code = _code
  for update;

  if not found then
    raise exception 'invalid invite';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite already used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite expired';
  end if;

  insert into trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;

  update trip_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invite.id;

  return v_invite.trip_id;
end;
$$;
```

This guarantees INV-4: acceptance can only ever add the caller to the single
trip the code belongs to.

### 5.5 itinerary_items and packing_items (shared content)

All members can read and write; writes are constrained to the member's trips.

```sql
create policy itinerary_all on itinerary_items for all
  using (is_trip_member(trip_id))
  with check (is_trip_member(trip_id));

create policy packing_all on packing_items for all
  using (is_trip_member(trip_id))
  with check (is_trip_member(trip_id));
```

### 5.6 trip_notes (the private-versus-shared rule)

- Read: you must be a member, and the note is either shared or authored by you.
- Insert: you must be a member and set yourself as author.
- Update and delete: author only.

```sql
create policy notes_select on trip_notes for select using (
  is_trip_member(trip_id)
  and (is_private = false or author_id = auth.uid())
);

create policy notes_insert on trip_notes for insert with check (
  is_trip_member(trip_id) and author_id = auth.uid()
);

create policy notes_update on trip_notes for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy notes_delete on trip_notes for delete
  using (author_id = auth.uid());
```

## 6. Storage policies

Objects live under a path whose first folder is the owning id. Policies on
`storage.objects` reuse the membership rules.

Trip covers are readable and writable by trip members. Avatars are readable by
their owner or a trip-mate and writable by their owner only.

```sql
-- trip-covers/{trip_id}/{file}
create policy trip_covers_rw on storage.objects for all
  using (
    bucket_id = 'trip-covers'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'trip-covers'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );

-- avatars/{user_id}/{file}
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
```

## 7. RLS test matrix

The 33-test pgTAP suite covers every scenario below; a scenario row can contain
multiple assertions. "A" and "B" are members of Trip 1; "C" is not a member.
All tests run inside a transaction that is rolled back.

| ID | Scenario | Expected |
| --- | --- | --- |
| S1 | C selects Trip 1 | 0 rows |
| S2 | A selects Trip 1 | 1 row |
| S3 | C inserts an itinerary item into Trip 1 | denied |
| S4 | B inserts an itinerary item into Trip 1 | allowed |
| S5 | A and B both read the itinerary | identical, non-empty |
| S6 | A writes a private note | allowed |
| S7 | B reads A's private note | 0 rows |
| S8 | Owner reads a member's private note | 0 rows |
| S9 | A writes a shared note | allowed |
| S10 | B reads A's shared note | 1 row |
| S11 | B edits A's note | denied |
| S12 | C reads any note on Trip 1 | 0 rows |
| S13 | C accepts a valid invite to Trip 1 | C becomes a member; only Trip 1 |
| S14 | Anyone accepts an expired invite | denied |
| S15 | Anyone accepts an already-used invite | denied |
| S16 | Non-owner updates Trip 1 details | denied |
| S17 | Owner deletes Trip 1 | cascades remove items, notes, invites |
| S18 | C reads or inserts a cover image under trip-covers/Trip 1 | denied |
| S19 | B reads a cover image under trip-covers/Trip 1 | allowed |
| S20 | A reads own avatar; B reads A's avatar; C reads A's avatar; B writes A's avatar | own and trip-mate reads allowed; non-member read and non-owner write denied |
| F1 | anon and authenticated call `is_trip_member` | anon denied; authenticated allowed |

## 8. pgTAP example (S7, the core guarantee)

```sql
begin;
select plan(1);

select tests.create_supabase_user('a@test.com');
select tests.create_supabase_user('b@test.com');

-- (helper setup inserts a trip with A and B as members, omitted for brevity)

-- A writes a private note
select tests.authenticate_as('a@test.com');
insert into trip_notes (trip_id, author_id, body, is_private)
values (tests.get_trip_id('trip1'), tests.get_supabase_uid('a@test.com'),
        'A private note', true);

-- B must not see it
select tests.authenticate_as('b@test.com');
select results_eq(
  'select count(*) from trip_notes where body = ''A private note''',
  ARRAY[0::bigint],
  'B cannot read A private note (S7)'
);

select * from finish();
rollback;
```

## 9. Application-level integration test (mirror of S7)

```ts
test('a partner cannot read a private note', async () => {
  await signInAs(a)
  const note = await createNote({ tripId, body: 'secret', isPrivate: true })

  await signInAs(b)
  const { data } = await supabase
    .from('trip_notes')
    .select()
    .eq('id', note.id)

  expect(data?.length ?? 0).toBe(0)
})
```

## 10. Security checklist (per change)

- RLS is enabled on any new table before it is used.
- Every new policy has at least one positive and one negative test.
- No client path uses the service-role key.
- Any privileged action is a reviewed security-definer function with a fixed
  `search_path`.
- New storage buckets have matching object policies.

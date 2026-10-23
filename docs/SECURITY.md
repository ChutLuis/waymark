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
  ships in the app; privileged writes use the `create_trip`,
  `get_or_create_trip_invite` and `accept_trip_invite` security-definer RPCs,
  and account deletion runs in the `delete-account` Edge Function (§6.1).
- A secret-exposure audit of the exported bundle found only public values: the
  Supabase URL, Supabase anon key, and EAS project ID.

### Email confirmation (currently OFF)

The hosted project has `auth.email.enable_confirmations = false`, matching local
`supabase/config.toml`. Sign-up therefore returns a session immediately and
sends no email. This was turned off deliberately on 2026-10-13 to unblock QA.

The confirmation flow is implemented and **dormant** — unreachable while
confirmation is off — so re-enabling it after QA needs a settings change only,
no code change:

- `useSignUp` passes `options.emailRedirectTo` (authDeepLink.ts `authRedirectUrl`).
- `app/auth-callback.tsx` exchanges the PKCE code for a session; the PKCE
  verifier is stored through the same SecureStore adapter (native; web uses the
  default browser storage), so the exchange runs on the device that signed up.
- Redirect URLs are registered on the hosted project:
  `waymark-dev://**`, `waymark-test://**`, `waymark://**`.

To re-enable: Dashboard → Authentication → Sign In / Providers → Email →
"Confirm email" ON. The API field is `mailer_autoconfirm`, which is **inverted**
(auto-confirm ON means confirmation OFF).

There is no `supabase` CLI command that sets one hosted auth setting, and
`supabase config push` must never be used to make this change: it pushes every
declared property, which would wipe the registered redirect URLs above, change
`site_url` (already loopback on hosted), disable MFA TOTP, enable
`storage.vector`, lower `otp_length` from 8 to 6, weaken the email rate limit
from 1m to 1s, and change the pooler limits. Use the Dashboard, or a partial
Management API `PATCH /v1/projects/{ref}/config/auth` sending only
`mailer_autoconfirm`. (`supabase config diff` is read-only and safe — use it to
inspect hosted state.)

### Password length and redirect URLs

The app requires 8+ characters at sign-up and password reset. Local
`supabase/config.toml` enforces the same on the server
(`minimum_password_length = 8`) and allows the three app schemes as redirect
URLs, so confirmation and password-reset links reopen the right build. The
hosted project must match: Dashboard → Authentication → Sign In / Providers →
Email → minimum password length 8 (same rule as above: never
`supabase config push`).

### Client-side hardening

- Sessions use `expo-secure-store` through a chunked adapter. On iOS the
  keychain items are `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so a session is
  never restored onto another device from a backup; Android encrypts with a
  key that never leaves the device.
- Auth uses the PKCE flow, including password reset: the reset email links to
  `<scheme>://auth-callback?next=reset-password`, the app exchanges the code
  on the device that asked, then asks for a new 8+ character password. The
  request screen answers the same way whether or not the email has an account.
- Whenever a session ends (sign-out, account deletion, a revoked session,
  another account signing in) the TanStack Query cache is cleared, that
  account's scheduled reminders are cancelled and delivered ones removed, its
  on-device reminder list is deleted, and any pending invite code is dropped.
  Reminder notifications carry trip and stop titles, so they must not outlive
  the account that set them.
- Release builds (`test`, `production`) are not debuggable, ship no dev
  client, block cleartext HTTP, and run R8 with Hermes bytecode. The only
  bundled configuration is the Supabase URL and anon key, from the profile's
  EAS environment; the build fails on a missing, non-HTTPS or loopback URL.
  See `BUILDS.md`.

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
- Trip creation, invite creation and invite acceptance go only through the
  `create_trip`, `get_or_create_trip_invite` and `accept_trip_invite`
  security-definer RPCs: clients have no INSERT privilege on `trips` or
  `trip_invites`.
- Invariants the app relies on are enforced by the database, not the client:
  table checks (non-blank names and bodies, length limits, a trip's end not
  before its start and at most a year long, an invite code of 8 uppercase
  letters/digits living at most 30 days) and triggers (an owner can't leave
  their own trip, packing items are assigned only to members, `created_by` on
  items is the caller). Triggers that only constrain clients test
  `current_user in ('authenticated', 'anon')`: reviewed server code — a
  security-definer function, a foreign-key cascade, the service role — runs as
  the function or table owner and is not limited.
- Every security-definer function and trigger pins `search_path = ''` and
  schema-qualifies what it touches.

## 4. Membership helper (avoids recursion)

Policies on `trips`, `itinerary_items`, `packing_items`, and `trip_notes` need
to ask "is the current user a member of this trip". Asking that with a normal
subquery against `trip_members` from within a policy that also guards
`trip_members` causes infinite recursion. The fix is a single security-definer
function that reads membership with the definer's rights:

```sql
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.trip_members
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

- Read: members. Insert: only through `create_trip` (no client INSERT
  privilege). Update and delete: owner only.

```sql
create policy trips_select on trips for select
  using (is_trip_member(id));

create policy trips_update on trips for update
  using (is_trip_owner(id)) with check (is_trip_owner(id));

create policy trips_delete on trips for delete
  using (is_trip_owner(id));
```

`create_trip(...)` validates its input (trimmed non-blank name up to 200
characters, destination up to 120, end not before start, at most 366 days) and
inserts the trip and the owner's `trip_members` row atomically, so a trip is
never left without an owner. Table checks repeat the same rules for owner
edits. `trips.created_by` can't be changed by a client update
(`prevent_trip_creator_mutation`), only by the account-deletion handover, and
its foreign key is `on delete restrict`: deleting a user who still owns trips
(for example from the dashboard) is refused rather than cascading those shared
trips away. Use the `delete-account` function, which hands trips over first.

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

Two triggers keep memberships consistent:

- `guard_owner_membership` (before delete): a client can't delete the
  owner's own membership — the trip would be left with nobody who can edit or
  delete it — so an owner deletes the trip instead. Cascades from a trip
  delete and the account-deletion handover are not affected.
- `release_departed_member` (after delete): when a member leaves or is
  removed, their packing items become unassigned and their unused invites to
  that trip are deleted, so an old code can't bring them back.

### 5.4 trip_invites

- Read: the creator or a trip owner. Delete: the creator or a trip owner.
  Insert: only through `get_or_create_trip_invite` (no client INSERT or
  UPDATE privilege). Acceptance mutates the invite through a function.

```sql
create policy invites_select on trip_invites for select
  using (created_by = auth.uid() or is_trip_owner(trip_id));

create policy invites_delete on trip_invites for delete
  using (is_trip_owner(trip_id) or created_by = auth.uid());
```

`get_or_create_trip_invite(trip_id)` returns the caller's newest unused invite
while it has more than a day left, otherwise mints a new one: 8 characters
from an alphabet without lookalikes, drawn with `extensions.gen_random_bytes`
(rejection sampling, so every character is equally likely), valid 7 days. Only
members can call it. Checks on the table keep every code at 8 uppercase
letters/digits and every invite at most 30 days long.

An invite stops working when the member who made it is no longer on the trip
(their unused invites are also deleted when they leave). Unknown and revoked
codes don't raise: `preview_trip_invite` returns no row and
`accept_trip_invite` returns null, so the failed guess can be recorded in
`invite_attempts` (an exception would roll that back); the app reports both as
an invalid invite. After 10 failed guesses in 15 minutes, both functions refuse
further lookups for that user with `too many attempts`. Used and expired codes
still raise their own messages, which is only useful to someone who already
holds a real code.

The acceptance function (security definer) validates and joins in one step.
Its shape, before the revocation and throttling above were added:

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

  -- Already on the trip: nothing to join, and the code is left as it is.
  if exists (
    select 1 from trip_members
    where trip_id = v_invite.trip_id and user_id = auth.uid()
  ) then
    return v_invite.trip_id;
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
trip the code belongs to. Membership is checked before the invite's state: a
caller who is already a member gets the trip id back for any known code (unused,
used or expired) and the invite is not touched. `preview_trip_invite` reports
the same membership as `is_member`, so the Join screen offers Open trip instead
of Join. Non-members still get the invalid, already-used and expired errors.

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

A client's insert is attributed to the caller whatever `created_by` it sends,
and the attribution can't be rewritten (`stamp_item_creator`). A packing item
can only be assigned to a member of its trip (`check_packing_assignee`).

### 5.6 trip_notes (the private-versus-shared rule)

- Read: you must be a member, and the note is either shared or authored by you.
- Insert: you must be a member and set yourself as author.
- Update and delete: the author, while still a member. A note can't be moved
  to another trip or given another author (`prevent_note_reassignment`).

```sql
create policy notes_select on trip_notes for select using (
  is_trip_member(trip_id)
  and (is_private = false or author_id = auth.uid())
);

create policy notes_insert on trip_notes for insert with check (
  is_trip_member(trip_id) and author_id = auth.uid()
);

create policy notes_update on trip_notes for update
  using (author_id = auth.uid() and is_trip_member(trip_id))
  with check (author_id = auth.uid() and is_trip_member(trip_id));

create policy notes_delete on trip_notes for delete
  using (author_id = auth.uid() and is_trip_member(trip_id));
```

## 6. Storage policies

Objects live under a path whose first folder is the owning id. Policies on
`storage.objects` reuse the membership rules.

Trip covers are readable by trip members and writable (insert, update,
delete) by the trip owner only, matching `trips_update`, which already limits
setting `cover_image_path` to the owner. Avatars are readable by their owner or
a trip-mate and writable by their owner only. Both buckets accept images only
(`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`) up to
10 MB.

```sql
-- trip-covers/{trip_id}/{file}
create policy trip_covers_read on storage.objects for select
  using (
    bucket_id = 'trip-covers'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );
-- trip_covers_insert / trip_covers_update / trip_covers_delete use the same
-- shape with is_trip_owner(...).

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

### 6.1 Account deletion

The client can't delete an auth user, so `delete-account` (Edge Function, service
role) does it for the caller identified by their own JWT:

1. `delete_account_prepare(user)` hands every trip the user owns to its
   earliest-joined other member (owner role and `created_by`), or deletes it
   when they are alone and records it in `account_deletion_trips`; moves cover
   objects they uploaded to trips that live on over to each trip's owner; and
   removes their memberships. It is idempotent and returns every trip deleted
   for the user so far, so a retry after a failure loses nothing.
2. `account_storage_objects(user)` lists everything still tied to the user —
   their avatar folder, the cover folders of their deleted trips, anything else
   they own — and the function removes it through the Storage API in rounds
   until the list is empty.
3. Only then is the auth user deleted; the cascade removes the profile, notes
   and invites, and itinerary/packing items they added to shared trips stay
   with `created_by` nulled.

Any failure returns a generic code (`prepare_failed`, `cleanup_incomplete`,
`delete_failed`) with details only in the function log, and the user stays
signed in to retry. The last two carry `stage: "after_prepare"`: the handover
has already committed, so the app says the account is partly deleted (trips
handed over or removed) and refreshes the trips list instead of claiming
nothing changed. Both helper functions are service-role only.

## 7. RLS test matrix

The pgTAP suite (102 assertions in 11 files) covers every scenario below; a
scenario row can contain multiple assertions. "A" and "B" are members of Trip 1;
"C" is not a member. All tests run inside a transaction that is rolled back.

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
| S14 | A non-member accepts an expired invite | denied |
| S15 | A non-member accepts an already-used invite | denied |
| S16 | Non-owner updates Trip 1 details | denied |
| S17 | Owner deletes Trip 1 | cascades remove items, notes, invites |
| S18 | C reads or inserts a cover image under trip-covers/Trip 1 | denied |
| S19 | B reads a cover image under trip-covers/Trip 1 | allowed |
| S20 | A reads own avatar; B reads A's avatar; C reads A's avatar; B writes A's avatar | own and trip-mate reads allowed; non-member read and non-owner write denied |
| F1 | anon and authenticated call `is_trip_member` | anon denied; authenticated allowed |
| I1–I6 | A client inserts a trip directly; `create_trip` with a padded, blank, backwards or over-a-year trip | direct insert denied; name trimmed, caller is owner; the rest rejected |
| I7–I10 | The owner deletes their own membership; a member leaves | owner denied; member leaves, their packing items unassigned, their unused invite deleted |
| I11–I14 | Assign a packing item to a non-member; add a stop claiming another creator; blank note | assignment denied; stop attributed to the caller; note refused |
| I15–I19 | A client inserts an invite; a member asks for an invite twice; a non-member asks | insert denied; one 8-character, 7-day code reused; non-member denied |
| I20–I23 | Preview/accept a code whose creator left; ten unknown codes in a row | no trip, no membership; lookups paused with `too many attempts` |
| I24–I25 | A member and the owner upload a trip cover | member denied; owner allowed |
| I26–I30 | Delete an owner directly; `delete_account_prepare` twice; `account_storage_objects` | direct delete refused; solo trip deleted and reported on both runs, shared cover passes to the heir, avatar and deleted-trip cover listed |

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
- Any privileged action is a reviewed security-definer function with
  `search_path = ''`.
- New tables and functions in `public` revoke the default anon/authenticated
  grants Supabase adds unless a client really needs them.
- New storage buckets have matching object policies.

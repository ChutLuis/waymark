begin;
select plan(32);

-- Setup runs as postgres, before any authenticated role is selected.
select tests.create_supabase_user('owner@test.com');
select tests.create_supabase_user('member@test.com');
select tests.create_supabase_user('leaver@test.com');
select tests.create_supabase_user('outsider@test.com');
select tests.create_supabase_user('guesser@test.com');

insert into trips (id, name, created_by)
values ('11111111-1111-1111-1111-111111111111', 'Trip 1', tests.get_supabase_uid('owner@test.com'));
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('owner@test.com'), 'owner', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('member@test.com'), 'member', now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('leaver@test.com'), 'member', now() - interval '1 day');

-- The leaver has a packing item and an unused invite on Trip 1.
insert into packing_items (id, trip_id, label, assigned_to)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tent', tests.get_supabase_uid('leaver@test.com'));
insert into trip_invites (trip_id, code, created_by, expires_at)
values ('11111111-1111-1111-1111-111111111111', 'LEAVER23', tests.get_supabase_uid('leaver@test.com'), now() + interval '7 days');

-- ---------------------------------------------------------------- trips
select tests.authenticate_as('member@test.com');

select throws_ok(
  $$insert into trips (name, created_by) values ('Direct', auth.uid())$$,
  '42501',
  null,
  'I1: a client cannot insert a trip directly (create_trip is the only path)'
);

select results_eq(
  $$select name from create_trip('  Lisbon long weekend  ', 'Portugal', '2026-11-06', '2026-11-08')$$,
  $$values ('Lisbon long weekend'::text)$$,
  'I2: create_trip trims the name'
);

select results_eq(
  $$select m.role from trip_members m join trips t on t.id = m.trip_id
    where t.name = 'Lisbon long weekend' and m.user_id = auth.uid()$$,
  $$values ('owner'::text)$$,
  'I3: create_trip makes the caller the owner'
);

select throws_ok(
  $$select create_trip('   ')$$,
  '22023',
  'Give the trip a name',
  'I4: create_trip rejects an empty name'
);

select throws_ok(
  $$select create_trip('Backwards', null, '2026-11-08', '2026-11-06')$$,
  '22023',
  'A trip can''t end before it starts',
  'I5: create_trip rejects an end before the start'
);

select throws_ok(
  $$select create_trip('Forever', null, '2026-01-01', '2027-06-01')$$,
  '22023',
  'A trip can be up to a year long',
  'I6: create_trip rejects a trip longer than a year'
);

-- ----------------------------------------------------------- memberships
select tests.authenticate_as('owner@test.com');
select throws_ok(
  $$delete from trip_members
    where trip_id = '11111111-1111-1111-1111-111111111111' and user_id = auth.uid()$$,
  '42501',
  'The trip owner can''t leave the trip. Delete it instead.',
  'I7: the owner cannot remove their own membership'
);

select tests.authenticate_as('leaver@test.com');
select lives_ok(
  $$delete from trip_members
    where trip_id = '11111111-1111-1111-1111-111111111111' and user_id = auth.uid()$$,
  'I8: a member can leave'
);

reset role;
select is(
  (select assigned_to from packing_items where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'I9: the leaver''s packing items become unassigned'
);
select is(
  (select count(*) from trip_invites where code = 'LEAVER23'),
  0::bigint,
  'I10: the leaver''s unused invites are deleted'
);

-- ------------------------------------------------------- shared content
select tests.authenticate_as('member@test.com');
select throws_ok(
  $$insert into packing_items (trip_id, label, assigned_to)
    values ('11111111-1111-1111-1111-111111111111', 'Stove', tests.get_supabase_uid('outsider@test.com'))$$,
  '23514',
  'Packing items can only be assigned to trip members',
  'I11: a packing item cannot be assigned to a non-member'
);

select lives_ok(
  $$insert into itinerary_items (trip_id, title, created_by)
    values ('11111111-1111-1111-1111-111111111111', 'Spoofed', tests.get_supabase_uid('owner@test.com'))$$,
  'I12: a member adds a stop while claiming someone else created it'
);
select results_eq(
  $$select created_by from itinerary_items where title = 'Spoofed'$$,
  $$select tests.get_supabase_uid('member@test.com')$$,
  'I13: the stop is attributed to the member who added it'
);

select throws_ok(
  $$insert into trip_notes (trip_id, author_id, body)
    values ('11111111-1111-1111-1111-111111111111', auth.uid(), '   ')$$,
  '23514',
  null,
  'I14: a blank note body is refused'
);

-- -------------------------------------------------------------- invites
select throws_ok(
  $$insert into trip_invites (trip_id, code, created_by, expires_at)
    values ('11111111-1111-1111-1111-111111111111', 'CLIENT23', auth.uid(), now() + interval '100 years')$$,
  '42501',
  null,
  'I15: a client cannot insert an invite directly'
);

select matches(
  (select code from get_or_create_trip_invite('11111111-1111-1111-1111-111111111111')),
  '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$',
  'I16: the server mints an 8-character code without lookalike characters'
);

select ok(
  (select expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute'
   from get_or_create_trip_invite('11111111-1111-1111-1111-111111111111')),
  'I17: a minted invite lasts seven days'
);

select is(
  (select count(*) from trip_invites
   where trip_id = '11111111-1111-1111-1111-111111111111' and created_by = auth.uid()),
  1::bigint,
  'I18: asking again reuses the member''s active invite'
);

select tests.authenticate_as('outsider@test.com');
select throws_ok(
  $$select get_or_create_trip_invite('11111111-1111-1111-1111-111111111111')$$,
  '42501',
  'not a member of this trip',
  'I19: a non-member cannot mint an invite'
);

-- An invite whose creator is no longer on the trip is dead.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at)
values ('11111111-1111-1111-1111-111111111111', 'ORPHAN23', tests.get_supabase_uid('leaver@test.com'), now() + interval '7 days');
select tests.authenticate_as('outsider@test.com');
select is_empty(
  $$select * from preview_trip_invite('ORPHAN23')$$,
  'I20: a code made by someone who left previews as nothing'
);
select is(
  (select accept_trip_invite('ORPHAN23')),
  null,
  'I21: accepting a code made by someone who left joins nothing'
);
select is(
  (select count(*) from trip_members where user_id = auth.uid()),
  0::bigint,
  'I22: the outsider is still not a member'
);

-- Ten unknown codes in a row pause further lookups for that user.
select tests.authenticate_as('guesser@test.com');
do $$
begin
  for i in 1 .. 10 loop
    perform * from public.preview_trip_invite('NOPE000' || i::text);
  end loop;
end $$;
select throws_ok(
  $$select * from preview_trip_invite('ANYCODE1')$$,
  'P0001',
  'too many attempts',
  'I23: lookups pause after ten failed guesses'
);

-- Recording a failed guess prunes that user's attempts older than a day.
reset role;
insert into invite_attempts (user_id, attempted_at)
values (tests.get_supabase_uid('outsider@test.com'), now() - interval '2 days');
select tests.authenticate_as('outsider@test.com');
select is_empty($$select * from preview_trip_invite('NOPE9999')$$, 'outsider guesses once more');
reset role;
select is(
  (select count(*) from invite_attempts
   where user_id = tests.get_supabase_uid('outsider@test.com')
     and attempted_at < now() - interval '1 day'),
  0::bigint,
  'I31: old failed guesses are pruned when a new one is recorded'
);

-- -------------------------------------------------------------- storage
select tests.authenticate_as('member@test.com');
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('trip-covers', '11111111-1111-1111-1111-111111111111/member-cover.jpg')$$,
  '42501',
  null,
  'I24: a member who is not the owner cannot upload a trip cover'
);
select tests.authenticate_as('owner@test.com');
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('trip-covers', '11111111-1111-1111-1111-111111111111/owner-cover.jpg')$$,
  'I25: the owner can upload a trip cover'
);

-- ------------------------------------------------------ account deletion
reset role;
select set_config('tests.departing_uid', tests.create_supabase_user('departing@test.com')::text, false);
select set_config('tests.heir_uid', tests.create_supabase_user('heir@test.com')::text, false);

insert into trips (id, name, created_by) values
  ('d1111111-1111-1111-1111-111111111111', 'Shared', current_setting('tests.departing_uid')::uuid),
  ('d2222222-2222-2222-2222-222222222222', 'Solo', current_setting('tests.departing_uid')::uuid);
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('d1111111-1111-1111-1111-111111111111', current_setting('tests.departing_uid')::uuid, 'owner', now() - interval '2 days'),
  ('d1111111-1111-1111-1111-111111111111', current_setting('tests.heir_uid')::uuid, 'member', now() - interval '1 day'),
  ('d2222222-2222-2222-2222-222222222222', current_setting('tests.departing_uid')::uuid, 'owner', now());
insert into storage.objects (bucket_id, name, owner, owner_id) values
  ('trip-covers', 'd1111111-1111-1111-1111-111111111111/cover.jpg', current_setting('tests.departing_uid')::uuid, current_setting('tests.departing_uid')),
  ('trip-covers', 'd2222222-2222-2222-2222-222222222222/cover.jpg', current_setting('tests.departing_uid')::uuid, current_setting('tests.departing_uid')),
  ('avatars', current_setting('tests.departing_uid') || '/avatar.jpg', current_setting('tests.departing_uid')::uuid, current_setting('tests.departing_uid'));

select throws_ok(
  $$delete from auth.users where id = current_setting('tests.departing_uid')::uuid$$,
  '23503',
  null,
  'I26: a user who still owns trips cannot be deleted before the handover'
);

select results_eq(
  $$select public.delete_account_prepare(current_setting('tests.departing_uid')::uuid)$$,
  $$select array['d2222222-2222-2222-2222-222222222222']::uuid[]$$,
  'I27: prepare deletes the solo trip and reports it'
);

select results_eq(
  $$select owner from storage.objects
    where bucket_id = 'trip-covers' and name = 'd1111111-1111-1111-1111-111111111111/cover.jpg'$$,
  $$select current_setting('tests.heir_uid')::uuid$$,
  'I28: the cover of the trip that lives on now belongs to its new owner'
);

select results_eq(
  $$select bucket_id, name from public.account_storage_objects(current_setting('tests.departing_uid')::uuid)$$,
  $$values ('avatars'::text, current_setting('tests.departing_uid') || '/avatar.jpg'),
           ('trip-covers'::text, 'd2222222-2222-2222-2222-222222222222/cover.jpg'::text)$$,
  'I29: the objects left to remove are the avatar and the deleted trip''s cover'
);

select results_eq(
  $$select public.delete_account_prepare(current_setting('tests.departing_uid')::uuid)$$,
  $$select array['d2222222-2222-2222-2222-222222222222']::uuid[]$$,
  'I30: running prepare again still reports the trips deleted earlier'
);

select * from finish();
rollback;

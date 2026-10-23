begin;
select plan(6);

-- Setup runs as postgres, before any authenticated role is selected.
select tests.create_supabase_user('owner@test.com');
select tests.create_supabase_user('outsider@test.com');

insert into profiles (id, display_name)
values (tests.get_supabase_uid('owner@test.com'), 'Mia Junot');

insert into trips (id, name, destination, start_date, end_date, created_by)
values (
  '22222222-2222-2222-2222-222222222222',
  'Kyoto & Nara',
  'Kyoto, Japan',
  '2026-03-28',
  '2026-04-06',
  tests.get_supabase_uid('owner@test.com')
);

insert into trip_members (trip_id, user_id, role)
values ('22222222-2222-2222-2222-222222222222', tests.get_supabase_uid('owner@test.com'), 'owner');

-- P1: a non-member can preview a valid invite's trip fields and inviter.
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'PREVIEW1',
  tests.get_supabase_uid('owner@test.com'),
  now() + interval '7 days'
);
select tests.authenticate_as('outsider@test.com');
select results_eq(
  $$select name, inviter_name from preview_trip_invite('PREVIEW1')$$,
  $$values ('Kyoto & Nara'::text, 'Mia Junot'::text)$$,
  'P1: a non-member sees the trip name and inviter for a valid code'
);

-- P2: the preview is case- and whitespace-insensitive.
select results_eq(
  $$select trip_id from preview_trip_invite('  preview1 ')$$,
  $$values ('22222222-2222-2222-2222-222222222222'::uuid)$$,
  'P2: the code is normalised before lookup'
);

-- P3: it does not make the outsider a member.
select results_eq(
  $$select count(*) from trip_members where user_id = tests.get_supabase_uid('outsider@test.com')$$,
  array[0::bigint],
  'P3: previewing does not join the outsider'
);

-- P4: an unknown code returns no trip (the app reports it as an invalid
-- invite). It doesn't raise, so the failed guess can be recorded.
select is_empty(
  $$select * from preview_trip_invite('NOPE1234')$$,
  'P4: an unknown code returns no trip'
);

-- P5: an expired code is rejected.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'EXPIRED1',
  tests.get_supabase_uid('owner@test.com'),
  now() - interval '1 second'
);
select tests.authenticate_as('outsider@test.com');
select throws_ok(
  $$select preview_trip_invite('EXPIRED1')$$,
  'P0001',
  'invite expired',
  'P5: an expired code is rejected'
);

-- P6: an already-used code is rejected.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at, accepted_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'USEDONE1',
  tests.get_supabase_uid('owner@test.com'),
  now() + interval '7 days',
  now()
);
select tests.authenticate_as('outsider@test.com');
select throws_ok(
  $$select preview_trip_invite('USEDONE1')$$,
  'P0001',
  'invite already used',
  'P6: a used code is rejected'
);

reset role;
select * from finish();
rollback;
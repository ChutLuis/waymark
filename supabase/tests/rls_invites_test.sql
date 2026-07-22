begin;
select plan(6);

-- Setup runs as postgres, before any authenticated role is selected.
select tests.create_supabase_user('a@test.com');
select tests.create_supabase_user('b@test.com');
select tests.create_supabase_user('c@test.com');

insert into trips (id, name, destination, created_by)
values (
  '11111111-1111-1111-1111-111111111111',
  'Trip 1',
  'Test destination',
  tests.get_supabase_uid('a@test.com')
);

insert into trip_members (trip_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('a@test.com'), 'owner'),
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('b@test.com'), 'member');

-- S13: a valid invite adds only its caller to its one target trip.
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'valid-trip-1-invite',
  tests.get_supabase_uid('a@test.com'),
  now() + interval '1 day'
);
select tests.authenticate_as('c@test.com');
select lives_ok(
  $$select accept_trip_invite('valid-trip-1-invite')$$,
  'S13: C can accept a valid Trip 1 invite'
);
select results_eq(
  $$select count(*) from trip_members
    where trip_id = '11111111-1111-1111-1111-111111111111'
      and user_id = tests.get_supabase_uid('c@test.com')$$,
  array[1::bigint],
  'S13: C becomes a Trip 1 member'
);
select results_eq(
  $$select count(*) from trip_members where user_id = tests.get_supabase_uid('c@test.com')$$,
  array[1::bigint],
  'S13: C is a member of exactly one trip'
);

-- S14: expiry is enforced by the security-definer acceptance RPC.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'expired-trip-1-invite',
  tests.get_supabase_uid('a@test.com'),
  now() - interval '1 second'
);
select tests.authenticate_as('c@test.com');
select throws_ok(
  $$select accept_trip_invite('expired-trip-1-invite')$$,
  'P0001',
  'invite expired',
  'S14: accepting an expired invite is denied'
);

-- S15: an accepted invite cannot be accepted again by another user.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'single-use-trip-1-invite',
  tests.get_supabase_uid('a@test.com'),
  now() + interval '1 day'
);
select tests.authenticate_as('b@test.com');
select lives_ok(
  $$select accept_trip_invite('single-use-trip-1-invite')$$,
  'S15: B can accept an unused invite'
);
select tests.authenticate_as('c@test.com');
select throws_ok(
  $$select accept_trip_invite('single-use-trip-1-invite')$$,
  'P0001',
  'invite already used',
  'S15: accepting an already-used invite is denied'
);

reset role;
select * from finish();
rollback;

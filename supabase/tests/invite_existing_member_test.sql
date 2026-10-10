begin;
select plan(19);

-- Setup runs as postgres, before any authenticated role is selected.
select tests.create_supabase_user('owner@test.com');
select tests.create_supabase_user('member@test.com');
select tests.create_supabase_user('newcomer@test.com');
select tests.create_supabase_user('latecomer@test.com');

insert into profiles (id, display_name)
values (tests.get_supabase_uid('owner@test.com'), 'Mia');

insert into trips (id, name, destination, created_by)
values (
  '33333333-3333-3333-3333-333333333333',
  'Berlin weekend',
  'Berlin, Germany',
  tests.get_supabase_uid('owner@test.com')
);

insert into trip_members (trip_id, user_id, role) values
  ('33333333-3333-3333-3333-333333333333', tests.get_supabase_uid('owner@test.com'), 'owner'),
  ('33333333-3333-3333-3333-333333333333', tests.get_supabase_uid('member@test.com'), 'member');

insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'MEMBER23',
  tests.get_supabase_uid('owner@test.com'),
  now() + interval '7 days'
);

-- The invite row as the member case starts.
select diag('before member accept: ' || format('code=%s accepted_at=%s accepted_by=%s', code, coalesce(accepted_at::text, 'null'), coalesce(accepted_by::text, 'null')))
from trip_invites where code = 'MEMBER23';

-- M1: the preview tells a member they are already on the trip.
select tests.authenticate_as('member@test.com');
select results_eq(
  $$select name, is_member from preview_trip_invite('MEMBER23')$$,
  $$values ('Berlin weekend'::text, true)$$,
  'M1: a member previewing the code is told they are already on the trip'
);

-- M2: a member accepting gets the trip id back.
select results_eq(
  $$select accept_trip_invite('MEMBER23')$$,
  $$values ('33333333-3333-3333-3333-333333333333'::uuid)$$,
  'M2: a member accepting gets the trip id'
);

reset role;
select diag('after member accept: ' || format('code=%s accepted_at=%s accepted_by=%s', code, coalesce(accepted_at::text, 'null'), coalesce(accepted_by::text, 'null')))
from trip_invites where code = 'MEMBER23';

-- M3: the member's accept leaves the invite unused.
select results_eq(
  $$select accepted_at is null, accepted_by is null from trip_invites where code = 'MEMBER23'$$,
  $$values (true, true)$$,
  'M3: a member accepting leaves the invite unused'
);

-- M4: membership is unchanged: still one row, still a member.
select results_eq(
  $$select role::text from trip_members
    where trip_id = '33333333-3333-3333-3333-333333333333'
      and user_id = tests.get_supabase_uid('member@test.com')$$,
  $$values ('member'::text)$$,
  'M4: the member keeps their one membership row and role'
);

-- M5: the preview tells a non-member they are not on the trip yet.
select tests.authenticate_as('newcomer@test.com');
select results_eq(
  $$select is_member from preview_trip_invite('MEMBER23')$$,
  $$values (false)$$,
  'M5: a non-member previewing the code is not on the trip'
);

-- M6: a non-member accepting the same code joins the trip.
select results_eq(
  $$select accept_trip_invite('MEMBER23')$$,
  $$values ('33333333-3333-3333-3333-333333333333'::uuid)$$,
  'M6: a non-member accepting gets the trip id'
);

reset role;
select diag('after non-member accept: ' || format('code=%s accepted=%s accepted_by_newcomer=%s', code, accepted_at is not null, accepted_by = tests.get_supabase_uid('newcomer@test.com')))
from trip_invites where code = 'MEMBER23';

select results_eq(
  $$select count(*) from trip_members
    where trip_id = '33333333-3333-3333-3333-333333333333'
      and user_id = tests.get_supabase_uid('newcomer@test.com')$$,
  array[1::bigint],
  'M7: the non-member becomes a member'
);

-- M8: the non-member's accept uses the invite.
select results_eq(
  $$select accepted_at is not null, accepted_by from trip_invites where code = 'MEMBER23'$$,
  $$values (true, tests.get_supabase_uid('newcomer@test.com'))$$,
  'M8: a non-member accepting uses the invite'
);

-- M9: the used code is rejected for the next non-member.
select tests.authenticate_as('latecomer@test.com');
select throws_ok(
  $$select accept_trip_invite('MEMBER23')$$,
  'P0001',
  'invite already used',
  'M9: an already-used code is still rejected'
);

-- M10-M12: a member with the used code still gets their trip, and the
-- invite is left exactly as the newcomer's accept left it.
select tests.authenticate_as('member@test.com');
select results_eq(
  $$select name, is_member from preview_trip_invite('MEMBER23')$$,
  $$values ('Berlin weekend'::text, true)$$,
  'M10: a member previewing a used code is told they are already on the trip'
);
select results_eq(
  $$select accept_trip_invite('MEMBER23')$$,
  $$values ('33333333-3333-3333-3333-333333333333'::uuid)$$,
  'M11: a member accepting a used code gets the trip id'
);
reset role;
select results_eq(
  $$select accepted_by from trip_invites where code = 'MEMBER23'$$,
  $$values (tests.get_supabase_uid('newcomer@test.com'))$$,
  'M12: a member accepting a used code leaves the invite unchanged'
);

-- M13: the rejected accept did not join the latecomer.
select results_eq(
  $$select count(*) from trip_members where user_id = tests.get_supabase_uid('latecomer@test.com')$$,
  array[0::bigint],
  'M13: a rejected accept does not join the caller'
);

-- M14: a non-member previewing the used code gets the same error as before.
select tests.authenticate_as('latecomer@test.com');
select throws_ok(
  $$select preview_trip_invite('MEMBER23')$$,
  'P0001',
  'invite already used',
  'M14: a non-member previewing a used code is still rejected'
);

-- M15-M19: an expired code opens the trip for a member and stays rejected
-- for a non-member.
reset role;
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'EXPIRD23',
  tests.get_supabase_uid('owner@test.com'),
  now() - interval '1 second'
);
select tests.authenticate_as('member@test.com');
select results_eq(
  $$select is_member from preview_trip_invite('EXPIRD23')$$,
  $$values (true)$$,
  'M15: a member previewing an expired code is told they are already on the trip'
);
select results_eq(
  $$select accept_trip_invite('EXPIRD23')$$,
  $$values ('33333333-3333-3333-3333-333333333333'::uuid)$$,
  'M16: a member accepting an expired code gets the trip id'
);
reset role;
select results_eq(
  $$select accepted_at is null, accepted_by is null from trip_invites where code = 'EXPIRD23'$$,
  $$values (true, true)$$,
  'M17: a member accepting an expired code leaves it unused'
);
select tests.authenticate_as('latecomer@test.com');
select throws_ok(
  $$select preview_trip_invite('EXPIRD23')$$,
  'P0001',
  'invite expired',
  'M18: a non-member previewing an expired code is still rejected'
);
select throws_ok(
  $$select accept_trip_invite('EXPIRD23')$$,
  'P0001',
  'invite expired',
  'M19: a non-member accepting an expired code is still rejected'
);

reset role;
select * from finish();
rollback;

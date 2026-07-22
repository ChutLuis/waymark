begin;
select plan(7);

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

-- S1: non-members cannot discover a trip.
select tests.authenticate_as('c@test.com');
select results_eq(
  $$select count(*) from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  array[0::bigint],
  'S1: C cannot select Trip 1'
);

-- S2: members can read the trip.
select tests.authenticate_as('a@test.com');
select results_eq(
  $$select count(*) from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  array[1::bigint],
  'S2: A can select Trip 1'
);

-- S3: a non-member's shared-content insert must raise an RLS violation.
select tests.authenticate_as('c@test.com');
select throws_ok(
  $$insert into itinerary_items (trip_id, title)
    values ('11111111-1111-1111-1111-111111111111', 'C itinerary item')$$,
  '42501',
  'new row violates row-level security policy for table "itinerary_items"',
  'S3: C cannot insert an itinerary item into Trip 1'
);

-- S4: a member can add shared content.
select tests.authenticate_as('b@test.com');
select lives_ok(
  $$insert into itinerary_items (trip_id, title)
    values ('11111111-1111-1111-1111-111111111111', 'B itinerary item')$$,
  'S4: B can insert an itinerary item into Trip 1'
);

-- S5: both members read the same, non-empty itinerary.
select tests.authenticate_as('a@test.com');
select set_config(
  'tests.a_trip_1_itinerary_count',
  (select count(*)::text from itinerary_items
   where trip_id = '11111111-1111-1111-1111-111111111111'),
  true
);
select tests.authenticate_as('b@test.com');
select is(
  (select count(*)::text from itinerary_items
   where trip_id = '11111111-1111-1111-1111-111111111111'),
  current_setting('tests.a_trip_1_itinerary_count'),
  'S5: A and B read identical itineraries'
);
select ok(
  (select count(*) from itinerary_items
   where trip_id = '11111111-1111-1111-1111-111111111111') > 0,
  'S5: the shared itinerary is non-empty'
);

-- S16: a non-owner UPDATE is silently filtered by the policy.
select results_eq(
  $$with updated_trip as (
      update trips
      set destination = 'hacked by B'
      where id = '11111111-1111-1111-1111-111111111111'
      returning 1
    )
    select count(*)::int from updated_trip$$,
  array[0],
  'S16: B cannot update Trip 1 details'
);

reset role;
select * from finish();
rollback;

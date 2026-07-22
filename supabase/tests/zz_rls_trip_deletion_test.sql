begin;
select plan(2);

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
insert into itinerary_items (trip_id, title)
values ('11111111-1111-1111-1111-111111111111', 'Itinerary item');
insert into packing_items (trip_id, label)
values ('11111111-1111-1111-1111-111111111111', 'Packing item');
insert into trip_notes (trip_id, author_id, body, is_private)
values (
  '11111111-1111-1111-1111-111111111111',
  tests.get_supabase_uid('a@test.com'),
  'Trip note',
  true
);
insert into trip_invites (trip_id, code, created_by, expires_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'cascade-check-invite',
  tests.get_supabase_uid('a@test.com'),
  now() + interval '1 day'
);

-- S17: only the owner can delete the trip, and its dependent rows cascade.
select tests.authenticate_as('a@test.com');
select lives_ok(
  $$delete from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  'S17: A can delete Trip 1'
);

-- RESET ROLE returns to the postgres test connection for a complete cascade check.
reset role;
select ok(
  (select count(*) = 0 from itinerary_items where trip_id = '11111111-1111-1111-1111-111111111111')
  and (select count(*) = 0 from packing_items where trip_id = '11111111-1111-1111-1111-111111111111')
  and (select count(*) = 0 from trip_notes where trip_id = '11111111-1111-1111-1111-111111111111')
  and (select count(*) = 0 from trip_invites where trip_id = '11111111-1111-1111-1111-111111111111')
  and (select count(*) = 0 from trip_members where trip_id = '11111111-1111-1111-1111-111111111111'),
  'S17: deleting Trip 1 cascades to all child tables'
);

select * from finish();
rollback;

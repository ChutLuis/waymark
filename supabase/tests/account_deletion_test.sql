begin;
select plan(9);

-- Setup runs as postgres, before any authenticated role is selected.
select tests.create_supabase_user('owner@test.com');
select tests.create_supabase_user('first@test.com');
select tests.create_supabase_user('second@test.com');
select tests.create_supabase_user('solo@test.com');

-- Shared trip: owner + first (joined earlier) + second.
insert into trips (id, name, created_by)
values ('11111111-1111-1111-1111-111111111111', 'Shared trip', tests.get_supabase_uid('owner@test.com'));
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('owner@test.com'), 'owner', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('first@test.com'), 'member', now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('second@test.com'), 'member', now() - interval '1 day');
insert into itinerary_items (trip_id, title)
values ('11111111-1111-1111-1111-111111111111', 'Kept itinerary item');
insert into trip_notes (trip_id, author_id, body)
values ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('first@test.com'), 'A note by first');

-- Solo trip: owner only.
insert into trips (id, name, created_by)
values ('22222222-2222-2222-2222-222222222222', 'Solo trip', tests.get_supabase_uid('owner@test.com'));
insert into trip_members (trip_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', tests.get_supabase_uid('owner@test.com'), 'owner');
insert into packing_items (trip_id, label)
values ('22222222-2222-2222-2222-222222222222', 'Solo packing item');

-- The owner of a different trip that the departing user merely belongs to.
insert into trips (id, name, created_by)
values ('33333333-3333-3333-3333-333333333333', 'Someone else''s trip', tests.get_supabase_uid('solo@test.com'));
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('33333333-3333-3333-3333-333333333333', tests.get_supabase_uid('solo@test.com'), 'owner', now() - interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', tests.get_supabase_uid('owner@test.com'), 'member', now() - interval '4 days');

-- A profile for the departing user, to prove the auth cascade removes it.
insert into profiles (id, display_name)
values (tests.get_supabase_uid('owner@test.com'), 'Departing owner');

-- Act: prepare the departing owner's account for deletion.
select public.delete_account_prepare(tests.get_supabase_uid('owner@test.com'));

-- 1: the shared trip survives and passes to the earliest-joined remaining member.
select results_eq(
  $$select created_by from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  $$select tests.get_supabase_uid('first@test.com')$$,
  'shared trip passes to the first-joined remaining member'
);

-- 2: that member is now the owner role.
select results_eq(
  $$select role from trip_members
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and user_id = tests.get_supabase_uid('first@test.com')$$,
  $$values ('owner'::text)$$,
  'heir holds the owner role'
);

-- 3: only the heir is owner (single-owner invariant preserved).
select results_eq(
  $$select count(*) from trip_members
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and role = 'owner'$$,
  array[1::bigint],
  'exactly one owner remains on the shared trip'
);

-- 4: the shared trip's children are untouched.
select results_eq(
  $$select count(*) from itinerary_items where trip_id = '11111111-1111-1111-1111-111111111111'$$,
  array[1::bigint],
  'shared trip itinerary survives'
);

-- 5: the departing owner's membership is gone.
select results_eq(
  $$select count(*) from trip_members where user_id = tests.get_supabase_uid('owner@test.com')$$,
  array[0::bigint],
  'departing user no longer a member of anything'
);

-- 6: the solo trip is deleted.
select results_eq(
  $$select count(*) from trips where id = '22222222-2222-2222-2222-222222222222'$$,
  array[0::bigint],
  'solo trip is deleted'
);

-- 7: its children cascade away.
select results_eq(
  $$select count(*) from packing_items where trip_id = '22222222-2222-2222-2222-222222222222'$$,
  array[0::bigint],
  'solo trip children cascade'
);

-- 8: a trip owned by someone else is untouched by a mere member leaving.
select results_eq(
  $$select count(*) from trips where id = '33333333-3333-3333-3333-333333333333'$$,
  array[1::bigint],
  'a trip owned by someone else survives'
);

-- 9: deleting the auth user then cascades their authored rows.
select set_config('tests.owner_uid', tests.get_supabase_uid('owner@test.com')::text, false);
delete from auth.users where id = current_setting('tests.owner_uid')::uuid;
select results_eq(
  $$select count(*) from profiles where id = current_setting('tests.owner_uid')::uuid$$,
  array[0::bigint],
  'auth cascade removes the profile'
);

select * from finish();
rollback;
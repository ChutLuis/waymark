begin;
select plan(13);

-- Capture ids up front: get_supabase_uid() reads auth.users, which the cascade
-- removes, so it must not be called after the delete-user step.
select set_config('tests.owner_uid', tests.create_supabase_user('owner@test.com')::text, false);
select set_config('tests.first_uid', tests.create_supabase_user('first@test.com')::text, false);
select set_config('tests.second_uid', tests.create_supabase_user('second@test.com')::text, false);
select set_config('tests.solo_uid', tests.create_supabase_user('solo@test.com')::text, false);

-- Shared trip: owner + first (joined earlier) + second.
insert into trips (id, name, created_by)
values ('11111111-1111-1111-1111-111111111111', 'Shared trip', current_setting('tests.owner_uid')::uuid);
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('11111111-1111-1111-1111-111111111111', current_setting('tests.owner_uid')::uuid, 'owner', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111111', current_setting('tests.first_uid')::uuid, 'member', now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', current_setting('tests.second_uid')::uuid, 'member', now() - interval '1 day');

-- Shared-trip content: an item and a packing item ADDED BY THE DEPARTING OWNER,
-- an itinerary item added by someone else, and notes from the owner and first.
insert into itinerary_items (trip_id, title, created_by)
values ('11111111-1111-1111-1111-111111111111', 'Owner itinerary item', current_setting('tests.owner_uid')::uuid);
insert into itinerary_items (trip_id, title, created_by)
values ('11111111-1111-1111-1111-111111111111', 'First itinerary item', current_setting('tests.first_uid')::uuid);
insert into packing_items (trip_id, label, created_by)
values ('11111111-1111-1111-1111-111111111111', 'Owner packing item', current_setting('tests.owner_uid')::uuid);
insert into trip_notes (trip_id, author_id, body)
values ('11111111-1111-1111-1111-111111111111', current_setting('tests.owner_uid')::uuid, 'A note by the owner');
insert into trip_notes (trip_id, author_id, body)
values ('11111111-1111-1111-1111-111111111111', current_setting('tests.first_uid')::uuid, 'A note by first');

-- Solo trip: owner only.
insert into trips (id, name, created_by)
values ('22222222-2222-2222-2222-222222222222', 'Solo trip', current_setting('tests.owner_uid')::uuid);
insert into trip_members (trip_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', current_setting('tests.owner_uid')::uuid, 'owner');
insert into packing_items (trip_id, label)
values ('22222222-2222-2222-2222-222222222222', 'Solo packing item');

-- The owner of a different trip that the departing user merely belongs to.
insert into trips (id, name, created_by)
values ('33333333-3333-3333-3333-333333333333', 'Someone else''s trip', current_setting('tests.solo_uid')::uuid);
insert into trip_members (trip_id, user_id, role, joined_at) values
  ('33333333-3333-3333-3333-333333333333', current_setting('tests.solo_uid')::uuid, 'owner', now() - interval '5 days'),
  ('33333333-3333-3333-3333-333333333333', current_setting('tests.owner_uid')::uuid, 'member', now() - interval '4 days');

-- A profile for the departing user, to prove the auth cascade removes it.
insert into profiles (id, display_name)
values (current_setting('tests.owner_uid')::uuid, 'Departing owner');

-- Act: prepare the departing owner's account for deletion. It must return the
-- solo trip id (the only trip it deleted), for the caller's storage cleanup.
select results_eq(
  $$select public.delete_account_prepare(current_setting('tests.owner_uid')::uuid)$$,
  $$select array['22222222-2222-2222-2222-222222222222']::uuid[]$$,
  'prepare returns the ids of the trips it deleted'
);

-- 2: the shared trip survives and passes to the earliest-joined remaining member.
select results_eq(
  $$select created_by from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  $$select current_setting('tests.first_uid')::uuid$$,
  'shared trip passes to the first-joined remaining member'
);

-- 3: that member is now the owner role.
select results_eq(
  $$select role from trip_members
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and user_id = current_setting('tests.first_uid')::uuid$$,
  $$values ('owner'::text)$$,
  'heir holds the owner role'
);

-- 4: only the heir is owner (single-owner invariant preserved).
select results_eq(
  $$select count(*) from trip_members
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and role = 'owner'$$,
  array[1::bigint],
  'exactly one owner remains on the shared trip'
);

-- 5: the departing owner's membership is gone (all of them).
select results_eq(
  $$select count(*) from trip_members where user_id = current_setting('tests.owner_uid')::uuid$$,
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

-- Now delete the auth user, which cascades their remaining rows.
delete from auth.users where id = current_setting('tests.owner_uid')::uuid;

-- 9: the profile is gone.
select results_eq(
  $$select count(*) from profiles where id = current_setting('tests.owner_uid')::uuid$$,
  array[0::bigint],
  'auth cascade removes the profile'
);

-- 10: the shared trip still exists, owned by the heir.
select results_eq(
  $$select created_by from trips where id = '11111111-1111-1111-1111-111111111111'$$,
  $$select current_setting('tests.first_uid')::uuid$$,
  'shared trip survives the auth delete, owned by the heir'
);

-- 11: the owner's itinerary item survives, with created_by nulled.
select results_eq(
  $$select created_by is null from itinerary_items
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and title = 'Owner itinerary item'$$,
  array[true],
  'a departed user''s itinerary item survives with created_by null'
);

-- 12: the owner's packing item survives, with created_by nulled.
select results_eq(
  $$select created_by is null from packing_items
     where trip_id = '11111111-1111-1111-1111-111111111111'
       and label = 'Owner packing item'$$,
  array[true],
  'a departed user''s packing item survives with created_by null'
);

-- 13: the owner's note is gone (trip_notes cascades on author deletion), while
-- first's note stays.
select results_eq(
  $$select count(*) from trip_notes
     where trip_id = '11111111-1111-1111-1111-111111111111'$$,
  array[1::bigint],
  'the departed user''s note is gone; the other member''s remains'
);

select * from finish();
rollback;
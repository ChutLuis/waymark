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

insert into storage.objects (bucket_id, name) values
  ('trip-covers', '11111111-1111-1111-1111-111111111111/cover.jpg'),
  ('avatars', tests.get_supabase_uid('a@test.com')::text || '/avatar.jpg');

-- S18: non-members cannot read or write Trip 1 cover objects.
select tests.authenticate_as('c@test.com');
select results_eq(
  $$select count(*) from storage.objects
    where bucket_id = 'trip-covers'
      and name = '11111111-1111-1111-1111-111111111111/cover.jpg'$$,
  array[0::bigint],
  'S18: C cannot read a Trip 1 cover object'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('trip-covers', '11111111-1111-1111-1111-111111111111/c-coverage.jpg')$$,
  '42501',
  null,
  'S18: C cannot insert a Trip 1 cover object'
);

-- S19: trip members can read Trip 1 cover objects.
select tests.authenticate_as('b@test.com');
select results_eq(
  $$select count(*) from storage.objects
    where bucket_id = 'trip-covers'
      and name = '11111111-1111-1111-1111-111111111111/cover.jpg'$$,
  array[1::bigint],
  'S19: B can read a Trip 1 cover object'
);

-- S20: avatar reads extend to trip-mates, while writes remain owner-only.
select tests.authenticate_as('a@test.com');
select results_eq(
  $$select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = tests.get_supabase_uid('a@test.com')::text || '/avatar.jpg'$$,
  array[1::bigint],
  'S20a: A can read A avatar object'
);
select tests.authenticate_as('b@test.com');
select results_eq(
  $$select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = tests.get_supabase_uid('a@test.com')::text || '/avatar.jpg'$$,
  array[1::bigint],
  'S20b: B can read trip-mate A avatar object'
);
select tests.authenticate_as('c@test.com');
select results_eq(
  $$select count(*) from storage.objects
    where bucket_id = 'avatars'
      and name = tests.get_supabase_uid('a@test.com')::text || '/avatar.jpg'$$,
  array[0::bigint],
  'S20c: C cannot read A avatar object'
);
select tests.authenticate_as('b@test.com');
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('avatars', tests.get_supabase_uid('a@test.com')::text || '/evil.jpg')$$,
  '42501',
  null,
  'S20d: B cannot insert into A avatar folder'
);

reset role;
select * from finish();
rollback;

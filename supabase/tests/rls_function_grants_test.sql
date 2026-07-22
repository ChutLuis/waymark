begin;
select plan(2);

-- Setup runs as postgres, before anon/authenticated roles are selected.
select tests.create_supabase_user('a@test.com');
select tests.create_supabase_user('b@test.com');

-- F1: membership helpers are unavailable to anon but remain callable by RLS.
select tests.clear_authentication();
select throws_ok(
  $$select is_trip_member('11111111-1111-1111-1111-111111111111'::uuid)$$,
  '42501',
  null,
  'F1: anon cannot execute is_trip_member'
);

select tests.authenticate_as('a@test.com');
select lives_ok(
  $$select is_trip_member('11111111-1111-1111-1111-111111111111'::uuid)$$,
  'F1: authenticated can execute is_trip_member'
);

reset role;
select * from finish();
rollback;

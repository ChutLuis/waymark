begin;
select plan(9);

select tests.create_supabase_user('creator@test.com');
select tests.create_supabase_user('other@test.com');

select hasnt_function(
  'public', 'create_trip', array['text', 'text', 'date', 'date'],
  'C1: the four-argument create_trip is gone (no ambiguous overload)'
);

select ok(
  has_function_privilege('authenticated', 'public.create_trip(text, text, date, date, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.create_trip(text, text, date, date, uuid)', 'execute'),
  'C2: signed-in people can call create_trip, anonymous callers cannot'
);

select tests.authenticate_as('creator@test.com');

select results_eq(
  $$select id from create_trip('Porto', 'Portugal', '2026-12-01', '2026-12-03', 'cccccccc-0000-0000-0000-000000000001')$$,
  $$values ('cccccccc-0000-0000-0000-000000000001'::uuid)$$,
  'C3: create_trip uses the id the device made'
);

select results_eq(
  $$select id, name from create_trip('Porto again', null, null, null, 'cccccccc-0000-0000-0000-000000000001')$$,
  $$values ('cccccccc-0000-0000-0000-000000000001'::uuid, 'Porto'::text)$$,
  'C4: sending the same id again returns the trip as it is, without changing it'
);

select is(
  (select count(*) from trip_members where trip_id = 'cccccccc-0000-0000-0000-000000000001'),
  1::bigint,
  'C5: a replay adds no second membership'
);

select isnt(
  (select id from create_trip('No id')),
  null,
  'C6: without an id the server still makes one'
);

select tests.authenticate_as('other@test.com');

select throws_ok(
  $$select create_trip('Taken', null, null, null, 'cccccccc-0000-0000-0000-000000000001')$$,
  '23505',
  'That trip id is already in use',
  'C7: someone else''s trip id is refused'
);

select is_empty(
  $$select 1 from trips where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  'C8: the refused caller still can''t see that trip'
);

reset role;

select results_eq(
  $$select count(*), min(name) from trips where id = 'cccccccc-0000-0000-0000-000000000001'$$,
  $$values (1::bigint, 'Porto'::text)$$,
  'C9: one trip with that id, unchanged'
);

select * from finish();
rollback;

begin;
select plan(7);

-- Setup runs as postgres, before authentication, and therefore bypasses RLS.

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

-- S6: the author may write a private note.
select tests.authenticate_as('a@test.com');
select lives_ok(
  $$insert into trip_notes (trip_id, author_id, body, is_private)
    values ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('a@test.com'), 'A private note', true)$$,
  'S6: A can write a private note'
);

-- S7: the core private-note guarantee.
select tests.authenticate_as('b@test.com');
select results_eq(
  $$select count(*) from trip_notes where body = 'A private note'$$,
  array[0::bigint],
  'S7: B cannot read A private note'
);

-- S8: ownership does not bypass another member's private note.
insert into trip_notes (trip_id, author_id, body, is_private)
values ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('b@test.com'), 'B private note', true);
select tests.authenticate_as('a@test.com');
select results_eq(
  $$select count(*) from trip_notes where body = 'B private note'$$,
  array[0::bigint],
  'S8: owner cannot read B private note'
);

-- S9: shared notes remain visible to all trip members.
select lives_ok(
  $$insert into trip_notes (trip_id, author_id, body, is_private)
    values ('11111111-1111-1111-1111-111111111111', tests.get_supabase_uid('a@test.com'), 'A shared note', false)$$,
  'S9: A can write a shared note'
);
select tests.authenticate_as('b@test.com');
select results_eq(
  $$select count(*) from trip_notes where body = 'A shared note'$$,
  array[1::bigint],
  'S10: B can read A shared note'
);

-- S11: blocked UPDATE policies silently filter the target rows.
select results_eq(
  $$with updated_note as (
      update trip_notes
      set body = 'hacked'
      where trip_id = '11111111-1111-1111-1111-111111111111'
        and body = 'A shared note'
      returning 1
    )
    select count(*)::int from updated_note$$,
  array[0],
  'S11: B cannot edit A note'
);

-- S12: a non-member sees no notes, shared or private.
select tests.authenticate_as('c@test.com');
select results_eq(
  $$select count(*) from trip_notes where trip_id = '11111111-1111-1111-1111-111111111111'$$,
  array[0::bigint],
  'S12: C cannot read any Trip 1 notes'
);

reset role;
select * from finish();
rollback;

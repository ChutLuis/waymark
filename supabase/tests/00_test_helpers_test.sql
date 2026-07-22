-- Adapted for direct psql inclusion from basejump-supabase_test_helpers 0.0.6.
-- Source: https://github.com/usebasejump/supabase-test-helpers/blob/main/supabase_test_helpers--0.0.6.sql
-- This file deliberately lives under supabase/tests so helpers are never deployed.

create schema if not exists tests;

create or replace function tests.create_supabase_user(
  identifier text,
  email text default null,
  phone text default null,
  metadata jsonb default null
)
returns uuid
security definer
set search_path = auth, pg_temp
as $$
declare
  user_id uuid;
begin
  user_id := extensions.uuid_generate_v4();
  insert into auth.users (
    id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  )
  values (
    user_id,
    coalesce(email, concat(user_id, '@test.com')),
    phone,
    jsonb_build_object('test_identifier', identifier) || coalesce(metadata, '{}'::jsonb),
    '{}'::jsonb,
    now(),
    now()
  )
  returning id into user_id;

  return user_id;
end;
$$ language plpgsql;

create or replace function tests.get_supabase_user(identifier text)
returns json
security definer
set search_path = auth, pg_temp
as $$
declare
  supabase_user json;
begin
  select json_build_object(
    'id', id,
    'email', email,
    'phone', phone,
    'raw_user_meta_data', raw_user_meta_data,
    'raw_app_meta_data', raw_app_meta_data
  ) into supabase_user
  from auth.users
  where raw_user_meta_data ->> 'test_identifier' = identifier
  limit 1;

  if supabase_user is null or supabase_user -> 'id' is null then
    raise exception 'User with identifier % not found', identifier;
  end if;

  return supabase_user;
end;
$$ language plpgsql;

create or replace function tests.get_supabase_uid(identifier text)
returns uuid
security definer
set search_path = auth, pg_temp
as $$
declare
  supabase_user uuid;
begin
  select id into supabase_user
  from auth.users
  where raw_user_meta_data ->> 'test_identifier' = identifier
  limit 1;

  if supabase_user is null then
    raise exception 'User with identifier % not found', identifier;
  end if;

  return supabase_user;
end;
$$ language plpgsql;

create or replace function tests.authenticate_as(identifier text)
returns void
as $$
declare
  user_data json;
  original_auth_data text;
begin
  original_auth_data := current_setting('request.jwt.claims', true);
  user_data := tests.get_supabase_user(identifier);

  if user_data is null or user_data ->> 'id' is null then
    raise exception 'User with identifier % not found', identifier;
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_data ->> 'id',
      'email', user_data ->> 'email',
      'phone', user_data ->> 'phone',
      'user_metadata', user_data -> 'raw_user_meta_data',
      'app_metadata', user_data -> 'raw_app_meta_data'
    )::text,
    true
  );
exception
  when others then
    set local role authenticated;
    set local "request.jwt.claims" to original_auth_data;
    raise;
end;
$$ language plpgsql;

create or replace function tests.authenticate_as_service_role()
returns void
as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;

create or replace function tests.clear_authentication()
returns void
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;

-- Tests impersonate authenticated/anon; let those roles reach the helper schema.
grant usage on schema tests to authenticated, anon, service_role;
grant execute on all functions in schema tests to authenticated, anon, service_role;

begin;
select plan(2);
select ok(
  to_regprocedure('tests.authenticate_as(text)') is not null,
  'installs Basejump-compatible authentication helpers'
);
select tests.create_supabase_user('helper-auth-user', 'helper-auth-user@test.com');
select tests.authenticate_as('helper-auth-user');
select is(
  auth.uid(),
  tests.get_supabase_uid('helper-auth-user'),
  'authenticate_as sets auth.uid() to the selected test user'
);
reset role;
select * from finish();
rollback;

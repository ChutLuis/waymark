-- =====================================================================
-- RLS & RPC hardening: note membership checks, immutable ownership,
-- invite deletion policy, and case-normalized invite acceptance
-- =====================================================================

-- 1. Require active trip membership to update or delete a note, and prevent
--    moving a note between trips or changing its author_id.
drop policy if exists notes_update on trip_notes;
create policy notes_update on trip_notes
  for update
  using (author_id = auth.uid() and is_trip_member(trip_id))
  with check (author_id = auth.uid() and is_trip_member(trip_id));

drop policy if exists notes_delete on trip_notes;
create policy notes_delete on trip_notes
  for delete
  using (author_id = auth.uid() and is_trip_member(trip_id));

create or replace function prevent_note_reassignment()
returns trigger language plpgsql as $$
begin
  if new.trip_id <> old.trip_id or new.author_id <> old.author_id then
    raise exception 'cannot reassign note trip or author';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_note_reassignment on trip_notes;
create trigger trg_prevent_note_reassignment
  before update on trip_notes
  for each row execute function prevent_note_reassignment();

-- 2. Prevent changing trips.created_by after creation unless performed by
--    the service-role account-deletion handover (auth.uid() is null).
create or replace function prevent_trip_creator_mutation()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.created_by is distinct from old.created_by then
    raise exception 'cannot change trip creator';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_trip_creator_mutation on trips;
create trigger trg_prevent_trip_creator_mutation
  before update on trips
  for each row execute function prevent_trip_creator_mutation();

-- 3. Allow trip owners or the invite creator to delete unused invites.
drop policy if exists invites_delete on trip_invites;
create policy invites_delete on trip_invites
  for delete
  using (is_trip_owner(trip_id) or created_by = auth.uid());

-- 4. Normalize _code in accept_trip_invite to match preview_trip_invite.
create or replace function accept_trip_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite trip_invites;
begin
  select * into v_invite
  from trip_invites
  where code = _code or code = upper(trim(_code))
  for update;
  if not found then raise exception 'invalid invite'; end if;

  if exists (
    select 1 from trip_members
    where trip_id = v_invite.trip_id and user_id = auth.uid()
  ) then
    return v_invite.trip_id;
  end if;

  if v_invite.accepted_at is not null then raise exception 'invite already used'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;

  insert into trip_members (trip_id, user_id, role)
  values (v_invite.trip_id, auth.uid(), 'member') on conflict (trip_id, user_id) do nothing;
  update trip_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return v_invite.trip_id;
end $$;

revoke execute on function accept_trip_invite(text) from public, anon;
grant  execute on function accept_trip_invite(text) to authenticated;

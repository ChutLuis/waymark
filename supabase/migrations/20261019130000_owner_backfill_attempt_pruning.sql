-- =====================================================================
-- Follow-ups to 20261019120000_integrity_invites_deletion
-- =====================================================================
-- 1. Before that migration an owner could leave their own trip, leaving a
--    trip nobody can edit, delete or re-cover. Give every such trip an owner
--    again: its creator if still a member, otherwise the member who joined
--    first (who also becomes trips.created_by). A trip with no members left
--    is visible to nobody and is left alone.
-- 2. invite_attempts only needs the last 15 minutes; prune a user's older
--    rows whenever they record a new one.
-- Table RLS is NOT relaxed.
-- =====================================================================

do $$
declare
  r record;
  v_heir uuid;
begin
  for r in
    select t.id, t.created_by
    from public.trips t
    where not exists (
      select 1 from public.trip_members m
      where m.trip_id = t.id and m.role = 'owner'
    )
  loop
    if exists (
      select 1 from public.trip_members m
      where m.trip_id = r.id and m.user_id = r.created_by
    ) then
      v_heir := r.created_by;
    else
      select m.user_id into v_heir
      from public.trip_members m
      where m.trip_id = r.id
      order by m.joined_at, m.user_id
      limit 1;
    end if;

    if v_heir is null then
      raise notice 'trip % has no members left; left as is', r.id;
      continue;
    end if;

    update public.trip_members set role = 'owner'
     where trip_id = r.id and user_id = v_heir;
    update public.trips set created_by = v_heir
     where id = r.id and created_by is distinct from v_heir;
  end loop;
end $$;

create or replace function public.prune_invite_attempts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.invite_attempts
   where user_id = new.user_id
     and attempted_at < now() - interval '1 day';
  return null;
end $$;

drop trigger if exists trg_prune_invite_attempts on public.invite_attempts;
create trigger trg_prune_invite_attempts
  after insert on public.invite_attempts
  for each row execute function public.prune_invite_attempts();

revoke execute on function public.prune_invite_attempts() from public, anon, authenticated;

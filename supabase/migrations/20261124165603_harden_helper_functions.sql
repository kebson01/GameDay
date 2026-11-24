-- Helpers used only inside RLS policies: move out of the API-exposed schema.
-- Policies reference functions by identity, so they keep working.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.is_group_member(uuid) set schema private;
alter function public.is_tailgate_attendee(uuid) set schema private;
alter function public.shares_group_with(uuid) set schema private;

revoke execute on function private.is_group_member(uuid), private.is_tailgate_attendee(uuid), private.shares_group_with(uuid) from public;
grant execute on function private.is_group_member(uuid), private.is_tailgate_attendee(uuid), private.shares_group_with(uuid) to anon, authenticated;

-- Open a tailgate by link. Private tailgates show only name/host/date/time to
-- people who aren't the host or an attendee; location, description and
-- checklist appear after a successful RSVP with the passcode.
create or replace function public.get_tailgate(p_id uuid)
returns setof public.tailgates
language sql stable security definer set search_path = '' as $$
  select
    t.id, t.host_id, t.host_name, t.name,
    case when t.is_public or t.host_id = (select auth.uid()) or private.is_tailgate_attendee(t.id) then t.description end,
    t.type, t.game_date, t.start_time, t.end_time,
    case when t.is_public or t.host_id = (select auth.uid()) or private.is_tailgate_attendee(t.id) then t.location else '{}'::jsonb end,
    t.is_public, t.capacity, t.amenities,
    case when t.is_public or t.host_id = (select auth.uid()) or private.is_tailgate_attendee(t.id) then t.checklist else '[]'::jsonb end,
    t.photo_url, t.rsvp_count, t.created_at, t.updated_at
  from public.tailgates t
  where t.id = p_id;
$$;
revoke execute on function public.get_tailgate(uuid) from public;
grant execute on function public.get_tailgate(uuid) to anon, authenticated;

-- Hosts can update the checklist; attendees can tick items via this function
create or replace function public.update_tailgate_checklist(p_id uuid, p_checklist jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from public.tailgates t where t.id = p_id and (t.host_id = uid or private.is_tailgate_attendee(t.id))) then
    raise exception 'Only the host and attendees can edit the checklist';
  end if;
  if jsonb_typeof(p_checklist) <> 'array' or jsonb_array_length(p_checklist) > 100 then
    raise exception 'Invalid checklist';
  end if;
  update public.tailgates set checklist = p_checklist where id = p_id;
  return p_checklist;
end;
$$;
revoke execute on function public.update_tailgate_checklist(uuid, jsonb) from public, anon;
grant execute on function public.update_tailgate_checklist(uuid, jsonb) to authenticated;

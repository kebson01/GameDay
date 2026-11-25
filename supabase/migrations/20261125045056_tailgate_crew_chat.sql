-- Tailgate crew chat: the host and RSVP'd guests of a tailgate
create table public.tailgate_messages (
  id uuid primary key default gen_random_uuid(),
  tailgate_id uuid not null references public.tailgates (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_name text,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
create index tailgate_messages_tailgate_idx on public.tailgate_messages (tailgate_id, created_at);
create index tailgate_messages_user_idx on public.tailgate_messages (user_id);
alter table public.tailgate_messages enable row level security;

create function private.is_tailgate_crew(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tailgates x where x.id = t and x.host_id = (select auth.uid()))
      or exists (select 1 from public.tailgate_rsvps r where r.tailgate_id = t and r.user_id = (select auth.uid()));
$$;
revoke execute on function private.is_tailgate_crew(uuid) from public;
grant execute on function private.is_tailgate_crew(uuid) to authenticated;

create policy "crew chat: crew reads" on public.tailgate_messages
  for select to authenticated using (private.is_tailgate_crew(tailgate_id));
create policy "crew chat: crew posts" on public.tailgate_messages
  for insert to authenticated with check (user_id = (select auth.uid()) and private.is_tailgate_crew(tailgate_id));
create policy "crew chat: author or host deletes" on public.tailgate_messages
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.tailgates t where t.id = tailgate_id and t.host_id = (select auth.uid())));

revoke insert, update on public.tailgate_messages from anon, authenticated;
grant insert (tailgate_id, content) on public.tailgate_messages to authenticated;

-- Name/photo come from the profile (same trigger as team chat)
create trigger tailgate_messages_author before insert on public.tailgate_messages
  for each row execute function private.stamp_author();

-- New messages arrive live (RLS applies to who receives them)
alter publication supabase_realtime add table public.tailgate_messages;

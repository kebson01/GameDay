-- =========================================================================
-- TAILGATES (shared), RSVPs, private passcodes
-- =========================================================================
create table public.tailgates (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  host_name text check (char_length(host_name) <= 80),
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 2000),
  type text check (char_length(type) <= 30),
  game_date date,
  start_time text check (char_length(start_time) <= 20),
  end_time text check (char_length(end_time) <= 20),
  location jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  capacity integer check (capacity is null or capacity between 1 and 10000),
  amenities text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  photo_url text check (char_length(photo_url) <= 1000),
  rsvp_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tailgates_game_date_idx on public.tailgates (game_date);
create index tailgates_host_idx on public.tailgates (host_id);

create table public.tailgate_rsvps (
  tailgate_id uuid not null references public.tailgates (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (tailgate_id, user_id)
);
create index tailgate_rsvps_user_idx on public.tailgate_rsvps (user_id);

-- Private-tailgate passcodes: hashed, never readable by clients
create table public.tailgate_secrets (
  tailgate_id uuid primary key references public.tailgates (id) on delete cascade,
  passcode_hash text not null
);

alter table public.tailgates enable row level security;
alter table public.tailgate_rsvps enable row level security;
alter table public.tailgate_secrets enable row level security;

create function public.is_tailgate_attendee(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tailgate_rsvps r where r.tailgate_id = t and r.user_id = (select auth.uid()));
$$;

create policy "tailgates: public, own, or attending" on public.tailgates
  for select to anon, authenticated
  using (is_public or host_id = (select auth.uid()) or public.is_tailgate_attendee(id));
create policy "tailgates: host creates" on public.tailgates
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "tailgates: host edits" on public.tailgates
  for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "tailgates: host deletes" on public.tailgates
  for delete to authenticated using (host_id = (select auth.uid()));

-- Clients may not set rsvp_count (maintained by trigger) or timestamps
revoke insert, update on public.tailgates from anon, authenticated;
grant insert (host_id, host_name, name, description, type, game_date, start_time, end_time, location,
              is_public, capacity, amenities, checklist, photo_url) on public.tailgates to authenticated;
grant update (host_name, name, description, type, game_date, start_time, end_time, location,
              is_public, capacity, amenities, checklist, photo_url) on public.tailgates to authenticated;

create policy "rsvps: own or my guests" on public.tailgate_rsvps
  for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.tailgates t where t.id = tailgate_id and t.host_id = (select auth.uid())));
create policy "rsvps: cancel own" on public.tailgate_rsvps
  for delete to authenticated using (user_id = (select auth.uid()));
-- (RSVPs are created only through rsvp_tailgate(), which checks passcode and capacity)

create policy "secrets: host sets passcode" on public.tailgate_secrets
  for insert to authenticated
  with check (exists (select 1 from public.tailgates t where t.id = tailgate_id and t.host_id = (select auth.uid())));

create function public.hash_tailgate_passcode()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.passcode_hash := extensions.crypt(new.passcode_hash, extensions.gen_salt('bf'));
  return new;
end;
$$;
create trigger tailgate_secrets_hash before insert or update on public.tailgate_secrets
  for each row execute function public.hash_tailgate_passcode();

create function public.refresh_rsvp_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t uuid := coalesce(new.tailgate_id, old.tailgate_id);
begin
  update public.tailgates set rsvp_count = (select count(*) from public.tailgate_rsvps r where r.tailgate_id = t) where id = t;
  return null;
end;
$$;
create trigger tailgate_rsvps_count after insert or delete on public.tailgate_rsvps
  for each row execute function public.refresh_rsvp_count();

create trigger tailgates_touch before update on public.tailgates
  for each row execute function public.touch_updated_at();

-- Open a tailgate by link (works for private ones: the id is unguessable)
create function public.get_tailgate(p_id uuid)
returns setof public.tailgates language sql stable security definer set search_path = '' as $$
  select * from public.tailgates where id = p_id;
$$;

create function public.rsvp_tailgate(p_id uuid, p_passcode text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  t public.tailgates;
  h text;
begin
  if uid is null then raise exception 'Sign in to RSVP'; end if;
  select * into t from public.tailgates where id = p_id;
  if not found then raise exception 'Tailgate not found'; end if;
  if exists (select 1 from public.tailgate_rsvps where tailgate_id = p_id and user_id = uid) then
    return t.rsvp_count;
  end if;
  if not t.is_public and t.host_id <> uid then
    select passcode_hash into h from public.tailgate_secrets where tailgate_id = p_id;
    if h is not null and (p_passcode is null or extensions.crypt(p_passcode, h) <> h) then
      raise exception 'Wrong passcode';
    end if;
  end if;
  if t.capacity is not null and t.rsvp_count >= t.capacity then
    raise exception 'This tailgate is full';
  end if;
  insert into public.tailgate_rsvps (tailgate_id, user_id, display_name)
  values (p_id, uid, (select full_name from public.profiles where id = uid));
  return (select rsvp_count from public.tailgates where id = p_id);
end;
$$;

-- =========================================================================
-- GROUPS and members
-- =========================================================================
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  avatar_emoji text not null default '🏈' check (char_length(avatar_emoji) <= 8),
  color text not null default '#FF6B35' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  location_sharing boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create function public.is_group_member(g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = g and m.user_id = (select auth.uid()));
$$;

create function public.shares_group_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = (select auth.uid()) and b.user_id = other and b.location_sharing
  );
$$;

create policy "groups: members read" on public.groups
  for select to authenticated using (owner_id = (select auth.uid()) or public.is_group_member(id));
create policy "groups: create own" on public.groups
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "groups: owner edits" on public.groups
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "groups: owner deletes" on public.groups
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke insert, update on public.groups from anon, authenticated;
grant insert (owner_id, name, avatar_emoji, color) on public.groups to authenticated;
grant update (name, avatar_emoji, color) on public.groups to authenticated;

create policy "members: see my groups" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
create policy "members: update own sharing" on public.group_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members: leave, or owner removes" on public.group_members
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())));
revoke insert, update on public.group_members from anon, authenticated;
grant update (location_sharing) on public.group_members to authenticated;

create trigger groups_touch before update on public.groups
  for each row execute function public.touch_updated_at();

-- Owner becomes the first (admin) member
create function public.add_group_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, email, display_name, role)
  select new.id, new.owner_id, u.email, p.full_name, 'admin'
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = new.owner_id;
  return new;
end;
$$;
create trigger groups_add_owner after insert on public.groups
  for each row execute function public.add_group_owner();

create function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g uuid;
begin
  if uid is null then raise exception 'Sign in to join a group'; end if;
  select id into g from public.groups where invite_code = upper(trim(p_code));
  if g is null then raise exception 'Invalid code'; end if;
  if exists (select 1 from public.group_members where group_id = g and user_id = uid) then
    raise exception 'Already in group';
  end if;
  insert into public.group_members (group_id, user_id, email, display_name)
  select g, uid, u.email, p.full_name
  from auth.users u left join public.profiles p on p.id = u.id where u.id = uid;
  return g;
end;
$$;

-- =========================================================================
-- LIVE LOCATIONS (visible only to people who share a group with you)
-- =========================================================================
create table public.user_locations (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text,
  display_name text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy double precision,
  sharing_enabled boolean not null default true,
  status text not null default 'active',
  last_updated timestamptz not null default now()
);
alter table public.user_locations enable row level security;

create policy "locations: own or group-mates sharing" on public.user_locations
  for select to authenticated
  using (user_id = (select auth.uid()) or (sharing_enabled and public.shares_group_with(user_id)));
create policy "locations: write own" on public.user_locations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "locations: update own" on public.user_locations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "locations: delete own" on public.user_locations
  for delete to authenticated using (user_id = (select auth.uid()));

-- =========================================================================
-- Function permissions
-- =========================================================================
revoke execute on function public.refresh_rsvp_count(), public.add_group_owner(), public.hash_tailgate_passcode()
  from public, anon, authenticated;
revoke execute on function public.rsvp_tailgate(uuid, text), public.join_group(text) from public, anon;
grant execute on function public.rsvp_tailgate(uuid, text), public.join_group(text) to authenticated;
revoke execute on function public.get_tailgate(uuid) from public;
grant execute on function public.get_tailgate(uuid) to anon, authenticated;

-- =========================================================================
-- Photo uploads (tailgate covers): public read, users write to their folder
-- =========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'])
on conflict (id) do nothing;

create policy "uploads: users add to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: users remove own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

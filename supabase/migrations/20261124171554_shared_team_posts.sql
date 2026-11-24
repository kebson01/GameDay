-- =========================================================================
-- Moderators: profiles.is_admin (only settable by the project owner in SQL)
-- =========================================================================
alter table public.profiles add column is_admin boolean not null default false;
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, favorite_teams, settings) on public.profiles to authenticated;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = (select auth.uid())), false);
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- =========================================================================
-- TEAM POSTS, likes, comments, reports
-- =========================================================================
create table public.team_posts (
  id uuid primary key default gen_random_uuid(),
  team_name text not null check (char_length(team_name) between 1 and 80),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_name text,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 2000),
  type text not null default 'discussion'
    check (type in ('discussion', 'news', 'prediction', 'celebration', 'highlight')),
  news_url text check (news_url is null or (news_url ~* '^https?://' and char_length(news_url) <= 1000)),
  news_title text check (char_length(news_title) <= 200),
  video_url text check (video_url is null or (video_url ~* '^https?://' and char_length(video_url) <= 1000)),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  report_count integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index team_posts_team_created_idx on public.team_posts (team_name, created_at desc);
create index team_posts_user_idx on public.team_posts (user_id);

create table public.team_post_likes (
  post_id uuid not null references public.team_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index team_post_likes_user_idx on public.team_post_likes (user_id);

create table public.team_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.team_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  user_name text,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index team_comments_post_idx on public.team_comments (post_id, created_at);
create index team_comments_user_idx on public.team_comments (user_id);

create table public.team_post_reports (
  post_id uuid not null references public.team_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index team_post_reports_user_idx on public.team_post_reports (user_id);

alter table public.team_posts enable row level security;
alter table public.team_post_likes enable row level security;
alter table public.team_comments enable row level security;
alter table public.team_post_reports enable row level security;

-- Author name/photo always come from the profile (can't post as someone else)
create function private.stamp_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := (select auth.uid());
  select p.full_name, p.avatar_url into new.user_name, new.user_avatar
  from public.profiles p where p.id = new.user_id;
  return new;
end;
$$;
create trigger team_posts_author before insert on public.team_posts
  for each row execute function private.stamp_author();
create trigger team_comments_author before insert on public.team_comments
  for each row execute function private.stamp_author();
create trigger team_posts_touch before update on public.team_posts
  for each row execute function public.touch_updated_at();

-- Counters maintained by the database
create function private.refresh_post_counts()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p uuid := coalesce(new.post_id, old.post_id);
begin
  update public.team_posts t set
    like_count = (select count(*) from public.team_post_likes l where l.post_id = p),
    comment_count = (select count(*) from public.team_comments c where c.post_id = p),
    report_count = (select count(*) from public.team_post_reports r where r.post_id = p),
    -- community moderation: hidden automatically after 3 different reports
    is_hidden = t.is_hidden or (select count(*) from public.team_post_reports r where r.post_id = p) >= 3
  where t.id = p;
  return null;
end;
$$;
create trigger team_post_likes_count after insert or delete on public.team_post_likes
  for each row execute function private.refresh_post_counts();
create trigger team_comments_count after insert or delete on public.team_comments
  for each row execute function private.refresh_post_counts();
create trigger team_post_reports_count after insert or delete on public.team_post_reports
  for each row execute function private.refresh_post_counts();
revoke execute on function private.stamp_author(), private.refresh_post_counts() from public, anon, authenticated;

-- Posts: everyone reads visible posts; authors also see their own hidden ones; moderators see all
create policy "posts: read visible" on public.team_posts
  for select to anon, authenticated
  using (not is_hidden or user_id = (select auth.uid()) or private.is_admin());
create policy "posts: create own" on public.team_posts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "posts: author edits" on public.team_posts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "posts: author or moderator deletes" on public.team_posts
  for delete to authenticated using (user_id = (select auth.uid()) or private.is_admin());

revoke insert, update on public.team_posts from anon, authenticated;
grant insert (team_name, content, type, news_url, news_title, video_url) on public.team_posts to authenticated;
grant update (content, news_url, news_title) on public.team_posts to authenticated;

-- Likes: you see and manage only your own likes (counts are on the post)
create policy "likes: read own" on public.team_post_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "likes: add own" on public.team_post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes: remove own" on public.team_post_likes
  for delete to authenticated using (user_id = (select auth.uid()));
revoke insert on public.team_post_likes from anon, authenticated;
grant insert (post_id) on public.team_post_likes to authenticated;

-- Comments: readable when the post is visible
create policy "comments: read on visible posts" on public.team_comments
  for select to anon, authenticated
  using (exists (select 1 from public.team_posts t where t.id = post_id
                 and (not t.is_hidden or t.user_id = (select auth.uid()) or private.is_admin())));
create policy "comments: add own on visible posts" on public.team_comments
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.team_posts t where t.id = post_id and not t.is_hidden));
create policy "comments: author or moderator deletes" on public.team_comments
  for delete to authenticated using (user_id = (select auth.uid()) or private.is_admin());
revoke insert, update on public.team_comments from anon, authenticated;
grant insert (post_id, content) on public.team_comments to authenticated;

-- Reports: one per user per post; you only see your own reports
create policy "reports: read own" on public.team_post_reports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reports: add own" on public.team_post_reports
  for insert to authenticated with check (user_id = (select auth.uid()));
revoke insert on public.team_post_reports from anon, authenticated;
grant insert (post_id) on public.team_post_reports to authenticated;

-- Moderators hide/restore posts
create function public.moderate_post(p_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Only moderators can do that'; end if;
  update public.team_posts set is_hidden = p_hidden,
         report_count = case when p_hidden then report_count else 0 end
   where id = p_id;
  if not p_hidden then delete from public.team_post_reports where post_id = p_id; end if;
end;
$$;
revoke execute on function public.moderate_post(uuid, boolean) from public, anon;
grant execute on function public.moderate_post(uuid, boolean) to authenticated;

-- =========================================================================
-- Allow short video clips in uploads (Supabase free plan max: 50 MB)
-- =========================================================================
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif',
                                  'video/mp4', 'video/quicktime', 'video/webm']
 where id = 'uploads';

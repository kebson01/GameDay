-- Push team post changes to the app in realtime. Row-level security still
-- applies: subscribers only receive rows they're allowed to read.
-- (Likes, comments and reports update the post's counters, so changes to
-- team_posts cover those too.)
alter publication supabase_realtime add table public.team_posts;

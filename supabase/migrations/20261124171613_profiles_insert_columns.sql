-- Users can't grant themselves moderator rights when a profile row is created
revoke insert on public.profiles from anon, authenticated;
grant insert (id, full_name, avatar_url, favorite_teams, settings) on public.profiles to authenticated;

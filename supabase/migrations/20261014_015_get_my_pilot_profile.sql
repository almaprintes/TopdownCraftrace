-- Read only the authenticated user's own player identity.
-- Needed to prevent silent orphan leaderboard records after restoring/switching
-- anonymous Supabase sessions. No profile is created or modified here.
create or replace function public.get_my_pilot_profile()
returns table (
  nick text,
  continent_code text,
  country_code text,
  region_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nick, p.continent_code, p.country_code, p.region_code
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1
$$;
revoke all on function public.get_my_pilot_profile() from public, anon;
grant execute on function public.get_my_pilot_profile() to authenticated;

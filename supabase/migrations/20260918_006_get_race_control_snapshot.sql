-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 6: full leaderboard snapshot.
-- One call returns Global + Continent + Country + Region.

create or replace function public.get_race_control_snapshot(
  p_track_id text
)
returns table (
  scope text,
  rank bigint,
  nick text,
  best_time_ms integer,
  car_id text,
  is_me boolean,
  section text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_track_id text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_track_id := trim(p_track_id);

  if v_track_id is null
     or char_length(v_track_id) < 1
     or char_length(v_track_id) > 80 then
    raise exception 'Invalid track_id';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = v_user_id
  ) then
    raise exception 'Profile required';
  end if;

  return query

  select
    'global'::text,
    l.rank,
    l.nick,
    l.best_time_ms,
    l.car_id,
    l.is_me,
    l.section
  from public.get_track_leaderboard(
    v_track_id,
    'global'
  ) l

  union all

  select
    'continent'::text,
    l.rank,
    l.nick,
    l.best_time_ms,
    l.car_id,
    l.is_me,
    l.section
  from public.get_track_leaderboard(
    v_track_id,
    'continent'
  ) l

  union all

  select
    'country'::text,
    l.rank,
    l.nick,
    l.best_time_ms,
    l.car_id,
    l.is_me,
    l.section
  from public.get_track_leaderboard(
    v_track_id,
    'country'
  ) l

  union all

  select
    'region'::text,
    l.rank,
    l.nick,
    l.best_time_ms,
    l.car_id,
    l.is_me,
    l.section
  from public.get_track_leaderboard(
    v_track_id,
    'region'
  ) l

  order by 1, 2;
end;
$$;

revoke all on function public.get_race_control_snapshot(text)
from public;

revoke all on function public.get_race_control_snapshot(text)
from anon;

grant execute on function public.get_race_control_snapshot(text)
to authenticated;

-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 5: compact leaderboard.
-- Returns Top 25 plus 10 positions above and below the authenticated player.

create or replace function public.get_track_leaderboard(
  p_track_id text,
  p_scope text default 'global'
)
returns table (
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
  v_scope text;

  v_continent text;
  v_country text;
  v_region text;

  v_my_rank bigint;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_track_id := trim(p_track_id);
  v_scope := lower(trim(p_scope));

  if v_track_id is null
     or char_length(v_track_id) < 1
     or char_length(v_track_id) > 80 then
    raise exception 'Invalid track_id';
  end if;

  if v_scope not in ('global', 'continent', 'country', 'region') then
    raise exception 'Invalid scope';
  end if;

  select
    p.continent_code,
    p.country_code,
    p.region_code
  into
    v_continent,
    v_country,
    v_region
  from public.profiles p
  where p.user_id = v_user_id;

  if not found then
    raise exception 'Profile required';
  end if;

  create temporary table if not exists pg_temp.race_control_ranked (
    rank bigint,
    user_id uuid,
    nick text,
    best_time_ms integer,
    car_id text
  ) on commit drop;

  truncate table pg_temp.race_control_ranked;

  insert into pg_temp.race_control_ranked (
    rank,
    user_id,
    nick,
    best_time_ms,
    car_id
  )
  select
    rank() over (
      order by tr.best_time_ms asc
    ) as rank,
    tr.user_id,
    p.nick,
    tr.best_time_ms,
    tr.car_id
  from public.track_records tr
  join public.profiles p
    on p.user_id = tr.user_id
  where tr.track_id = v_track_id
    and (
      v_scope = 'global'

      or (
        v_scope = 'continent'
        and p.continent_code = v_continent
      )

      or (
        v_scope = 'country'
        and p.country_code = v_country
      )

      or (
        v_scope = 'region'
        and p.country_code = v_country
        and p.region_code = v_region
      )
    );

  select r.rank
  into v_my_rank
  from pg_temp.race_control_ranked r
  where r.user_id = v_user_id;

  return query

  select
    r.rank,
    r.nick,
    r.best_time_ms,
    r.car_id,
    (r.user_id = v_user_id) as is_me,
    'top'::text as section
  from pg_temp.race_control_ranked r
  where r.rank <= 25

  union all

  select
    r.rank,
    r.nick,
    r.best_time_ms,
    r.car_id,
    (r.user_id = v_user_id) as is_me,
    'nearby'::text as section
  from pg_temp.race_control_ranked r
  where v_my_rank is not null
    and r.rank between
      greatest(1, v_my_rank - 10)
      and v_my_rank + 10
    and r.rank > 25

  order by rank;
end;
$$;

revoke all on function public.get_track_leaderboard(text, text)
from public;

revoke all on function public.get_track_leaderboard(text, text)
from anon;

grant execute on function public.get_track_leaderboard(text, text)
to authenticated;

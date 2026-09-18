-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 8: leaderboard rows expose only opaque ghost record references.

drop function if exists public.get_race_control_snapshot(text);
drop function if exists public.get_track_leaderboard(text, text);

create function public.get_track_leaderboard(
  p_track_id text,
  p_scope text default 'global'
)
returns table (
  rank bigint,
  nick text,
  best_time_ms integer,
  car_id text,
  record_ref uuid,
  ghost_available boolean,
  is_me boolean,
  section text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_id text := trim(p_track_id);
  v_scope text := lower(trim(p_scope));
  v_continent text;
  v_country text;
  v_region text;
  v_my_rank bigint;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_track_id is null or char_length(v_track_id) not between 1 and 80 then raise exception 'Invalid track_id'; end if;
  if v_scope not in ('global','continent','country','region') then raise exception 'Invalid scope'; end if;

  select p.continent_code,p.country_code,p.region_code
  into v_continent,v_country,v_region
  from public.profiles p where p.user_id=v_user_id;
  if not found then raise exception 'Profile required'; end if;

  create temporary table if not exists pg_temp.race_control_ranked (
    rank bigint,user_id uuid,nick text,best_time_ms integer,car_id text,
    record_ref uuid,ghost_available boolean
  ) on commit drop;
  truncate table pg_temp.race_control_ranked;

  insert into pg_temp.race_control_ranked
  select rank() over(order by tr.best_time_ms asc),tr.user_id,p.nick,tr.best_time_ms,tr.car_id,
         tr.record_ref,(tr.ghost_payload is not null)
  from public.track_records tr
  join public.profiles p on p.user_id=tr.user_id
  where tr.track_id=v_track_id and (
    v_scope='global'
    or (v_scope='continent' and p.continent_code=v_continent)
    or (v_scope='country' and p.country_code=v_country)
    or (v_scope='region' and p.country_code=v_country and p.region_code=v_region)
  );

  select r.rank into v_my_rank from pg_temp.race_control_ranked r where r.user_id=v_user_id;

  return query
  select r.rank,r.nick,r.best_time_ms,r.car_id,r.record_ref,r.ghost_available,
         (r.user_id=v_user_id),'top'::text
  from pg_temp.race_control_ranked r where r.rank<=25
  union all
  select r.rank,r.nick,r.best_time_ms,r.car_id,r.record_ref,r.ghost_available,
         (r.user_id=v_user_id),'nearby'::text
  from pg_temp.race_control_ranked r
  where v_my_rank is not null and r.rank between greatest(1,v_my_rank-10) and v_my_rank+10 and r.rank>25
  order by rank;
end;
$$;

create function public.get_race_control_snapshot(p_track_id text)
returns table (
  scope text,rank bigint,nick text,best_time_ms integer,car_id text,
  record_ref uuid,ghost_available boolean,is_me boolean,section text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_id text := trim(p_track_id);
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_track_id is null or char_length(v_track_id) not between 1 and 80 then raise exception 'Invalid track_id'; end if;
  if not exists(select 1 from public.profiles p where p.user_id=v_user_id) then raise exception 'Profile required'; end if;

  return query
  select 'global'::text,l.* from public.get_track_leaderboard(v_track_id,'global') l
  union all select 'continent'::text,l.* from public.get_track_leaderboard(v_track_id,'continent') l
  union all select 'country'::text,l.* from public.get_track_leaderboard(v_track_id,'country') l
  union all select 'region'::text,l.* from public.get_track_leaderboard(v_track_id,'region') l
  order by 1,2;
end;
$$;

revoke all on function public.get_track_leaderboard(text,text) from public;
revoke all on function public.get_track_leaderboard(text,text) from anon;
grant execute on function public.get_track_leaderboard(text,text) to authenticated;
revoke all on function public.get_race_control_snapshot(text) from public;
revoke all on function public.get_race_control_snapshot(text) from anon;
grant execute on function public.get_race_control_snapshot(text) to authenticated;

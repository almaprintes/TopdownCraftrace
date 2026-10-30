-- Second stage of Race Control scaling, 30 Oct 2026, DEV 1.4.9
-- Avoid one count(*) per distinct nearby time: one count before the
-- earliest relevant time + bounded window RANK() for candidate rows.
-- Non-destructive: identical signature, permissions and persisted records.
CREATE OR REPLACE FUNCTION public.get_track_leaderboard(p_track_id text, p_scope text DEFAULT 'global'::text)
 RETURNS TABLE(rank bigint, nick text, best_time_ms integer, car_id text, record_ref uuid, ghost_available boolean, is_me boolean, section text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_track text := btrim(p_track_id);
  v_scope text := lower(btrim(p_scope));
  v_continent text;
  v_country text;
  v_region text;
  v_my_time integer;
  v_prefix_count bigint :=0;
  v_fast_cutoff integer;
  v_slow_cutoff integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_track is null or length(v_track) not between 1 and 80
    then raise exception 'Invalid track_id'; end if;
  if v_scope is null or v_scope not in ('global','continent','country','region')
    then raise exception 'Invalid scope'; end if;

  select p.continent_code,p.country_code,p.region_code
  into v_continent,v_country,v_region
  from public.profiles p where p.user_id=v_uid;
  if not found then raise exception 'Profile required'; end if;

  -- The existing UNIQUE (user_id,track_id) index makes this a point lookup.
  select tr.best_time_ms into v_my_time
  from public.track_records tr
  where tr.user_id=v_uid and tr.track_id=v_track;

  -- Keep the original NULL geography semantics (unknown regions match nobody).
  if (v_scope='continent' and v_continent is null)
     or (v_scope in ('country','region') and v_country is null)
     or (v_scope='region' and v_region is null)
     then v_my_time:=null; end if;

  if v_my_time is not null then
    -- Rank = 1 + count of records whose time is strictly faster.
    -- Equal times share a rank, exactly as the previous RANK() window did.
    -- Compute exact rank from a single prefix count plus a bounded window.

    -- Only ten faster rows can contribute a qualifying rank. Capture the
    -- boundary time (not only ten UUIDs), to retain every tied record.
    select tr.best_time_ms into v_fast_cutoff
    from public.track_records tr join public.profiles p on p.user_id=tr.user_id
    where tr.track_id=v_track and tr.best_time_ms<v_my_time
      and (v_scope='global'
        or (v_scope='continent' and p.continent_code=v_continent)
        or (v_scope='country' and p.country_code=v_country)
        or (v_scope='region' and p.country_code=v_country and p.region_code=v_region))
    order by tr.best_time_ms desc limit 1 offset 9;

    -- Eleven slower rows suffice for the +10 rank window. Exact RANK()
    -- filtering below removes any overshoot caused by large tie groups.
    select tr.best_time_ms into v_slow_cutoff
    from public.track_records tr join public.profiles p on p.user_id=tr.user_id
    where tr.track_id=v_track and tr.best_time_ms>v_my_time
      and (v_scope='global'
        or (v_scope='continent' and p.continent_code=v_continent)
        or (v_scope='country' and p.country_code=v_country)
        or (v_scope='region' and p.country_code=v_country and p.region_code=v_region))
    order by tr.best_time_ms asc limit 1 offset 10;
    if v_fast_cutoff is not null then
      select count(*) into v_prefix_count
      from public.track_records tr join public.profiles p on p.user_id=tr.user_id
      where tr.track_id=v_track and tr.best_time_ms<v_fast_cutoff
        and (v_scope='global'
          or (v_scope='continent' and p.continent_code=v_continent)
          or (v_scope='country' and p.country_code=v_country)
          or (v_scope='region' and p.country_code=v_country and p.region_code=v_region));
    end if;
  end if;

  return query
  with top_rows as materialized (
    select tr.user_id,p.nick,tr.best_time_ms,tr.car_id,tr.record_ref,
           (tr.ghost_payload is not null) as has_ghost
    from public.track_records tr join public.profiles p on p.user_id=tr.user_id
    where tr.track_id=v_track
      and (v_scope='global'
        or (v_scope='continent' and p.continent_code=v_continent)
        or (v_scope='country' and p.country_code=v_country)
        or (v_scope='region' and p.country_code=v_country and p.region_code=v_region))
    order by tr.best_time_ms asc
    fetch first 25 rows with ties
  ),
  top_ranked as (
    select rank() over(order by t.best_time_ms asc)::bigint as position,
           t.user_id,t.nick,t.best_time_ms,t.car_id,t.record_ref,t.has_ghost
    from top_rows t
  ),
  near_rows as materialized (
    select tr.user_id,p.nick,tr.best_time_ms,tr.car_id,tr.record_ref,
           (tr.ghost_payload is not null) as has_ghost
    from public.track_records tr join public.profiles p on p.user_id=tr.user_id
    where v_my_time is not null
      and tr.track_id=v_track
      and tr.best_time_ms>=coalesce(v_fast_cutoff, -2147483648)
      and tr.best_time_ms<=coalesce(v_slow_cutoff, 2147483647)
      and (v_scope='global'
        or (v_scope='continent' and p.continent_code=v_continent)
        or (v_scope='country' and p.country_code=v_country)
        or (v_scope='region' and p.country_code=v_country and p.region_code=v_region))
  ),
  near_ranked as materialized (
    select (v_prefix_count+rank() over(order by n.best_time_ms asc))::bigint as position,
           n.user_id,n.nick,n.best_time_ms,n.car_id,n.record_ref,n.has_ghost
    from near_rows n
  ),
  my_rank as (
    select min(n.position) as position
    from near_ranked n where n.user_id=v_uid
  )
  select t.position,t.nick,t.best_time_ms,t.car_id,t.record_ref,t.has_ghost,
         t.user_id=v_uid,'top'::text
  from top_ranked t where t.position<=25
  union all
  select n.position,n.nick,n.best_time_ms,n.car_id,n.record_ref,n.has_ghost,
         n.user_id=v_uid,'nearby'::text
  from near_ranked n cross join my_rank m
  where m.position is not null and n.position>25
    and n.position between greatest(1::bigint,m.position-10) and m.position+10
  order by 1;
end;
$function$
;
revoke all on function public.get_track_leaderboard(text,text) from public,anon;
grant execute on function public.get_track_leaderboard(text,text) to authenticated;

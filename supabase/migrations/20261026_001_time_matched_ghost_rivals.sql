-- DEV 1.3.36: select up to twelve ghosts ahead of a pilot, by TIME not rank.
-- Returns only metadata; the recording stays private until the existing
-- rewarded get_race_control_ghost(record_ref) path authorizes its download.
create or replace function public.get_race_control_nearby_ghosts(
  p_track_id text,
  p_reference_ms integer,
  p_min_gap_ms integer default 1,
  p_max_gap_ms integer default 3000,
  p_limit integer default 8
)
returns table (
  rank bigint,
  nick text,
  best_time_ms integer,
  car_id text,
  record_ref uuid,
  ghost_available boolean,
  delta_ms integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_track text := btrim(p_track_id);
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.profiles where user_id=v_uid)
    then raise exception 'Profile required'; end if;
  if v_track is null or length(v_track) not between 1 and 80
    then raise exception 'Invalid track'; end if;
  if p_reference_ms is null or p_reference_ms not between 1001 and 3600000
    then raise exception 'Invalid reference time'; end if;
  if p_min_gap_ms is null or p_max_gap_ms is null
     or p_min_gap_ms < 1 or p_max_gap_ms > 120000
     or p_min_gap_ms > p_max_gap_ms
    then raise exception 'Invalid rival gap'; end if;
  if p_limit is null or p_limit not between 1 and 12
    then raise exception 'Invalid result limit'; end if;

  return query
    with candidates as materialized (
      select r.user_id,r.best_time_ms,r.car_id,r.record_ref,p.nick
      from public.track_records r
      join public.profiles p on p.user_id=r.user_id
      where r.track_id=v_track
        and r.user_id<>v_uid
        and r.ghost_payload is not null
        and r.best_time_ms between p_reference_ms-p_max_gap_ms
                               and p_reference_ms-p_min_gap_ms
      order by r.best_time_ms desc,r.record_ref
      limit p_limit
    )
    select
      (1+(select count(*) from public.track_records x
          where x.track_id=v_track
            and x.best_time_ms<c.best_time_ms))::bigint,
      c.nick::text,c.best_time_ms,c.car_id,c.record_ref,
      true,(p_reference_ms-c.best_time_ms)::integer
    from candidates c
    order by c.best_time_ms desc,c.record_ref;
end;
$function$;
revoke all on function public.get_race_control_nearby_ghosts(text,integer,integer,integer,integer) from public,anon;
grant execute on function public.get_race_control_nearby_ghosts(text,integer,integer,integer,integer) to authenticated;

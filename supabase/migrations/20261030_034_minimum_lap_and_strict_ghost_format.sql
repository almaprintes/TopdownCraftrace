-- Align all record publishers with the existing game minimum >1000ms.
-- Fix SQL three-valued logic: NULL format must not bypass format=1.
-- No changes to existing data; these cannot establish legitimate lap physics.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.submit_track_record(text,integer,text)'::regprocedure)) <> '83f9c0b49827f3ec6e9af33eaf361f6c'
     or md5(pg_get_functiondef('public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint)'::regprocedure)) <> 'e8a01e198d4fa96f18c00d0f2e08ae71'
  then raise exception 'Publisher changed during review; refusing patch'; end if;
  if (select min(best_time_ms) from public.track_records)<=1000 then
    raise exception 'Existing official record below minimum; refuse patch'; end if;
end;
$guard$;

CREATE OR REPLACE FUNCTION public.submit_track_record(p_track_id text, p_best_time_ms integer, p_car_id text DEFAULT NULL::text)
 RETURNS TABLE(track_id text, best_time_ms integer, car_id text, improved boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_track_id text := trim(p_track_id);
  v_car_id text := nullif(trim(p_car_id),'');
  v_previous_time integer;
  v_improved boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_track_id is null or char_length(v_track_id) not between 1 and 80 then
    raise exception 'Invalid track_id';
  end if;
  if not tdr_web_private.is_current_race_control_track(v_track_id) then
    raise exception 'Invalid track_id';
  end if;
  if p_best_time_ms is null or p_best_time_ms <= 1000 then
    raise exception 'Invalid best_time_ms';
  end if;
  if p_car_id is not null and (char_length(trim(p_car_id)) < 1 or char_length(trim(p_car_id)) > 80) then
    raise exception 'Invalid car_id';
  end if;
  select tr.best_time_ms into v_previous_time
    from public.track_records tr
   where tr.user_id = v_user_id and tr.track_id = v_track_id
   for update;
  if v_previous_time is null then
    insert into public.track_records(user_id,track_id,best_time_ms,car_id)
    values(v_user_id,v_track_id,p_best_time_ms,v_car_id);
    v_improved := true;
  elsif p_best_time_ms < v_previous_time then
    update public.track_records tr
       set best_time_ms=p_best_time_ms,car_id=v_car_id,
           ghost_format=null,ghost_payload=null,
           ghost_sample_count=null,ghost_size_bytes=null,
           record_ref=gen_random_uuid(),updated_at=now()
     where tr.user_id=v_user_id and tr.track_id=v_track_id;
    v_improved := true;
  end if;
  return query select tr.track_id,tr.best_time_ms,tr.car_id,v_improved
    from public.track_records tr
   where tr.user_id=v_user_id and tr.track_id=v_track_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_track_record_with_ghost(p_track_id text, p_best_time_ms integer, p_car_id text, p_ghost_payload bytea, p_ghost_sample_count integer, p_ghost_format smallint DEFAULT 1)
 RETURNS TABLE(record_ref uuid, track_id text, best_time_ms integer, car_id text, ghost_format smallint, ghost_sample_count integer, ghost_size_bytes integer, improved boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_track_id text := trim(p_track_id);
  v_car_id text := nullif(trim(p_car_id), '');
  v_previous_time integer;
  v_improved boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_track_id is null or char_length(v_track_id) not between 1 and 80 then raise exception 'Invalid track_id'; end if;
  if not tdr_web_private.is_current_race_control_track(v_track_id) then
    raise exception 'Invalid track_id';
  end if;
  if p_best_time_ms is null or p_best_time_ms <= 1000 then raise exception 'Invalid best_time_ms'; end if;
  if v_car_id is null or char_length(v_car_id) > 80 then raise exception 'Invalid car_id'; end if;
  if p_ghost_format is distinct from 1 then raise exception 'Unsupported ghost format'; end if;
  if p_ghost_payload is null or octet_length(p_ghost_payload) not between 1 and 131072 then raise exception 'Invalid ghost payload'; end if;
  if p_ghost_sample_count is null or p_ghost_sample_count < 2 or p_ghost_sample_count > 20000 then raise exception 'Invalid ghost sample count'; end if;

  select tr.best_time_ms into v_previous_time
  from public.track_records tr
  where tr.user_id = v_user_id and tr.track_id = v_track_id
  for update;

  -- Decode only when the candidate improves the best (no O(samples)
  -- work for a no-op attempt). Bad packets are never stored.
  if (v_previous_time is null or p_best_time_ms < v_previous_time)
    and not tdr_web_private.valid_online_ghost_v1(
      p_ghost_payload,p_ghost_sample_count,p_best_time_ms)
  then
    raise exception 'Invalid ghost payload';
  end if;

  if v_previous_time is null then
    insert into public.track_records(
      user_id, track_id, best_time_ms, car_id,
      record_ref, ghost_format, ghost_payload,
      ghost_sample_count, ghost_size_bytes
    )
    values(
      v_user_id, v_track_id, p_best_time_ms, v_car_id,
      gen_random_uuid(), p_ghost_format, p_ghost_payload,
      p_ghost_sample_count, octet_length(p_ghost_payload)
    );
    v_improved := true;

  elsif p_best_time_ms < v_previous_time then
    update public.track_records tr
    set
      best_time_ms = p_best_time_ms,
      car_id = v_car_id,
      record_ref = gen_random_uuid(),
      ghost_format = p_ghost_format,
      ghost_payload = p_ghost_payload,
      ghost_sample_count = p_ghost_sample_count,
      ghost_size_bytes = octet_length(p_ghost_payload),
      updated_at = now()
    where tr.user_id = v_user_id
      and tr.track_id = v_track_id;

    v_improved := true;
  end if;

  return query
  select
    tr.record_ref,
    tr.track_id,
    tr.best_time_ms,
    tr.car_id,
    tr.ghost_format,
    tr.ghost_sample_count,
    tr.ghost_size_bytes,
    v_improved
  from public.track_records tr
  where tr.user_id = v_user_id
    and tr.track_id = v_track_id;
end;
$function$
;
revoke all on function public.submit_track_record(text,integer,text) from public,anon;
revoke all on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint) from public,anon;
grant execute on function public.submit_track_record(text,integer,text) to authenticated;
grant execute on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint) to authenticated;
commit;

-- Format-1 online ghost structural validation.
-- Non-destructive. No extra DB rows, indexes, cron or client requests.
-- Only decode when an authenticated submission would improve a record.
-- Does NOT certify physics, track checkpoints or absence of cheats.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint)'::regprocedure)) <> 'f4de0464bfa76f212e00c12e5154d974' then
    raise exception 'Publisher changed since anti-cheat audit; abort';
  end if;
end;
$guard$;


create or replace function tdr_web_private.valid_online_ghost_v1(
  p_bytes bytea,p_frames integer,p_lap_ms integer)
returns boolean
language plpgsql immutable strict security invoker
set search_path = ''
as $verify$
declare
  v_len integer:=octet_length(p_bytes);
  v_at integer:=0;
  v_i integer;v_j integer;v_k integer;v_byte integer;
  v_number bigint;v_multiplier bigint;v_delta bigint;v_current bigint;
  v_last bigint[]:=array[0::bigint,0::bigint,0::bigint,0::bigint];
  v_previous_time bigint:=-1;v_ended boolean;
begin
  if p_frames not between 2 and 20000 or p_lap_ms<=0
    or v_len not between 1 and 131072 then return false; end if;
  -- Format 1 is a stream of four ZigZag varints per sampled frame:
  -- (milliseconds, x*4, y*4, heading*10000), delta-coded after frame 1.
  for v_i in 1..p_frames loop
    for v_j in 1..4 loop
      v_number:=0;v_multiplier:=1;v_ended:=false;
      for v_k in 1..8 loop
        if v_at>=v_len then return false; end if;
        v_byte:=get_byte(p_bytes,v_at);v_at:=v_at+1;
        v_number:=v_number+((v_byte & 127)::bigint*v_multiplier);
        if v_byte<128 then
          if v_k>1 and v_byte=0 then return false; end if;
          v_ended:=true;exit;
        end if;
        v_multiplier:=v_multiplier*128;
      end loop;
      if not v_ended or v_number>4294967295 then return false; end if;
      -- ZigZag decoding (same as onlineGhostCodec.js).
      if (v_number%2)=0 then v_delta:=v_number/2;
      else v_delta:=-(v_number+1)/2; end if;
      v_current:=v_last[v_j]+v_delta;
      if v_current < -2147483648 or v_current > 2147483647
      then return false; end if;
      v_last[v_j]:=v_current;
    end loop;
    if v_last[1]<0 or v_last[1]>p_lap_ms
       or (v_i>1 and v_last[1]<=v_previous_time)
    then return false; end if;
    v_previous_time:=v_last[1];
  end loop;
  -- The native encoder appends an exact sample at lapMs.
  return v_at=v_len and v_previous_time=p_lap_ms;
end;
$verify$;

-- Regression gate: do not activate enforcement if any current legitimate
-- stored ghost fails the exact same decoder. This runs once on migration.
do $stored_ghosts$
declare v_count integer;
begin
  select count(*) into v_count
  from public.track_records
  where ghost_payload is not null
    and not tdr_web_private.valid_online_ghost_v1(
      ghost_payload,ghost_sample_count,best_time_ms);
  if v_count>0 then
    raise exception 'Stored ghost compatibility check failed for % recordings',v_count;
  end if;
  -- Malformed packets must fail without storing or modifying any record.
  if tdr_web_private.valid_online_ghost_v1(decode('0000','hex'),2,1000)
    or tdr_web_private.valid_online_ghost_v1(decode('000000000000000000','hex'),2,1000)
    or tdr_web_private.valid_online_ghost_v1(decode('ffffffffffffffff','hex'),2,1000)
  then raise exception 'Malformed ghost accepted by decoder'; end if;
end;
$stored_ghosts$;
revoke all on function tdr_web_private.valid_online_ghost_v1(bytea,integer,integer)
  from public,anon,authenticated;

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
  if p_best_time_ms is null or p_best_time_ms <= 0 then raise exception 'Invalid best_time_ms'; end if;
  if v_car_id is null or char_length(v_car_id) > 80 then raise exception 'Invalid car_id'; end if;
  if p_ghost_format <> 1 then raise exception 'Unsupported ghost format'; end if;
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
revoke all on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint)
  from public,anon;
grant execute on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint)
  to authenticated;
commit;

-- TDR Race Control public leaderboard: skip identical snapshot writes.
-- Migration is non-destructive and preserves the five-minute refresh cadence,
-- Top 10 ranking logic, track geometry IDs, and the existing REST response.
-- "generated_at" becomes the last actual CONTENT change timestamp.
-- "refresh_daily.refreshes" counts changed snapshots from this migration onward.
-- No triggers or new per-player writes; cron still executes its lightweight reads.
CREATE OR REPLACE FUNCTION tdr_web_private.refresh_leaderboards()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare started timestamptz:=clock_timestamp(); snapshot jsonb; changed_rows integer;
begin
  -- Only currently playable circuits: Normal and Inverso. Internal geometry
  -- IDs are intentionally stable; abandoned physical editions are excluded.
  with tracks(track_id) as (
    values
    ('circuito-atlantico@g2-20261023'),
    ('circuito-atlantico-inverso'),
    ('santa-cruz@g2-20261023'),
    ('santa-cruz-inverso'),
    ('karting-tenerife-horario'),
    ('karting-tenerife'),
    ('karting-canarias-4096'),
    ('karting-canarias-4096-inverso'),
    ('karting-americas'),
    ('karting-americas-inverso'),
    ('rally-arafo-los-loros'),
    ('siete-picos'),
    ('siete-picos-inverso')
  ), boards as (
    select t.track_id,coalesce(b.entries,'[]'::jsonb) entries
    from tracks t cross join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'rank',r.position,'nick',r.nick,'best_time_ms',r.best_time_ms,'car_id',r.car_id
        ) order by r.best_time_ms,r.created_at,r.user_id
      ) entries
      from (
        select rank() over(order by best.best_time_ms) position,best.*
        from (
          select p.nick,tr.best_time_ms,tr.car_id,tr.created_at,tr.user_id
          from public.track_records tr join public.profiles p on p.user_id=tr.user_id
          where tr.track_id=t.track_id and tr.best_time_ms>0
          order by tr.best_time_ms,tr.created_at,tr.user_id limit 10
        ) best
      ) r
    ) b
  )
  select jsonb_build_object('version',1,'generated_at',started,
       'refresh_seconds',300,'tracks',coalesce(jsonb_agg(
       jsonb_build_object('id',track_id,'entries',entries) order by track_id),'[]'::jsonb))
  into snapshot from boards;
  -- The generated_at timestamp changes at every cron tick; only rankings
  -- and schema version determine whether the public payload really changed.
  -- Avoid updating the public snapshot and its daily change stats on no-ops.
  insert into public.web_leaderboard_snapshot(id,payload) values(true,snapshot)
  on conflict(id) do update set payload=excluded.payload
  where public.web_leaderboard_snapshot.payload->'tracks'
          is distinct from excluded.payload->'tracks'
     or public.web_leaderboard_snapshot.payload->'version'
          is distinct from excluded.payload->'version';
  get diagnostics changed_rows = row_count;
  if changed_rows = 0 then
    return;
  end if;
  insert into tdr_web_private.refresh_daily(day,refreshes,total_ms,max_payload_bytes)
  values((started at time zone 'UTC')::date,1,
    extract(epoch from clock_timestamp()-started)*1000,octet_length(snapshot::text))
  on conflict(day) do update set refreshes=tdr_web_private.refresh_daily.refreshes+1,
   total_ms=tdr_web_private.refresh_daily.total_ms+excluded.total_ms,
   max_payload_bytes=greatest(tdr_web_private.refresh_daily.max_payload_bytes,excluded.max_payload_bytes);
  delete from tdr_web_private.refresh_daily where day<(started at time zone 'UTC')::date-90;
end;
$function$
;

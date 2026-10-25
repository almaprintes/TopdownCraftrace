-- 7 Picos and 7 Picos Inverso must appear in the guest GLOBAL snapshot
-- before the first authenticated pilot publishes a valid lap. Preserve all
-- previous track IDs and ranked entries; dynamic track_records UNION remains.
-- No change to submit/get RPCs, auth, RLS, profiles or stored track records.
create or replace function tdr_web_private.refresh_leaderboards()
returns void language plpgsql set search_path to ''
as $function$
declare started timestamptz := clock_timestamp(); snapshot jsonb;
begin
 with tracks as (
  select track_id from (values
    ('circuito-atlantico'),('karting-canarias'),('karting-tenerife'),('santa-cruz'),
    ('siete-picos'),('siete-picos-inverso')
  ) defaults(track_id)
  union select distinct track_id from public.track_records
 ), boards as (
  select t.track_id,coalesce(b.entries,'[]'::jsonb) entries from tracks t
  cross join lateral (
   select jsonb_agg(jsonb_build_object('rank',r.position,'nick',r.nick,'best_time_ms',r.best_time_ms,'car_id',r.car_id)
      order by r.best_time_ms,r.created_at,r.user_id) entries
   from (select rank() over(order by best.best_time_ms) position,best.* from (
    select p.nick,tr.best_time_ms,tr.car_id,tr.created_at,tr.user_id
    from public.track_records tr join public.profiles p on p.user_id=tr.user_id
    where tr.track_id=t.track_id and tr.best_time_ms>0
    order by tr.best_time_ms,tr.created_at,tr.user_id limit 10
   ) best) r
  ) b
 )
 select jsonb_build_object('version',1,'generated_at',started,
   'refresh_seconds',300,'tracks',
   coalesce(jsonb_agg(jsonb_build_object('id',track_id,'entries',entries) order by track_id),'[]'::jsonb))
 into snapshot from boards;
 insert into public.web_leaderboard_snapshot(id,payload) values(true,snapshot)
 on conflict(id) do update set payload=excluded.payload;
 insert into tdr_web_private.refresh_daily(day,refreshes,total_ms,max_payload_bytes)
 values((started at time zone 'UTC')::date,1,
   extract(epoch from clock_timestamp()-started)*1000,octet_length(snapshot::text))
 on conflict(day) do update
 set refreshes=tdr_web_private.refresh_daily.refreshes+1,
     total_ms=tdr_web_private.refresh_daily.total_ms+excluded.total_ms,
     max_payload_bytes=greatest(tdr_web_private.refresh_daily.max_payload_bytes,excluded.max_payload_bytes);
 delete from tdr_web_private.refresh_daily where day<(started at time zone 'UTC')::date-90;
end;
$function$;

-- Seed empty boards without inventing any race records.
select tdr_web_private.refresh_leaderboards();

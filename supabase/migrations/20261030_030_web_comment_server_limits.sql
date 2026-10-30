-- Anti-abuse for web comments, preserve anonymous posting via the narrow RPC.
-- Per-track caps: 12 per rolling hour; 60 per rolling day.
-- Rate key spoofing no longer bypasses server-wide submission caps.
-- The existing index supports bounded reads; no new index/table/cron job.
-- Old comments and user records are not changed or removed.
begin;
CREATE OR REPLACE FUNCTION public.post_web_track_comment(p_track_id text, p_display_name text, p_message text, p_client_token uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id bigint;
  v_last timestamptz;
  v_normalized text;
begin
  if p_track_id not in ('circuito-atlantico','karting-canarias','karting-tenerife','santa-cruz') then raise exception 'invalid_track'; end if;
  p_display_name := trim(p_display_name); p_message := trim(p_message);
  if char_length(p_display_name) not between 2 and 24 or p_display_name ~ '[<>]' then raise exception 'invalid_name'; end if;
  if char_length(p_message) not between 1 and 280 or p_message ~ '[<>]' then raise exception 'invalid_message'; end if;
  if p_client_token is null then raise exception 'invalid_client'; end if;
  v_normalized := upper(regexp_replace(p_display_name,'[^[:alnum:]]','','g'));
  if exists(select 1 from public.web_reserved_comment_names where normalized_name=v_normalized) then
    raise exception 'reserved_name';
  end if;
  -- Browser-generated UUID is not a trustworthy abuse identity.
  -- Serialize submissions across all 4 public tracks; fail fast on contention.
  if not pg_try_advisory_xact_lock(6183, 20261030) then
    raise exception 'try_again_later';
  end if;
  -- Both checks use the existing (track_id, created_at desc) index.
  -- OFFSET is bounded: at most 12 and 60 recent index entries.
  -- Rejected requests do not write a rate-token row or a comment.
  if exists(
    select 1 from public.web_track_comments
    where track_id=p_track_id and created_at>now()-interval '1 hour'
    order by created_at desc offset 11 limit 1
  ) then raise exception 'rate_limited_track_hour'; end if;
  if exists(
    select 1 from public.web_track_comments
    where track_id=p_track_id and created_at>now()-interval '1 day'
    order by created_at desc offset 59 limit 1
  ) then raise exception 'rate_limited_track_day'; end if;
  select last_posted_at into v_last from public.web_comment_rate_limits where client_token=p_client_token for update;
  if v_last is not null and v_last > now()-interval '60 seconds' then raise exception 'rate_limited'; end if;
  insert into public.web_comment_rate_limits(client_token,last_posted_at) values(p_client_token,now())
  on conflict(client_token) do update set last_posted_at=excluded.last_posted_at;
  insert into public.web_track_comments(track_id,display_name,message) values(p_track_id,p_display_name,p_message) returning id into v_id;
  return v_id;
end;
$function$
;
-- Only the narrow function is publicly callable; underlying tables remain closed.
revoke all on function public.post_web_track_comment(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.post_web_track_comment(text,text,text,uuid) to anon,authenticated;
do $guard$
declare v_id bigint; v_old text;
begin
  select jobid,command into strict v_id,v_old
  from cron.job where jobname='tdr-web-rankings-cleanup' and active;
  if position('delete from cron.job_run_details' in v_old)=0
    or position('web_comment_rate_limits' in v_old)>0
    or position('7 days' in v_old)=0
    then raise exception 'Unexpected existing cleanup command; refusing replacement';
  end if;
  -- Reuse the existing daily cleanup at 03:43 UTC. 48 hours of identifiers
  -- suffices for a 60-second cooldown, even across cleanup runs.
  perform cron.alter_job(v_id,command => 
    'set statement_timeout = ''5s''; delete from public.web_comment_rate_limits '||
    'where last_posted_at < now()-interval ''48 hours''; '||v_old);
end;
$guard$;
commit;

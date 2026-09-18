-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 7: atomic best record + validated compact ghost payload.

alter table public.track_records
  add column record_ref uuid not null default gen_random_uuid(),
  add column ghost_format smallint,
  add column ghost_payload bytea,
  add column ghost_sample_count integer,
  add column ghost_size_bytes integer;

alter table public.track_records
  add constraint track_records_record_ref_unique unique (record_ref),
  add constraint track_records_ghost_complete check (
    (ghost_payload is null and ghost_format is null and ghost_sample_count is null and ghost_size_bytes is null)
    or
    (ghost_payload is not null and ghost_format = 1 and ghost_sample_count >= 2
      and ghost_size_bytes = octet_length(ghost_payload)
      and ghost_size_bytes between 1 and 131072)
  );

create index track_records_record_ref_idx
  on public.track_records (record_ref);

create or replace function public.submit_track_record_with_ghost(
  p_track_id text,
  p_best_time_ms integer,
  p_car_id text,
  p_ghost_payload bytea,
  p_ghost_sample_count integer,
  p_ghost_format smallint default 1
)
returns table (
  record_ref uuid,
  track_id text,
  best_time_ms integer,
  car_id text,
  ghost_format smallint,
  ghost_sample_count integer,
  ghost_size_bytes integer,
  improved boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_id text := trim(p_track_id);
  v_car_id text := nullif(trim(p_car_id), '');
  v_previous_time integer;
  v_improved boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_track_id is null or char_length(v_track_id) not between 1 and 80 then raise exception 'Invalid track_id'; end if;
  if p_best_time_ms is null or p_best_time_ms <= 0 then raise exception 'Invalid best_time_ms'; end if;
  if v_car_id is null or char_length(v_car_id) > 80 then raise exception 'Invalid car_id'; end if;
  if p_ghost_format <> 1 then raise exception 'Unsupported ghost format'; end if;
  if p_ghost_payload is null or octet_length(p_ghost_payload) not between 1 and 131072 then raise exception 'Invalid ghost payload'; end if;
  if p_ghost_sample_count is null or p_ghost_sample_count < 2 or p_ghost_sample_count > 20000 then raise exception 'Invalid ghost sample count'; end if;

  select tr.best_time_ms into v_previous_time
  from public.track_records tr
  where tr.user_id = v_user_id and tr.track_id = v_track_id
  for update;

  if v_previous_time is null then
    insert into public.track_records(user_id,track_id,best_time_ms,car_id,record_ref,ghost_format,ghost_payload,ghost_sample_count,ghost_size_bytes)
    values(v_user_id,v_track_id,p_best_time_ms,v_car_id,gen_random_uuid(),p_ghost_format,p_ghost_payload,p_ghost_sample_count,octet_length(p_ghost_payload));
    v_improved := true;
  elsif p_best_time_ms < v_previous_time then
    update public.track_records tr set
      best_time_ms=p_best_time_ms,
      car_id=v_car_id,
      record_ref=gen_random_uuid(),
      ghost_format=p_ghost_format,
      ghost_payload=p_ghost_payload,
      ghost_sample_count=p_ghost_sample_count,
      ghost_size_bytes=octet_length(p_ghost_payload),
      updated_at=now()
    where tr.user_id=v_user_id and tr.track_id=v_track_id;
    v_improved := true;
  end if;

  return query
  select tr.record_ref,tr.track_id,tr.best_time_ms,tr.car_id,tr.ghost_format,tr.ghost_sample_count,tr.ghost_size_bytes,v_improved
  from public.track_records tr
  where tr.user_id=v_user_id and tr.track_id=v_track_id;
end;
$$;

create or replace function public.get_track_record_ghost(p_record_ref uuid)
returns table (
  record_ref uuid,
  track_id text,
  best_time_ms integer,
  car_id text,
  ghost_format smallint,
  ghost_sample_count integer,
  ghost_size_bytes integer,
  ghost_payload bytea
)
language sql
security definer
set search_path = ''
stable
as $$
  select tr.record_ref,tr.track_id,tr.best_time_ms,tr.car_id,tr.ghost_format,tr.ghost_sample_count,tr.ghost_size_bytes,tr.ghost_payload
  from public.track_records tr
  where auth.uid() is not null
    and tr.record_ref=p_record_ref
    and tr.ghost_payload is not null;
$$;

revoke all on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint) from public;
revoke all on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint) from anon;
grant execute on function public.submit_track_record_with_ghost(text,integer,text,bytea,integer,smallint) to authenticated;

revoke all on function public.get_track_record_ghost(uuid) from public;
revoke all on function public.get_track_record_ghost(uuid) from anon;
grant execute on function public.get_track_record_ghost(uuid) to authenticated;

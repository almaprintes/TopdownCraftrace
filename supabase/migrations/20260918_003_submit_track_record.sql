-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 3: secure best-record submission.

create or replace function public.submit_track_record(
  p_track_id text,
  p_best_time_ms integer,
  p_car_id text default null
)
returns table (
  track_id text,
  best_time_ms integer,
  car_id text,
  improved boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_previous_time integer;
  v_improved boolean := false;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_track_id is null
     or char_length(trim(p_track_id)) < 1
     or char_length(trim(p_track_id)) > 80 then
    raise exception 'Invalid track_id';
  end if;

  if p_best_time_ms is null or p_best_time_ms <= 0 then
    raise exception 'Invalid best_time_ms';
  end if;

  if p_car_id is not null
     and (
       char_length(trim(p_car_id)) < 1
       or char_length(trim(p_car_id)) > 80
     ) then
    raise exception 'Invalid car_id';
  end if;

  select tr.best_time_ms
    into v_previous_time
  from public.track_records tr
  where tr.user_id = v_user_id
    and tr.track_id = trim(p_track_id);

  if v_previous_time is null then
    insert into public.track_records (
      user_id,
      track_id,
      best_time_ms,
      car_id
    )
    values (
      v_user_id,
      trim(p_track_id),
      p_best_time_ms,
      nullif(trim(p_car_id), '')
    );
    v_improved := true;
  elsif p_best_time_ms < v_previous_time then
    update public.track_records tr
    set
      best_time_ms = p_best_time_ms,
      car_id = nullif(trim(p_car_id), ''),
      updated_at = now()
    where tr.user_id = v_user_id
      and tr.track_id = trim(p_track_id);
    v_improved := true;
  end if;

  return query
  select
    tr.track_id,
    tr.best_time_ms,
    tr.car_id,
    v_improved
  from public.track_records tr
  where tr.user_id = v_user_id
    and tr.track_id = trim(p_track_id);
end;
$$;

revoke all on function public.submit_track_record(text, integer, text)
from public;

revoke all on function public.submit_track_record(text, integer, text)
from anon;

grant execute on function public.submit_track_record(text, integer, text)
to authenticated;

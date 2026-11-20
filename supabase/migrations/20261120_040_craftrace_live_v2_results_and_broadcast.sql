-- LIVE 4: additive, authenticated friendly results + scoped private Broadcast.
-- No change to the working v1 rooms, packets, transport or public results.
-- Realtime data is transient and only members of LIVE v2 can join the topic.

create table public.craftrace_live_v2_results (
  room_id uuid not null references public.craftrace_live_v2_rooms(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  pilot_id uuid references auth.users(id) on delete set null,
  is_ai boolean not null default false,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  elapsed_ms integer not null check (elapsed_ms between 1000 and 7200000),
  lap_times jsonb not null check (jsonb_typeof(lap_times)='array' and
    jsonb_array_length(lap_times) between 1 and 30),
  submitted_at timestamptz not null default now(),
  primary key (room_id,seat)
);
alter table public.craftrace_live_v2_results enable row level security;
revoke all on table public.craftrace_live_v2_results from public,anon,authenticated;

-- Same membership validation as lobby snapshot, plus private provisional results.
create or replace function public.craftrace_live_v2_snapshot(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();
  v_room public.craftrace_live_v2_rooms;
  v_members jsonb;v_results jsonb;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state<>'closed';
  if not found then raise exception 'Room unavailable'; end if;
  if not exists(select 1 from public.craftrace_live_v2_members
    where room_id=p_room and user_id=v_uid)
  then raise exception 'Room unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat',seat,'player_id',user_id,'ready',ready,
    'online',last_seen>now()-interval '12 seconds') order by seat),'[]'::jsonb)
    into v_members
    from public.craftrace_live_v2_members where room_id=p_room;
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat',seat,'elapsedMs',elapsed_ms,'lapTimes',lap_times,
    'kind',case when is_ai then 'ai' else 'human' end) order by seat),'[]'::jsonb)
    into v_results
    from public.craftrace_live_v2_results where room_id=p_room;
  return jsonb_build_object(
    'id',v_room.id,'code',v_room.code,'host_id',v_room.host_id,
    'track_id',v_room.track_id,'car_id',v_room.car_id,
    'laps',v_room.laps,'physics_version',v_room.physics_version,
    'direction',v_room.direction,'capacity',v_room.capacity,
    'fill_ai',v_room.fill_ai,'ai_difficulty',v_room.ai_difficulty,
    'state',v_room.state,'members',v_members,'results',v_results,
    'locked_roster',v_room.locked_roster,
    'start_at_ms',case when v_room.start_at is not null
      then floor(extract(epoch from v_room.start_at)*1000)::bigint else null end,
    'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $fn$;


-- Preserve the original membership-only snapshot grant after replacement.
revoke all on function public.craftrace_live_v2_snapshot(uuid)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_snapshot(uuid)
  to authenticated;

-- The RPC authorizes the authenticated submitter against the SERVER-LOCKED seat.
-- These times are PROVISIONAL. They must never publish official leaderboards.
create function public.craftrace_live_v2_finish(
  p_room uuid,p_seat integer,p_lap_times jsonb,p_elapsed_ms integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_v2_rooms;
  v_entry jsonb;v_lap_sum bigint;v_player uuid;v_is_ai boolean;
  v_record public.craftrace_live_v2_results;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  if p_room is null or p_seat is null or p_seat not between 0 and 3 or
    p_elapsed_ms is null or p_elapsed_ms not between 1000 and 7200000
  then raise exception 'Invalid result'; end if;
  if p_lap_times is null or jsonb_typeof(p_lap_times)<>'array'
  then raise exception 'Invalid lap times'; end if;
  -- Serialize finish with race/close changes; members can never claim other seats.
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state in ('countdown','racing','finished')
    for update;
  if not found or v_room.locked_roster is null or v_room.start_at>now()
  then raise exception 'Race not started'; end if;
  if not exists (select 1 from public.craftrace_live_v2_members
    where room_id=p_room and user_id=v_uid)
  then raise exception 'Not a room member'; end if;
  if jsonb_array_length(p_lap_times)<>v_room.laps
  then raise exception 'Lap count mismatch'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_lap_times) e
    where e.value !~ '^[0-9]{3,7}$')
  then raise exception 'Invalid lap time value'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_lap_times) e
    where e.value::bigint not between 500 and 7200000)
  then raise exception 'Invalid lap time range'; end if;
  select sum(e.value::bigint) into v_lap_sum
    from jsonb_array_elements_text(p_lap_times) e;
  if v_lap_sum<>p_elapsed_ms
  then raise exception 'Invalid total'; end if;
  select value into v_entry from jsonb_array_elements(v_room.locked_roster) as j(value)
    where (value->>'seat')::integer=p_seat;
  if v_entry is null then raise exception 'Seat not in race'; end if;
  v_is_ai := (v_entry->>'kind')='ai';
  if v_is_ai then
    if v_room.host_id<>v_uid or (v_entry->>'owner_id')::uuid<>v_uid
    then raise exception 'Only host reports AI'; end if;
    v_player:=null;
  else
    v_player:=(v_entry->>'player_id')::uuid;
    if v_player is distinct from v_uid then raise exception 'Not your seat'; end if;
  end if;
  insert into public.craftrace_live_v2_results(
    room_id,seat,pilot_id,is_ai,submitted_by,elapsed_ms,lap_times)
  values(p_room,p_seat,v_player,v_is_ai,v_uid,p_elapsed_ms,p_lap_times)
  on conflict(room_id,seat) do nothing;
  select * into v_record from public.craftrace_live_v2_results
    where room_id=p_room and seat=p_seat;
  -- First finish wins: nobody may silently rewrite a stored result.
  return jsonb_build_object('seat',v_record.seat,'elapsedMs',v_record.elapsed_ms,
    'lapTimes',v_record.lap_times,'isAi',v_record.is_ai,'saved',true);
end $fn$;

revoke all on function public.craftrace_live_v2_finish(uuid,integer,jsonb,integer)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_finish(uuid,integer,jsonb,integer)
  to authenticated;

-- Only members may subscribe to this private topic. Bots never authenticate.
create function public.craftrace_live_v2_is_member(p_topic text)
returns boolean language sql stable security definer set search_path=''
as $fn$
  select (select auth.uid()) is not null
    and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    and p_topic like 'craftrace-live4:%'
    and exists(
      select 1 from public.craftrace_live_v2_rooms r
      join public.craftrace_live_v2_members m on m.room_id=r.id
      where p_topic='craftrace-live4:'||r.id::text
        and m.user_id=(select auth.uid())
        and r.state<>'closed' and r.expires_at>now()
    );
$fn$;
revoke all on function public.craftrace_live_v2_is_member(text)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_is_member(text)
  to authenticated;

create policy "craftrace live4 receive by member"
on realtime.messages for select to authenticated
using (extension='broadcast' and
  (select public.craftrace_live_v2_is_member(realtime.topic())));

create policy "craftrace live4 send by member"
on realtime.messages for insert to authenticated
with check (extension='broadcast' and
  (select public.craftrace_live_v2_is_member(realtime.topic())));

-- Realtime membership is checked on channel join. Revoking membership later
-- does not instantly revoke an already-subscribed socket: expire and close
-- channels on the client, and limit the beta to friendly/no-reward races.

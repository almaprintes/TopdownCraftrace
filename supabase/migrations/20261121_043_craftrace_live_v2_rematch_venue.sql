-- LIVE 4 DEV-only friendly rematches and editable pre-race venue.
-- Isolated from LIVE 2, official records, Elo and published rankings.
-- A new room is created for each race; old results are immutable.
alter table public.craftrace_live_v2_rooms
 add column if not exists rematch_room_id uuid
 references public.craftrace_live_v2_rooms(id) on delete set null;
alter table public.craftrace_live_v2_rooms
 add column if not exists ai_identity_seed uuid;

-- LIVE 4: member-only nicknames in snapshots for lobby, labels and results.
-- Account UUIDs, room authorization, records and ranking policies unchanged.
-- No public read grants for either profile table.
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
  -- Only reveal nicknames of pilots who belong to this authenticated room.
  -- Prefer the player's race profile, fallback to the CraftRace account nick.
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat',m.seat,'player_id',m.user_id,'ready',m.ready,
    'online',m.last_seen>now()-interval '12 seconds',
    'nick',coalesce(nullif(btrim(p.nick),''),nullif(btrim(a.nickname),'')))
    order by m.seat),'[]'::jsonb)
    into v_members
    from public.craftrace_live_v2_members m
    left join public.profiles p on p.user_id=m.user_id
    left join public.craft_accounts a on a.user_id=m.user_id
    where m.room_id=p_room;
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
    'rematch_room_id',v_room.rematch_room_id,
    'ai_identity_seed',coalesce(v_room.ai_identity_seed,v_room.id),
    'start_at_ms',case when v_room.start_at is not null
      then floor(extract(epoch from v_room.start_at)*1000)::bigint else null end,
    'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $fn$;
revoke all on function public.craftrace_live_v2_snapshot(uuid)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_snapshot(uuid)
  to authenticated;


-- Only authenticated host can change venue while waiting; all humans re-ready.
create function public.craftrace_live_v2_set_venue(
 p_room uuid,p_track text,p_car text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid:=auth.uid();v_room public.craftrace_live_v2_rooms;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required'; end if;
 if p_track is null or p_track !~ '^[a-zA-Z0-9_-]{1,64}$' or
    p_car is null or p_car !~ '^[a-zA-Z0-9_-]{1,64}$'
 then raise exception 'Invalid circuit or car'; end if;
 select * into v_room from public.craftrace_live_v2_rooms
  where id=p_room and state='waiting' and expires_at>now() for update;
 if not found or v_room.host_id<>v_uid
 then raise exception 'Only waiting host may change venue'; end if;
 if (v_room.track_id,v_room.car_id) is distinct from (p_track,p_car) then
  update public.craftrace_live_v2_rooms set track_id=p_track,car_id=p_car
   where id=p_room;
  update public.craftrace_live_v2_members set ready=false where room_id=p_room;
 end if;
 return public.craftrace_live_v2_snapshot(p_room);
end $fn$;

-- Create one new member-only room from a fully completed race.
-- Existing results, old locked roster and race-start timestamps never change.
create function public.craftrace_live_v2_request_rematch(
 p_room uuid,p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid:=auth.uid();v_old public.craftrace_live_v2_rooms;
 v_next uuid;v_total integer;v_finished integer;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required'; end if;
 if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{7}$'
 then raise exception 'Invalid invitation code'; end if;
 select * into v_old from public.craftrace_live_v2_rooms
  where id=p_room and state in ('countdown','racing','finished')
   and expires_at>now() for update;
 if not found or v_old.host_id<>v_uid
 then raise exception 'Only the original host may request a rematch'; end if;
 if v_old.rematch_room_id is not null then
  return public.craftrace_live_v2_snapshot(v_old.rematch_room_id);
 end if;
 if v_old.locked_roster is null then raise exception 'No official grid'; end if;
 v_total:=jsonb_array_length(v_old.locked_roster);
 select count(*) into v_finished from public.craftrace_live_v2_results
  where room_id=p_room;
 if v_total<2 or v_finished<>v_total
 then raise exception 'Wait for all finish results before rematch'; end if;
 if (select count(*) from public.craftrace_live_v2_rooms
   where host_id=v_uid and created_at>now()-interval '1 hour')>=12
 then raise exception 'Hourly rematch room limit reached'; end if;
 insert into public.craftrace_live_v2_rooms(
  code,host_id,track_id,car_id,laps,physics_version,direction,
  capacity,fill_ai,ai_difficulty,ai_identity_seed)
 values(p_code,v_uid,v_old.track_id,v_old.car_id,v_old.laps,
  v_old.physics_version,v_old.direction,v_old.capacity,
  v_old.fill_ai,v_old.ai_difficulty,coalesce(v_old.ai_identity_seed,v_old.id))
 returning id into v_next;
 insert into public.craftrace_live_v2_members(room_id,user_id,seat)
 values(v_next,v_uid,0);
 update public.craftrace_live_v2_rooms
  set rematch_room_id=v_next where id=p_room;
 return public.craftrace_live_v2_snapshot(v_next);
end $fn$;

-- Only a member of the PREVIOUS room can accept its rematch invitation.
-- New room seats match the previous ones, without being auto-consented.
create function public.craftrace_live_v2_accept_rematch(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid:=auth.uid();v_old public.craftrace_live_v2_rooms;
 v_next public.craftrace_live_v2_rooms;v_seat smallint;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required'; end if;
 select * into v_old from public.craftrace_live_v2_rooms
  where id=p_room and expires_at>now() and state<>'closed';
 if not found or v_old.rematch_room_id is null
 then raise exception 'No rematch proposed'; end if;
 select seat into v_seat from public.craftrace_live_v2_members
  where room_id=p_room and user_id=v_uid;
 if not found then raise exception 'Not a participant of previous race'; end if;
 select * into v_next from public.craftrace_live_v2_rooms
  where id=v_old.rematch_room_id and state='waiting'
   and expires_at>now() for update;
 if not found or v_next.host_id<>v_old.host_id or v_seat>=v_next.capacity
 then raise exception 'Rematch not available'; end if;
 if exists(select 1 from public.craftrace_live_v2_members
   where room_id=v_next.id and seat=v_seat and user_id<>v_uid)
 then raise exception 'Rematch seat occupied'; end if;
 insert into public.craftrace_live_v2_members(room_id,user_id,seat)
 values(v_next.id,v_uid,v_seat)
 on conflict (room_id,user_id) do update set last_seen=now();
 return public.craftrace_live_v2_snapshot(v_next.id);
end $fn$;

revoke all on function public.craftrace_live_v2_set_venue(uuid,text,text)
 from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_request_rematch(uuid,text)
 from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_accept_rematch(uuid)
 from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_set_venue(uuid,text,text)
 to authenticated;
grant execute on function public.craftrace_live_v2_request_rematch(uuid,text)
 to authenticated;
grant execute on function public.craftrace_live_v2_accept_rematch(uuid)
 to authenticated;

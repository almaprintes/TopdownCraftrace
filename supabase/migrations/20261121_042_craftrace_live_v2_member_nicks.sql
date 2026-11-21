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
    'start_at_ms',case when v_room.start_at is not null
      then floor(extract(epoch from v_room.start_at)*1000)::bigint else null end,
    'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $fn$;
revoke all on function public.craftrace_live_v2_snapshot(uuid)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_snapshot(uuid)
  to authenticated;

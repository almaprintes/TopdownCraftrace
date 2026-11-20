-- CraftRace LIVE 4: a race only receives its GO time once every human
-- has loaded the scene and joined the protected Realtime channel.
-- Keeps the two-player LIVE and public records absolutely unchanged.
alter table public.craftrace_live_v2_members
  add column if not exists grid_loaded_at timestamptz;

-- Race start locks the roster but intentionally does not schedule a deadline.
-- Existing authorized pilots may reconnect with their original place.
create or replace function public.craftrace_live_v2_start(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_v2_rooms;
  v_humans integer;v_not_ready integer;v_seat integer;
  v_roster jsonb;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state='waiting' for update;
  if not found or v_room.host_id<>v_uid
  then raise exception 'Only waiting host can start'; end if;
  select count(*),count(*) filter (
    where not ready or last_seen<=now()-interval '15 seconds')
    into v_humans,v_not_ready
    from public.craftrace_live_v2_members where room_id=p_room;
  if v_humans=0 or v_not_ready>0
  then raise exception 'All connected pilots must be ready'; end if;
  if v_humans+(case when v_room.fill_ai then v_room.capacity-v_humans else 0 end)<2
  then raise exception 'At least two participants required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat',seat,'kind','human','player_id',user_id) order by seat),'[]'::jsonb)
    into v_roster from public.craftrace_live_v2_members
    where room_id=p_room;
  if v_room.fill_ai then
    for v_seat in 0..v_room.capacity-1 loop
      if not exists (select 1 from public.craftrace_live_v2_members
        where room_id=p_room and seat=v_seat) then
        v_roster:=v_roster||jsonb_build_array(jsonb_build_object(
          'seat',v_seat,'kind','ai','bot_id','ai-seat-'||(v_seat+1),
          'owner_id',v_uid,'difficulty',v_room.ai_difficulty));
      end if;
    end loop;
  end if;
  update public.craftrace_live_v2_rooms
    set state='countdown',start_at=null,
        locked_roster=v_roster
    where id=p_room;
  return public.craftrace_live_v2_snapshot(p_room);
end $fn$;


create function public.craftrace_live_v2_grid_loaded(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();
 v_room public.craftrace_live_v2_rooms;
 v_rowcount integer;v_total integer;v_loaded integer;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required'; end if;
 -- Serialize with start, leave and every other readiness acknowledgement.
 select * into v_room from public.craftrace_live_v2_rooms
   where id=p_room and expires_at>now() and state='countdown'
   for update;
 if not found then raise exception 'Race unavailable'; end if;
 -- Ack only after actual client Realtime subscription; the caller must be
 -- an authenticated HUMAN member of the server-locked roster.
 update public.craftrace_live_v2_members
   set grid_loaded_at=now(),last_seen=now()
   where room_id=p_room and user_id=v_uid
   and exists(
     select 1 from jsonb_array_elements(v_room.locked_roster) as r(value)
     where r.value->>'kind'='human' and (r.value->>'player_id')::uuid=v_uid
   );
 get diagnostics v_rowcount=row_count;
 if v_rowcount<>1 then raise exception 'Not a race pilot'; end if;
 if v_room.start_at is null then
   select count(*),count(*) filter (
     where grid_loaded_at is not null
       and last_seen>now()-interval '15 seconds'
   ) into v_total,v_loaded
   from public.craftrace_live_v2_members
   where room_id=p_room;
   if v_total>=1 and v_total=v_loaded then
     update public.craftrace_live_v2_rooms
       set start_at=now()+interval '7 seconds'
       where id=p_room and start_at is null;
   end if;
 end if;
 return public.craftrace_live_v2_snapshot(p_room);
end $fn$;

revoke all on function public.craftrace_live_v2_grid_loaded(uuid)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_grid_loaded(uuid)
  to authenticated;
-- Override of existing function retains the original execution rights;
-- assert them anyway to protect against default grants.
revoke all on function public.craftrace_live_v2_start(uuid)
  from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_start(uuid)
  to authenticated;

-- A timeout while loading never automatically starts the race. The host can
-- explicitly close an abandoned room and create a fresh one.

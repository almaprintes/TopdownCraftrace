-- CraftRace LIVE v2 (2–4 participants). ADDITIVE AND ISOLATED.
-- The existing craftrace_live_rooms / craftrace_live_packets and their RPCs are untouched.
-- No client is switched to v2 by this migration.
-- API functions live in public solely for PostgREST exposure: explicitly restricted
-- to authenticated permanent accounts, membership/host checks on EVERY function.
-- SECURITY DEFINER requires strict grants and search_path = ''.

create table public.craftrace_live_v2_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{7}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null check (track_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  car_id text not null check (car_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  laps integer not null check (laps between 1 and 30),
  physics_version integer not null check (physics_version between 1 and 10000),
  direction text not null check (direction in ('forward','reverse')),
  capacity smallint not null default 2 check (capacity between 2 and 4),
  fill_ai boolean not null default false,
  ai_difficulty smallint not null default 2 check (ai_difficulty between 1 and 3),
  state text not null default 'waiting'
    check (state in ('waiting','countdown','racing','finished','closed')),
  start_at timestamptz,
  locked_roster jsonb check (locked_roster is null or
    (jsonb_typeof(locked_roster)='array' and jsonb_array_length(locked_roster) between 2 and 4)),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 hours')
);

create table public.craftrace_live_v2_members (
  room_id uuid not null references public.craftrace_live_v2_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id,user_id),
  unique (room_id,seat)
);
create index craftrace_live_v2_rooms_host_created_idx
  on public.craftrace_live_v2_rooms(host_id,created_at desc);
create index craftrace_live_v2_rooms_expires_idx
  on public.craftrace_live_v2_rooms(expires_at);
create index craftrace_live_v2_members_user_idx
  on public.craftrace_live_v2_members(user_id);

alter table public.craftrace_live_v2_rooms enable row level security;
alter table public.craftrace_live_v2_members enable row level security;
revoke all on table public.craftrace_live_v2_rooms,public.craftrace_live_v2_members
  from public,anon,authenticated;

create function public.craftrace_live_v2_snapshot(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();
  v_room public.craftrace_live_v2_rooms;
  v_members jsonb;
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
  return jsonb_build_object(
    'id',v_room.id,'code',v_room.code,'host_id',v_room.host_id,
    'track_id',v_room.track_id,'car_id',v_room.car_id,
    'laps',v_room.laps,'physics_version',v_room.physics_version,
    'direction',v_room.direction,'capacity',v_room.capacity,
    'fill_ai',v_room.fill_ai,'ai_difficulty',v_room.ai_difficulty,
    'state',v_room.state,'members',v_members,
    'locked_roster',v_room.locked_roster,
    'start_at_ms',case when v_room.start_at is not null
      then floor(extract(epoch from v_room.start_at)*1000)::bigint else null end,
    'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $fn$;

create function public.craftrace_live_v2_create(
  p_code text,p_track text,p_car text,p_laps integer,p_physics integer,
  p_direction text,p_capacity integer,p_fill_ai boolean,p_ai_difficulty integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room uuid;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  if p_code is null or p_track is null or p_car is null
    or p_laps is null or p_physics is null or p_direction is null
    or p_capacity is null or p_fill_ai is null or p_ai_difficulty is null
    or p_code !~ '^[A-HJ-NP-Z2-9]{7}$'
    or p_track !~ '^[a-zA-Z0-9_-]{1,64}$'
    or p_car !~ '^[a-zA-Z0-9_-]{1,64}$'
    or p_laps not between 1 and 30
    or p_physics not between 1 and 10000
    or p_direction not in ('forward','reverse')
    or p_capacity not between 2 and 4
    or p_ai_difficulty not between 1 and 3
  then raise exception 'Invalid room configuration'; end if;
  if (select count(*) from public.craftrace_live_v2_rooms
    where host_id=v_uid and created_at>now()-interval '1 hour')>=6
  then raise exception 'Room creation limit'; end if;
  insert into public.craftrace_live_v2_rooms(
    code,host_id,track_id,car_id,laps,physics_version,direction,
    capacity,fill_ai,ai_difficulty)
  values (p_code,v_uid,p_track,p_car,p_laps,p_physics,p_direction,
    p_capacity,p_fill_ai,p_ai_difficulty) returning id into v_room;
  insert into public.craftrace_live_v2_members(room_id,user_id,seat)
  values (v_room,v_uid,0);
  return public.craftrace_live_v2_snapshot(v_room);
end $fn$;

create function public.craftrace_live_v2_join(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();
  v_room public.craftrace_live_v2_rooms;
  v_seat smallint;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{7}$'
  then raise exception 'Invalid code'; end if;
  -- Atomic reservations: serialize all joins/configuration/start on room row.
  select * into v_room from public.craftrace_live_v2_rooms
    where code=p_code and expires_at>now() and state<>'closed' for update;
  if not found then raise exception 'Room unavailable'; end if;
  -- Existing pilots always retain their place, even during countdown or racing.
  if exists (select 1 from public.craftrace_live_v2_members
    where room_id=v_room.id and user_id=v_uid) then
    update public.craftrace_live_v2_members set last_seen=now()
      where room_id=v_room.id and user_id=v_uid;
    return public.craftrace_live_v2_snapshot(v_room.id);
  end if;
  if v_room.state<>'waiting' then raise exception 'Race already started'; end if;
  select s.seat into v_seat from generate_series(1,v_room.capacity-1) as s(seat)
    where not exists (
      select 1 from public.craftrace_live_v2_members m
      where m.room_id=v_room.id and m.seat=s.seat)
    order by s.seat limit 1;
  if v_seat is null then raise exception 'Room full'; end if;
  insert into public.craftrace_live_v2_members(room_id,user_id,seat)
    values (v_room.id,v_uid,v_seat);
  -- A joining human occupies an empty slot or displaces a provisional bot;
  -- bots do not have accounts and are not stored in member rows.
  return public.craftrace_live_v2_snapshot(v_room.id);
end $fn$;

create function public.craftrace_live_v2_configure(
  p_room uuid,p_capacity integer,p_fill_ai boolean,p_ai_difficulty integer)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();
  v_room public.craftrace_live_v2_rooms;
  v_count integer;v_max integer;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  if p_capacity is null or p_fill_ai is null or p_ai_difficulty is null
    or p_capacity not between 2 and 4 or p_ai_difficulty not between 1 and 3
  then raise exception 'Invalid room configuration'; end if;
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state='waiting' for update;
  if not found or v_room.host_id<>v_uid
  then raise exception 'Only waiting host may configure'; end if;
  select count(*),max(seat) into v_count,v_max
    from public.craftrace_live_v2_members where room_id=p_room;
  if v_count>p_capacity or v_max>=p_capacity
  then raise exception 'Capacity below occupied seat'; end if;
  if (v_room.capacity,v_room.fill_ai,v_room.ai_difficulty)
    is distinct from (p_capacity,p_fill_ai,p_ai_difficulty) then
    update public.craftrace_live_v2_rooms set
      capacity=p_capacity,fill_ai=p_fill_ai,ai_difficulty=p_ai_difficulty
      where id=p_room;
    -- A changed race format requires all connected humans to re-confirm.
    update public.craftrace_live_v2_members set ready=false
      where room_id=p_room;
  end if;
  return public.craftrace_live_v2_snapshot(p_room);
end $fn$;

create function public.craftrace_live_v2_set_ready(p_room uuid,p_ready boolean)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_v2_rooms;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  if p_ready is null then raise exception 'Invalid readiness'; end if;
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state='waiting' for update;
  if not found then raise exception 'Room unavailable'; end if;
  update public.craftrace_live_v2_members set ready=p_ready,last_seen=now()
    where room_id=p_room and user_id=v_uid;
  if not found then raise exception 'Room unavailable'; end if;
  return public.craftrace_live_v2_snapshot(p_room);
end $fn$;

create function public.craftrace_live_v2_heartbeat(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_rowcount integer;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  update public.craftrace_live_v2_members m set last_seen=now()
    where m.room_id=p_room and m.user_id=v_uid and exists (
      select 1 from public.craftrace_live_v2_rooms r
      where r.id=p_room and r.state<>'closed' and r.expires_at>now());
  get diagnostics v_rowcount = row_count;
  if v_rowcount<>1 then raise exception 'Room unavailable'; end if;
  return jsonb_build_object('ok',true,
    'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint);
end $fn$;

create function public.craftrace_live_v2_start(p_room uuid)
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
    set state='countdown',start_at=now()+interval '8 seconds',
        locked_roster=v_roster
    where id=p_room;
  return public.craftrace_live_v2_snapshot(p_room);
end $fn$;

create function public.craftrace_live_v2_leave(p_room uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_v2_rooms;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  then raise exception 'Permanent account required'; end if;
  select * into v_room from public.craftrace_live_v2_rooms
    where id=p_room and expires_at>now() and state<>'closed' for update;
  if not found or not exists(
    select 1 from public.craftrace_live_v2_members
      where room_id=p_room and user_id=v_uid)
  then raise exception 'Room unavailable'; end if;
  if v_uid=v_room.host_id then
    update public.craftrace_live_v2_rooms set state='closed' where id=p_room;
    return jsonb_build_object('state','closed','id',p_room);
  end if;
  if v_room.state<>'waiting' then
    -- Keep membership and seat reserved for authenticated reconnection.
    return jsonb_build_object('state',v_room.state,'id',p_room,
      'left',false,'rejoinable',true);
  end if;
  delete from public.craftrace_live_v2_members
    where room_id=p_room and user_id=v_uid;
  return jsonb_build_object('state','waiting','id',p_room,'left',true);
end $fn$;

-- Supabase/PostgREST often exposes public functions. No default PUBLIC EXECUTE.
revoke all on function public.craftrace_live_v2_snapshot(uuid) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_create(text,text,text,integer,integer,text,integer,boolean,integer) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_join(text) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_configure(uuid,integer,boolean,integer) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_set_ready(uuid,boolean) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_heartbeat(uuid) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_start(uuid) from public,anon,authenticated;
revoke all on function public.craftrace_live_v2_leave(uuid) from public,anon,authenticated;
grant execute on function public.craftrace_live_v2_snapshot(uuid) to authenticated;
grant execute on function public.craftrace_live_v2_create(text,text,text,integer,integer,text,integer,boolean,integer) to authenticated;
grant execute on function public.craftrace_live_v2_join(text) to authenticated;
grant execute on function public.craftrace_live_v2_configure(uuid,integer,boolean,integer) to authenticated;
grant execute on function public.craftrace_live_v2_set_ready(uuid,boolean) to authenticated;
grant execute on function public.craftrace_live_v2_heartbeat(uuid) to authenticated;
grant execute on function public.craftrace_live_v2_start(uuid) to authenticated;
grant execute on function public.craftrace_live_v2_leave(uuid) to authenticated;

-- N.B. Membership authorization for private Realtime channels is NOT activated
-- by this migration. It is a separate reviewed step before switching the UI.

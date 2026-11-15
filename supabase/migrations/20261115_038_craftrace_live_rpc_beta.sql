-- CrafRace LIVE: isolated, RPC-only room transport. REVIEW BEFORE APPLYING.
-- Never modify SlotRace rooms, CraftRace Studio accounts, or Race Control records.
create table if not exists public.craftrace_live_rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{7}$'),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete set null,
 track_id text not null check (track_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 car_id text not null check (car_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 laps integer not null check (laps between 1 and 30),
 physics_version integer not null check (physics_version between 1 and 10000),
 direction text not null check (direction in ('forward','reverse')),
 state text not null default 'waiting' check (state in ('waiting','ready','racing','paused','finished','closed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '2 hours'),
 check (guest_id is null or guest_id<>host_id)
);
create index if not exists craftrace_live_rooms_host_created_idx on public.craftrace_live_rooms(host_id,created_at desc);
create table if not exists public.craftrace_live_packets (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.craftrace_live_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 client_seq integer not null check (client_seq between 1 and 2147483647),
 generation integer not null check (generation between 1 and 1000000),
 heat integer not null check (heat between 1 and 2),
 kind text not null check (kind in ('hello','ready','start','position','pause','resume','finish','chat','reaction','rematch','leave')),
 payload jsonb not null check (jsonb_typeof(payload)='object' and pg_column_size(payload)<=2048),
 created_at timestamptz not null default now(),
 unique(room_id,sender_id,client_seq)
);
create index if not exists craftrace_live_packets_room_idx on public.craftrace_live_packets(room_id,id);
alter table public.craftrace_live_rooms enable row level security;
alter table public.craftrace_live_packets enable row level security;
-- No direct table privileges, including authenticated. All access is through checked RPCs.
revoke all on public.craftrace_live_rooms,public.craftrace_live_packets from public,anon,authenticated;
revoke all on sequence public.craftrace_live_packets_id_seq from public,anon,authenticated;

-- Null arguments are explicitly rejected: SQL three-valued logic must not bypass guards.
create or replace function public.craftrace_live_create(p_code text,p_track text,p_car text,p_laps integer,p_physics integer,p_direction text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid(); v_room public.craftrace_live_rooms;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 if p_code is null or p_track is null or p_car is null or p_laps is null or p_physics is null or p_direction is null
 or p_code !~ '^[A-HJ-NP-Z2-9]{7}$' or p_track !~ '^[a-zA-Z0-9_-]{1,64}$'
 or p_car !~ '^[a-zA-Z0-9_-]{1,64}$' or p_laps not between 1 and 30
 or p_physics not between 1 and 10000 or p_direction not in ('forward','reverse')
 then raise exception 'Invalid room configuration';end if;
 if (select count(*) from public.craftrace_live_rooms where host_id=v_uid and created_at>now()-interval '1 hour')>=6
 then raise exception 'Room creation limit';end if;
 insert into public.craftrace_live_rooms(code,host_id,track_id,car_id,laps,physics_version,direction)
 values(p_code,v_uid,p_track,p_car,p_laps,p_physics,p_direction) returning * into v_room;
 return jsonb_build_object('id',v_room.id,'code',v_room.code,'host_id',v_uid,
 'track_id',v_room.track_id,'car_id',v_room.car_id,'laps',v_room.laps,
 'physics_version',v_room.physics_version,'direction',v_room.direction,'state',v_room.state);
end $fn$;

create or replace function public.craftrace_live_join(p_code text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid(); v_room public.craftrace_live_rooms;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 if p_code is null or p_code !~ '^[A-HJ-NP-Z2-9]{7}
 select * into v_room from public.craftrace_live_rooms
 where code=p_code and expires_at>now() and state<>'closed' for update;
 if not found then raise exception 'Room unavailable';end if;
 if v_room.host_id<>v_uid and v_room.guest_id is distinct from v_uid then
  if v_room.guest_id is not null or v_room.state<>'waiting'
  then raise exception 'Room occupied';end if;
  update public.craftrace_live_rooms set guest_id=v_uid,state='ready' where id=v_room.id returning * into v_room;
 end if;
 return jsonb_build_object('id',v_room.id,'code',v_room.code,'host_id',v_room.host_id,
 'guest_id',v_room.guest_id,'track_id',v_room.track_id,'car_id',v_room.car_id,
 'laps',v_room.laps,'physics_version',v_room.physics_version,
 'direction',v_room.direction,'state',v_room.state);
end $fn$;

create or replace function public.craftrace_live_send(p_room uuid,p_seq integer,p_generation integer,p_heat integer,p_kind text,p_payload jsonb)
returns bigint language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_rooms;v_id bigint;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 select * into v_room from public.craftrace_live_rooms
 where id=p_room and expires_at>now() and state<>'closed' for update;
 if not found or (v_uid<>v_room.host_id and v_uid is distinct from v_room.guest_id)
 then raise exception 'Room unavailable';end if;
 if p_seq is null or p_generation is null or p_heat is null or p_kind is null or p_payload is null
 or p_seq not between 1 and 2147483647 or p_generation not between 1 and 1000000
 or p_heat not between 1 and 2 or p_kind not in
 ('hello','ready','start','position','pause','resume','finish','chat','reaction','rematch','leave')
 or jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>2048
 then raise exception 'Invalid packet';end if;
 -- Cap all events to 12/sec per user; chat/reactions at most once per 5 seconds.
 if (select count(*) from public.craftrace_live_packets
     where room_id=p_room and sender_id=v_uid and created_at>now()-interval '1 second')>=12
 then raise exception 'Packet rate exceeded';end if;
 if p_kind in ('chat','reaction','rematch') and exists(
  select 1 from public.craftrace_live_packets
  where room_id=p_room and sender_id=v_uid and kind=p_kind
    and created_at>now()-interval '5 seconds')
 then raise exception 'Message cooldown';end if;
 if p_kind='start' and (v_uid<>v_room.host_id or v_room.guest_id is null or coalesce((p_payload->>'countdownMs')::integer,0) not between 1000 and 15000 or jsonb_typeof(p_payload->'restart')<>'boolean')
 then raise exception 'Invalid start';end if;
 if p_kind='chat' and (length(coalesce(p_payload->>'text','')) not between 1 and 160)
 then raise exception 'Invalid chat';end if;
 insert into public.craftrace_live_packets(room_id,sender_id,client_seq,generation,heat,kind,payload)
 values(p_room,v_uid,p_seq,p_generation,p_heat,p_kind,p_payload)
 on conflict(room_id,sender_id,client_seq) do nothing returning id into v_id;
 return v_id;
end $fn$;

create or replace function public.craftrace_live_poll(p_room uuid,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_rooms;v_packets jsonb;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 select * into v_room from public.craftrace_live_rooms where id=p_room and expires_at>now();
 if not found or (v_uid<>v_room.host_id and v_uid is distinct from v_room.guest_id)
 then raise exception 'Room unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'from',x.sender_id,
 'seq',x.client_seq,'heat',x.heat,'generation',x.generation,'type',x.kind,
 'payload',x.payload,'v',1) order by x.id),'[]'::jsonb)
 into v_packets from (
  select * from public.craftrace_live_packets
  where room_id=p_room and id>greatest(coalesce(p_after,0),0)
  order by id asc limit 100
 ) x;
 return jsonb_build_object('room_id',v_room.id,'host_id',v_room.host_id,
 'guest_id',v_room.guest_id,'state',v_room.state,'server_now_ms',floor(extract(epoch from clock_timestamp())*1000)::bigint,'packets',v_packets);
end $fn$;

revoke all on function public.craftrace_live_create(text,text,text,integer,integer,text) from public,anon;
revoke all on function public.craftrace_live_join(text) from public,anon;
revoke all on function public.craftrace_live_send(uuid,integer,integer,integer,text,jsonb) from public,anon;
revoke all on function public.craftrace_live_poll(uuid,bigint) from public,anon;
grant execute on function public.craftrace_live_create(text,text,text,integer,integer,text) to authenticated;
grant execute on function public.craftrace_live_join(text) to authenticated;
grant execute on function public.craftrace_live_send(uuid,integer,integer,integer,text,jsonb) to authenticated;
grant execute on function public.craftrace_live_poll(uuid,bigint) to authenticated;
 then raise exception 'Invalid code';end if;
 select * into v_room from public.craftrace_live_rooms
 where code=p_code and expires_at>now() and state<>'closed' for update;
 if not found then raise exception 'Room unavailable';end if;
 if v_room.host_id<>v_uid and v_room.guest_id is distinct from v_uid then
  if v_room.guest_id is not null or v_room.state<>'waiting'
  then raise exception 'Room occupied';end if;
  update public.craftrace_live_rooms set guest_id=v_uid,state='ready' where id=v_room.id returning * into v_room;
 end if;
 return jsonb_build_object('id',v_room.id,'code',v_room.code,'host_id',v_room.host_id,
 'guest_id',v_room.guest_id,'track_id',v_room.track_id,'car_id',v_room.car_id,
 'laps',v_room.laps,'physics_version',v_room.physics_version,
 'direction',v_room.direction,'state',v_room.state);
end $fn$;

create or replace function public.craftrace_live_send(p_room uuid,p_seq integer,p_generation integer,p_heat integer,p_kind text,p_payload jsonb)
returns bigint language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_rooms;v_id bigint;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 select * into v_room from public.craftrace_live_rooms
 where id=p_room and expires_at>now() and state<>'closed' for update;
 if not found or (v_uid<>v_room.host_id and v_uid is distinct from v_room.guest_id)
 then raise exception 'Room unavailable';end if;
 if p_seq is null or p_generation is null or p_heat is null or p_kind is null or p_payload is null
 or p_seq not between 1 and 2147483647 or p_generation not between 1 and 1000000
 or p_heat not between 1 and 2 or p_kind not in
 ('hello','ready','start','position','pause','resume','finish','chat','reaction','rematch','leave')
 or jsonb_typeof(p_payload)<>'object' or pg_column_size(p_payload)>2048
 then raise exception 'Invalid packet';end if;
 -- Cap all events to 12/sec per user; chat/reactions at most once per 5 seconds.
 if (select count(*) from public.craftrace_live_packets
     where room_id=p_room and sender_id=v_uid and created_at>now()-interval '1 second')>=12
 then raise exception 'Packet rate exceeded';end if;
 if p_kind in ('chat','reaction','rematch') and exists(
  select 1 from public.craftrace_live_packets
  where room_id=p_room and sender_id=v_uid and kind=p_kind
    and created_at>now()-interval '5 seconds')
 then raise exception 'Message cooldown';end if;
 if p_kind='chat' and (length(coalesce(p_payload->>'text','')) not between 1 and 160)
 then raise exception 'Invalid chat';end if;
 insert into public.craftrace_live_packets(room_id,sender_id,client_seq,generation,heat,kind,payload)
 values(p_room,v_uid,p_seq,p_generation,p_heat,p_kind,p_payload)
 on conflict(room_id,sender_id,client_seq) do nothing returning id into v_id;
 return v_id;
end $fn$;

create or replace function public.craftrace_live_poll(p_room uuid,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare v_uid uuid := auth.uid();v_room public.craftrace_live_rooms;v_packets jsonb;
begin
 if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 then raise exception 'Permanent account required';end if;
 select * into v_room from public.craftrace_live_rooms where id=p_room and expires_at>now();
 if not found or (v_uid<>v_room.host_id and v_uid is distinct from v_room.guest_id)
 then raise exception 'Room unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'from',x.sender_id,
 'seq',x.client_seq,'heat',x.heat,'generation',x.generation,'type',x.kind,
 'payload',x.payload,'v',1) order by x.id),'[]'::jsonb)
 into v_packets from (
  select * from public.craftrace_live_packets
  where room_id=p_room and id>greatest(coalesce(p_after,0),0)
  order by id asc limit 100
 ) x;
 return jsonb_build_object('room_id',v_room.id,'host_id',v_room.host_id,
 'guest_id',v_room.guest_id,'state',v_room.state,'packets',v_packets);
end $fn$;

revoke all on function public.craftrace_live_create(text,text,text,integer,integer,text) from public,anon;
revoke all on function public.craftrace_live_join(text) from public,anon;
revoke all on function public.craftrace_live_send(uuid,integer,integer,integer,text,jsonb) from public,anon;
revoke all on function public.craftrace_live_poll(uuid,bigint) from public,anon;
grant execute on function public.craftrace_live_create(text,text,text,integer,integer,text) to authenticated;
grant execute on function public.craftrace_live_join(text) to authenticated;
grant execute on function public.craftrace_live_send(uuid,integer,integer,integer,text,jsonb) to authenticated;
grant execute on function public.craftrace_live_poll(uuid,bigint) to authenticated;

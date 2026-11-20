import assert from 'node:assert/strict';
import fs from 'node:fs';
import {liveV2Grid} from '../src/game/online/craftraceLiveV2Roster.js';

const host='550e8400-e29b-41d4-a716-446655440000';
const b='550e8400-e29b-41d4-a716-446655440001';
const c='550e8400-e29b-41d4-a716-446655440002';
const d='550e8400-e29b-41d4-a716-446655440003';
const base={
  state:'waiting',capacity:4,fill_ai:true,ai_difficulty:3,host_id:host,
  locked_roster:null,
  members:[{seat:0,player_id:host,ready:true,online:true}]
};
const check=(data)=>liveV2Grid({...base,...data});
const solo=check({});
assert.deepEqual(solo.seats.map(x=>x.kind),['human','ai','ai','ai']);
assert.equal(solo.canStart,true);
assert.equal(solo.aiCount,3);
assert.ok(solo.seats.filter(x=>x.kind==='ai').every(x=>x.difficulty===3));
const duo=check({members:[base.members[0],{seat:1,player_id:b,ready:true,online:true}]});
assert.deepEqual(duo.seats.map(x=>x.kind),['human','human','ai','ai']);
assert.equal(duo.aiCount,2);
const trio=check({members:[base.members[0],{seat:1,player_id:b,ready:true,online:true},
  {seat:2,player_id:c,ready:true,online:true}]});
assert.equal(trio.aiCount,1);
assert.equal(trio.humanCount,3);
const full=check({members:[base.members[0],{seat:1,player_id:b,ready:true,online:true},
 {seat:2,player_id:c,ready:true,online:true},{seat:3,player_id:d,ready:true,online:true}]});
assert.equal(full.aiCount,0);
assert.equal(full.canStart,true);
const gap=check({members:[base.members[0],{seat:3,player_id:d,ready:true,online:true}]});
assert.deepEqual(gap.seats.map(s=>s.kind),['human','ai','ai','human'],
 'Guest departure must not shift seat indices');
assert.equal(check({fill_ai:false}).canStart,false,'One human cannot race without bots');
assert.equal(check({fill_ai:false,capacity:2,members:[base.members[0],
  {seat:1,player_id:b,ready:true,online:true}]}).canStart,true);
assert.equal(check({members:[base.members[0],{seat:1,player_id:b,ready:false,online:true}]}).canStart,false);
assert.equal(check({members:[base.members[0],{seat:1,player_id:b,ready:true,online:false}]}).canStart,false);
const locked=check({state:'countdown',members:[base.members[0],
  {seat:2,player_id:c,ready:true,online:true}],locked_roster:[
  {seat:0,kind:'human',player_id:host},
  {seat:2,kind:'human',player_id:c},
  {seat:1,kind:'ai',owner_id:host,difficulty:3},
  {seat:3,kind:'ai',owner_id:host,difficulty:3}
]});
assert.equal(locked.started,true);
assert.equal(locked.canStart,false);
assert.deepEqual(locked.seats.map(x=>x.kind),['human','ai','human','ai']);
assert.ok(Object.isFrozen(locked.seats) && Object.isFrozen(locked.seats[1]));
for(const invalid of [
 {capacity:5},
 {members:[{seat:1,player_id:host,ready:true,online:true}]},
 {members:[base.members[0],{seat:0,player_id:b,ready:true,online:true}]},
 {members:[base.members[0],{seat:1,player_id:host,ready:true,online:true}]},
 {members:[base.members[0],{seat:2,player_id:'no',ready:true,online:true}]},
 {members:[{seat:0,player_id:host,ready:true}]},
 {fill_ai:true,ai_difficulty:4},
 {state:'countdown',locked_roster:null},
 {state:'racing',locked_roster:[{seat:0,kind:'human',player_id:host}]}
])assert.throws(()=>check(invalid),JSON.stringify(invalid));

const sql=fs.readFileSync(new URL('../supabase/migrations/20261120_039_craftrace_live_v2_lobby_2_to_4.sql',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/game/online/craftraceLiveV2LobbyClient.js',import.meta.url),'utf8');
for(const token of [
 'create table public.craftrace_live_v2_rooms',
 'create table public.craftrace_live_v2_members',
 'unique (room_id,seat)',
 'alter table public.craftrace_live_v2_rooms enable row level security',
 'alter table public.craftrace_live_v2_members enable row level security',
 "security definer set search_path=''",
 "coalesce((auth.jwt()->>'is_anonymous')::boolean,false)",
 'for update',
 "last_seen<=now()-interval '15 seconds'",
 'grant execute on function public.craftrace_live_v2_join(text) to authenticated',
 'grant execute on function public.craftrace_live_v2_heartbeat(uuid) to authenticated',
 'locked_roster=v_roster',
 'get diagnostics v_rowcount = row_count'
])assert.ok(sql.includes(token),'Missing server invariant: '+token);
const methods=['snapshot','create','join','configure','set_ready','heartbeat','start','leave'];
for(const fn of methods){
 const signature='create function public.craftrace_live_v2_'+fn+'(';
 assert.ok(sql.includes(signature),'Missing v2 RPC '+fn);
 assert.match(sql,new RegExp('revoke all on function public\\.craftrace_live_v2_'+fn+'\\('));
 assert.match(sql,new RegExp('grant execute on function public\\.craftrace_live_v2_'+fn+'\\('));
}
assert.ok(!/\b(?:insert into|update|delete from|alter table|drop table)\s+public\.craftrace_live_(?:rooms|packets)\b/i.test(sql),
 'The working 2P tables must never be mutated by the v2 migration');
assert.ok(!/\b(import|require)\b.*craftraceLiveV2LobbyClient/.test(
 fs.readFileSync(new URL('../src/game/ui/craftraceLiveLobby.js',import.meta.url),'utf8')),
 'Legacy 2P lobby must remain isolated');
assert.ok(client.includes('heartbeatMs=5000'));
assert.ok(client.includes('AbortSignal.timeout(8000)'));
console.log('PASS CraftRace LIVE v2 room: 2–4 seats, bots, gap preservation, readiness, owner security structure and isolated 2P mode');

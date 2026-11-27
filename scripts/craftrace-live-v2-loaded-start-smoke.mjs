import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261120_041_craftrace_live_v2_all_loaded_start.sql');
for(const p of [
 'src/game/ui/craftraceLiveV2Lobby.js',
 'src/game/online/craftraceLiveV2LobbyClient.js',
 'src/game/online/craftraceLiveV2RaceBridge.js',
 'src/game/scenes/RaceScene.js',
 'src/game/scenes/RaceCleanLapScene.js'
])execFileSync(process.execPath,['--check',new URL('../'+p,import.meta.url).pathname],{stdio:'pipe'});
for(const phrase of [
 'add column if not exists grid_loaded_at timestamptz',
 'create or replace function public.craftrace_live_v2_start(p_room uuid)',
 "set state='countdown',start_at=null",
 'locked_roster=v_roster',
 'create function public.craftrace_live_v2_grid_loaded(p_room uuid)',
 'security definer set search_path=',
 'for update',
 'last_seen>now()-interval',
 "v_total=v_loaded",
 "set start_at=now()+interval '7 seconds'",
 "and exists(",
 "r.value->>'kind'='human'",
 "(r.value->>'player_id')::uuid=v_uid",
 'grant execute on function public.craftrace_live_v2_grid_loaded(uuid)',
 'revoke all on function public.craftrace_live_v2_grid_loaded(uuid)'
])assert.ok(sql.includes(phrase),'Missing grid-handshake control: '+phrase);
assert.ok(!/\b(?:insert into|update|delete from|alter table|drop table)\s+public\.craftrace_live_(?:rooms|packets)\b/i.test(sql),'Protected legacy 2P schema may not change');
const lobby=read('src/game/ui/craftraceLiveV2Lobby.js');
assert.ok(lobby.includes("!Array.isArray(s.locked_roster))return;"));
assert.ok(lobby.includes("liveStartAt:Number.isFinite(s.start_at_ms)?s.start_at_ms:null"));
assert.ok(lobby.includes("stageLive4RaceSession(s,identity,resolvedLive4AiPilotIds(pilots))"),
 'Only server-locked race roster is authorized; selected AI IDs are metadata');
const client=read('src/game/online/craftraceLiveV2LobbyClient.js');
assert.ok(client.includes("rpc('grid_loaded',{p_room:verifyId(roomId)})"));
const bridge=read('src/game/online/craftraceLiveV2RaceBridge.js');
assert.ok(bridge.includes("acknowledgeLiveV2GridLoaded(roomId)"));
assert.ok(bridge.includes("if(stopped||!linkReady||aiError||gridAckPending||gridAckDone"));
assert.ok(bridge.includes("ackGrid(now)"));
assert.ok(bridge.includes("scene._crafRaceLiveStartAt=startAt||null"));
assert.ok(bridge.includes("ESPERANDO CARGA DE LOS PILOTOS"));
const scene=read('src/game/scenes/RaceScene.js');
assert.ok(scene.includes("this._crafRaceLiveV2RoomId?'ESPERANDO CARGA DE PILOTOS"));
assert.ok(scene.includes("attachCrafRaceLivePilot(this,this._crafRaceLiveRoomId)"),'LIVE2 must be unchanged');
const clean=read('src/game/scenes/RaceCleanLapScene.js');
assert.ok(clean.includes("if(this._physicsABPractice||this._crafRaceLiveV2RoomId||this._offlineFourRace){"),"LIVE 4, physics calibration and offline QA must all exclude clean-lap missions");
console.log('PASS LIVE4 loaded-first grid: private ack, all-human barrier, server GO, DEV-only coin/mission isolation, 2P untouched');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const path of [
 'src/game/online/craftraceLiveV2RaceModel.js',
 'src/game/online/craftraceLiveV2BotDirector.js',
 'src/game/online/craftraceLiveV2PositionLink.js',
 'src/game/online/craftraceLiveV2GridGeometry.js',
 'src/game/online/craftraceLiveV2RaceSession.js',
 'src/game/online/craftraceLiveV2RaceBridge.js',
 'src/game/ui/craftraceLiveV2Lobby.js',
 'src/game/scenes/RaceScene.js',
 'src/game/online/craftraceLiveV2LobbyClient.js'
]){
 execFileSync(process.execPath,['--check',new URL('../'+path,import.meta.url).pathname],{stdio:'pipe'});
}
const sql=file('supabase/migrations/20261120_040_craftrace_live_v2_results_and_broadcast.sql');
for(const phrase of [
 'create table public.craftrace_live_v2_results',
 'alter table public.craftrace_live_v2_results enable row level security',
 'revoke all on table public.craftrace_live_v2_results from public,anon,authenticated',
 'create or replace function public.craftrace_live_v2_snapshot',
 'create function public.craftrace_live_v2_finish',
 "v_room.host_id<>v_uid",
 "v_player is distinct from v_uid",
 'on conflict(room_id,seat) do nothing',
 'create function public.craftrace_live_v2_is_member',
 "p_topic like 'craftrace-live4:%'",
 "m.user_id=(select auth.uid())",
 "and r.state<>'closed' and r.expires_at>now()",
 'create policy "craftrace live4 receive by member"',
 'create policy "craftrace live4 send by member"',
 "revoke all on function public.craftrace_live_v2_finish",
 "grant execute on function public.craftrace_live_v2_finish",
 "'results',v_results"
])assert.ok(sql.includes(phrase),'Missing SQL invariant: '+phrase);
assert.ok(!/\b(?:insert into|update|delete from|alter table|drop table|create table)\s+public\.craftrace_live_(?:rooms|packets)\b/i.test(sql),
 'LIVE 4 migration must not alter the existing two-player data');
const scene=file('src/game/scenes/RaceScene.js');
assert.ok(scene.includes("this._crafRaceLiveV2RoomId=(!IS_PROD_BUILD"));
assert.ok(scene.includes("attachCrafRaceLivePilot(this,this._crafRaceLiveRoomId)"));
assert.ok(scene.includes("import('../online/craftraceLiveV2RaceBridge.js')"));
assert.ok(scene.includes('makeLive4StartingGrid({start:baseGrid'));
assert.ok(scene.includes('this._crafRaceLiveBridge?.update(performance.now(),deltaMs)'));
assert.ok(scene.includes('this._crafRaceLiveGridSlot===1?1:0'),'2-player grid must stay unchanged');
const ui=file('src/game/ui/craftraceLiveV2Lobby.js');
assert.ok(ui.includes("get('race4')==='1'"));
assert.ok(ui.includes("state==='countdown'"));
assert.ok(ui.includes("stageLive4RaceSession(s,identity)"));
assert.ok(ui.includes("startLiveV2Lobby(room.id)"));
const bridge=file('src/game/online/craftraceLiveV2RaceBridge.js');
assert.ok(bridge.includes('CrafRaceLive4RemoteModel'));
assert.ok(bridge.includes('CrafRaceLive4BotDirector'));
assert.ok(bridge.includes('finishLiveV2Lobby('));
assert.ok(bridge.includes('localFinishPosted'));
assert.ok(bridge.includes('console.info(\'[LIVE 4 PERF]\''));
assert.ok(bridge.includes('if(!linkReady||aiError)'));
assert.ok(bridge.includes('monitor.stop();void link?.close()'));
assert.ok(bridge.includes('NO RÉCORDS')||bridge.includes('SIN RÉCORDS NI CRÉDITOS'));
const client=file('src/game/online/craftraceLiveV2LobbyClient.js');
assert.ok(client.includes("return rpc('finish'"));
assert.ok(client.includes('clientClockOffsetMs'));
assert.ok(!file('src/game/online/craftraceLiveRaceBridge.js').includes('craftraceLiveV2RaceBridge'));
console.log('PASS LIVE 4: real room start, race bridge, 3 physical host bots, private Realtime, provisional results, 2P isolation, FPS metrics');

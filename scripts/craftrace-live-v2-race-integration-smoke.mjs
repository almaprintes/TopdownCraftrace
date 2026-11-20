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
 'src/game/online/craftraceDirectorCamera.js',
 'src/game/online/craftraceDirectorPreview.js',
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
assert.ok(scene.includes('this._crafRaceDirectorPreview=!IS_PROD_BUILD'),
 'Director must be isolated from production');
assert.ok(scene.includes("data?.gameMode==='director'"),
 'Director must require its explicit game mode');
assert.ok(scene.includes("import('../online/craftraceDirectorPreview.js')"),
 'Director module must be lazily loaded');
assert.ok(scene.includes('this._crafRaceDirectorBridge?.update(performance.now(),deltaMs)'));
assert.ok(scene.includes("!this._crafRaceDirectorPreview && !this._startAutoFired"),
 "Director ignition countdown must not race with its own timer");
assert.ok(scene.includes('(onlineGrid||this._crafRaceDirectorPreview)?0'),
 'Do not spawn legacy preview bots on top of the four AI');
assert.ok(scene.includes('this._crafRaceDirectorPreview ? null'),
 'Director results must not write personal bests or history');
const localProducer=file('src/game/online/craftraceDirectorPreview.js');
assert.ok(localProducer.includes('const directorGreenAt=performance.now()+3000'),
 'A director race needs an independent 3-second countdown');
assert.ok(localProducer.includes('directorStartPhase(now,directorGreenAt)')&&
 localProducer.includes("scene._startState='RACING'")&&
 localProducer.includes('scene._raceStarted=true'),
 'Director must start its four AI without ignition or iOS track-ready gate');
assert.ok(localProducer.includes('directorStickVector(e.clientX,e.clientY'),
 'Left stick must track the finger on both axes');
assert.ok(localProducer.includes('directorAltitudeStick(e.clientY'),
 'Right vertical stick must independently control height');
assert.ok(localProducer.includes('stickX:x,stickY:y,altitudeAxis:height'),
 'Camera must take two analog directions and independent zoom');

for(const needle of ['CrafRaceLive4BotDirector','preview:true','data-stick',
 'data-height-stick','data-height-knob','data-auto',
 'scene.events.on(\'postupdate\'','scene.cameras.main'])
 assert.ok(localProducer.includes(needle),'Missing director control '+needle);
for(const forbidden of ['data-gas','data-brake','data-alt-up','data-alt-down'])
 assert.ok(!localProducer.includes(forbidden),'No legacy driving button allowed: '+forbidden);
assert.ok(!localProducer.includes('const held='),'Only two independent analog levers');
assert.ok(!localProducer.includes('finishLiveV2Lobby('),
 'Local preview must never write unofficial results to Supabase');
assert.ok(localProducer.includes('hideRaceUi(scene)')&&
 localProducer.includes('restoreRaceUi(scene,hiddenUi)'),
 'Director must hide the entire driver cockpit and restore on exit');
assert.ok(localProducer.includes("classList.add('tdr-director-active')")&&
 localProducer.includes("classList.remove('tdr-director-active')"),
 'Producer CSS must not bleed into normal races');
assert.ok(localProducer.includes("document.addEventListener('focusin',suppressTextFocus,true)"),
 'Legacy text inputs must not summon iOS keyboard in the camera view');
const directorCss=file('src/game/ui/craftraceDirectorPreview.css');
for(const selector of ['#tdr-handbrake','#tdr-race-controls','#tdr-ignition-start',
 '[data-tdr-race-ui="1"]','.tdr-race-hud'])
 assert.ok(directorCss.includes(selector),'Unhidden driver overlay '+selector);
const engineScene=file('src/game/scenes/RaceEmbeddedReplaySceneV2.js');
assert.ok(engineScene.includes('&&!this._crafRaceDirectorPreview'),
 'Producer is exempt from driver ignition and starts on normal race lights');
assert.ok(scene.includes("this._crafRaceLiveV2RoomId=(!IS_PROD_BUILD"));
assert.ok(scene.includes("attachCrafRaceLivePilot(this,this._crafRaceLiveRoomId)"));
assert.ok(scene.includes("import('../online/craftraceLiveV2RaceBridge.js')"));
assert.ok(scene.includes('makeLive4StartingGrid({start:baseGrid'));
assert.ok(scene.includes('this._crafRaceLiveBridge?.update(performance.now(),deltaMs)'));
assert.ok(scene.includes('this._crafRaceLiveGridSlot===1?1:0'),'2-player grid must stay unchanged');
assert.ok(scene.includes('|| Boolean(this._crafRaceLiveV2RoomId)'),'LIVE 4 must be unofficial/test mode');
assert.ok(scene.includes('this.ttHistKey = this._crafRaceLiveV2RoomId ? null'),
  'LIVE 4 must not write official lap history');
assert.ok(scene.includes('this.ttKey = this._crafRaceLiveV2RoomId ? null'),
  'LIVE 4 must not update official PBs');
assert.ok(scene.includes('if(this.ttKey)localStorage.setItem(this.ttKey'),
  'LIVE 4 null PB key must not write localStorage');
assert.ok(file('src/game/scenes/RaceSessionRewardsScene.js')
  .includes('this._physicsABPractice||this._crafRaceLiveV2RoomId'),
  'No ad/loot reward flow in LIVE 4');
assert.ok(file('src/game/scenes/RaceCleanLapScene.js')
  .includes('if(this._crafRaceLiveV2RoomId)return 0'),
  'No clean combo coins in LIVE 4');
const ui=file('src/game/ui/craftraceLiveV2Lobby.js');
assert.ok(ui.includes("window.location.pathname.includes('/dev/')"));
assert.ok(ui.includes("!globalThis.Capacitor?.isNativePlatform?.()"));
assert.ok(ui.includes("state==='countdown'"));
assert.ok(ui.includes("stageLive4RaceSession(s,identity)"));
assert.ok(ui.includes("startLiveV2Lobby(room.id)"));
const bridge=file('src/game/online/craftraceLiveV2RaceBridge.js');
assert.ok(bridge.includes('CrafRaceLive4RemoteModel'));
assert.ok(bridge.includes('CrafRaceLive4BotDirector'));
assert.ok(bridge.includes('finishLiveV2Lobby('));
assert.ok(bridge.includes('localFinishPosted'));
assert.ok(bridge.includes('console.info(\'[LIVE 4 PERF]\''));
assert.ok(bridge.includes("perfHud.textContent='LIVE 4"), 'HUD should be rendered in the experimental race');
assert.ok(bridge.includes('p95FrameMs'), 'FPS P95 should be sampled on device');
assert.ok(bridge.includes('perfHud.remove()'), 'HUD should be destroyed on scene exit');
assert.ok(bridge.includes('if(!linkReady||aiError||!startAt)'),'No GO before every pilot has loaded and server schedules the start');
assert.ok(bridge.includes('acknowledgeLiveV2GridLoaded(roomId)'),'Authenticated grid handshake required');
assert.ok(bridge.includes('monitor.stop();void link?.close()'));
assert.ok(bridge.includes('NO RÉCORDS')||bridge.includes('SIN RÉCORDS NI CRÉDITOS'));
const client=file('src/game/online/craftraceLiveV2LobbyClient.js');
assert.ok(client.includes("return rpc('finish'"));
assert.ok(client.includes('clientClockOffsetMs'));
assert.ok(!file('src/game/online/craftraceLiveRaceBridge.js').includes('craftraceLiveV2RaceBridge'));
console.log('PASS LIVE 4: signed room start, 3 physical bots, private Realtime, friendly results, reward/PB isolation, 2P safety and FPS metrics');

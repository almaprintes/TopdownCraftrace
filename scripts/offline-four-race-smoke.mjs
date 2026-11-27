import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeOfflineFourRace,prepareOfflineFourLaunch,offlineFourRoster,offlineFullPilotIds,offlineHudEntries,rankOfflineFour,OFFLINE_FOUR_TRACKS,OFFLINE_FOUR_LAPS,OFFLINE_DEFAULT_CONTACT} from '../src/game/ai/offlineFourRace.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const trackKey of OFFLINE_FOUR_TRACKS)for(const laps of OFFLINE_FOUR_LAPS)for(const difficulty of [1,2,3])for(const humanSeat of [0,1,2,3]){
  const config=makeOfflineFourRace({trackKey,carId:'avenir_gripline',laps,difficulty,humanSeat,seed:'smoke'});
  assert.deepEqual(makeOfflineFourRace(config),config,'rematch must retain exact configuration');
  const roster=offlineFourRoster(difficulty,humanSeat);
  assert.equal(roster.length,4);assert.equal(roster.filter(p=>p.kind==='human').length,1);
  assert.equal(roster.find(p=>p.kind==='human').seat,humanSeat);
  assert.equal(roster.filter(p=>p.kind==='ai'&&p.difficulty===difficulty).length,3);
  assert.equal(new Set(roster.map(p=>p.seat)).size,4);
}
assert.throws(()=>makeOfflineFourRace({trackKey:'practice-area',carId:'stock'}));
assert.throws(()=>offlineFourRoster(4));
assert.throws(()=>offlineFourRoster(3,4));
assert.deepEqual(rankOfflineFour([{seat:0,elapsedMs:null},{seat:1,elapsedMs:1200},{seat:2,elapsedMs:1000},{seat:3,elapsedMs:1200}]).map(x=>x.seat),[2,1,3,0]);
const bridge=read('src/game/ai/offlineFourRaceBridge.js');
assert.match(bridge,/CrafRaceLive4BotDirector/);
assert.match(bridge,/director\.update\(deltaMs,clock,started\)/);
assert.match(bridge,/scene\.events\.once\('shutdown',stop\)/);
assert.doesNotMatch(bridge,/fetch\(|WebSocket|PositionLink|LobbyMonitor|finishLiveV2Lobby|showRewardedAd|requestLiveV2Rematch/);
const scene=read('src/game/scenes/RaceScene.js');
assert.match(scene,/_offlineFourRace\?\.humanSeat/);
assert.match(scene,/_offlineFourBridge\?\.update/);
assert.match(scene,/MAX_GRID_CARS = this\._offlineFourRace\?0:/,'Only the three new AI cars may spawn');
assert.match(scene,/ttHistKey = this\._crafRaceLiveV2RoomId \? null : this\._offlineFourRace \? null/);
assert.match(read('src/game/scenes/RaceSessionRewardsScene.js'),/this\._crafRaceLiveV2RoomId\|\|this\._offlineFourRace/);
assert.match(read('src/game/scenes/RaceCleanLapScene.js'),/if\(this\._offlineFourRace\)return 0/);
assert.match(read('src/game/scenes/MenuGameModeSnapScene.js'),/!IS_PROD_BUILD\?\[\{key:'offline-ai'/);
console.log('PASS: '+(OFFLINE_FOUR_TRACKS.length*OFFLINE_FOUR_LAPS.length*3*4)+' local configs, four unique seats, rematch, ranking, DEV isolation, no race network transport.');

const launchConfig=makeOfflineFourRace({trackKey:'santa-cruz',carId:'avenir_gripline',laps:3,difficulty:3,humanSeat:2,seed:'preflight'});
assert.deepEqual(await prepareOfflineFourLaunch(launchConfig,async()=>true),{trackKey:'santa-cruz',carId:'avenir_gripline',gameMode:'offline-ai',offlineFourRace:launchConfig});
await assert.rejects(prepareOfflineFourLaunch(launchConfig,async()=>false),/Módulo de carrera no disponible/);
await assert.rejects(prepareOfflineFourLaunch(launchConfig,async()=>{throw Error('chunk unavailable')}),/chunk unavailable/);
const menu=read('src/game/scenes/MenuGameModeSnapScene.js');
assert.match(menu,/await prepareOfflineFourLaunch/);
assert.match(menu,/await globalThis\.__tdrWarmRaceScene\(\)/);
assert.match(menu,/this\.scene\.start\('race',data\)/);
console.log('PASS: offline launch waits for scene and AI module; failed preflight retains retry UI.');

import {makeOfflineStandingsRoute,offlineRouteProgress,rankOfflineLive,offlineCommonLapGap,offlineFastestLap} from '../src/game/ai/offlineFourStandings.js';
import {makeLive4LapGates} from '../src/game/online/craftraceLive4LapGates.js';
const line=[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}];
const gates=makeLive4LapGates({centerline:line,trackWidth:100});
const route=makeOfflineStandingsRoute(line,gates);
const before=offlineRouteProgress(route,{x:0,y:25,laps:0,phase:0}),after=offlineRouteProgress(route,{x:50,y:0,laps:0,phase:0});
assert.ok(before<0&&after>before,'Grid behind finish is not one lap ahead');
assert.ok(offlineRouteProgress(route,{x:50,y:0,laps:1,phase:0})>4000);
const standings=rankOfflineLive([{seat:0,progress:10,elapsedMs:null},{seat:1,progress:20,elapsedMs:null},{seat:2,progress:1,elapsedMs:5000}]);
assert.deepEqual(standings.map(r=>r.seat),[2,1,0]);
assert.deepEqual(offlineCommonLapGap({lapTimes:[1100,900]},{lapTimes:[1000]}),{lap:1,ms:100});
assert.equal(offlineCommonLapGap({lapTimes:[]},{lapTimes:[1000]}),null);
assert.deepEqual(offlineFastestLap([{seat:0,lapTimes:[1200,900]},{seat:1,lapTimes:[1000]}]),{seat:0,lap:2,ms:900});
console.log('PASS: grid wrap, valid lap progress, live order, measured common-lap gap and fastest lap');

const presentation=read('src/game/ui/raceResultsPresentation.js');
assert.match(presentation,/avatar_\*\.webp/);
assert.match(presentation,/ranked\[1\],ranked\[0\],ranked\[2\]/,'Winner is centered in three-place podium');
assert.match(presentation,/catalog\[file\]\|\|ownPortrait/,'Selected catalog portrait uses bundled asset');
assert.match(read('src/game/ui/LobbyDomUi.js'),/rememberResultPlayerAvatar\(prefetch\.src\)/);
for(const path of ['src/game/ai/offlineFourRaceBridge.js','src/game/online/craftraceLiveV2RaceBridge.js','src/game/online/craftraceLiveRaceBridge.js','src/game/scenes/RaceDuelStandaloneScene.js','src/game/scenes/RaceSessionReportScene.js','src/game/scenes/RaceSurvivalModeScene.js'])assert.match(read(path),/dressResultPanel\(/);
console.log('PASS: shared podium presentation, bundled catalog portraits, selected player avatar, six result flows');

assert.match(presentation,/apex:8,orbit:6,sprint:13/);
assert.match(presentation,/grip:12,vector:17/);
assert.match(presentation,/nova:9/);
assert.match(presentation,/generic-cpu'\?'avatar_0020\.webp'/);
const mapText=presentation.match(/const AI_PORTRAITS=Object\.freeze\(\{([\s\S]*?)\}\)/)[1];
const avatarIds=[...mapText.matchAll(/:\s*(\d+)/g)].map(m=>Number(m[1]));
assert.equal(avatarIds.length,16);assert.equal(new Set(avatarIds).size,16);
console.log('PASS: curated unique AI portraits and generic robot CPU');

import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {AI_ELO_PILOTS} from '../src/game/ai/craftraceAiEloLeague.js';
for(const capacity of [2,17])for(let humanSeat=0;humanSeat<capacity;humanSeat++)for(const difficulty of [1,2,3])for(const laps of OFFLINE_FOUR_LAPS){
  const cfg=makeOfflineFourRace({trackKey:'santa-cruz',carId:'stock',capacity,humanSeat,difficulty,laps,seed:'all-pilots'});
  assert.deepEqual(makeOfflineFourRace(cfg),cfg);
  const roster=offlineFourRoster(difficulty,humanSeat,capacity);
  assert.equal(roster.length,capacity);assert.equal(roster.filter(x=>x.kind==='ai').length,capacity-1);
  assert.equal(roster.find(x=>x.kind==='human').seat,humanSeat);
  if(capacity===17){const ids=offlineFullPilotIds(roster,cfg.seed);assert.deepEqual(Object.values(ids).sort(),AI_ELO_PILOTS.map(p=>p.id).sort());assert.deepEqual(offlineFullPilotIds(roster,cfg.seed),ids);}
}
assert.throws(()=>makeOfflineFourRace({trackKey:'karting-tenerife-horario',carId:'stock',capacity:17}));
assert.throws(()=>makeOfflineFourRace({trackKey:'santa-cruz',carId:'stock',capacity:8}));
const longLine=[{x:0,y:0},{x:4000,y:0},{x:4000,y:4000},{x:0,y:4000}];
const gridInput={start:{x:2500,y:0,r:0},trackWidth:250,centerline:longLine,finishLine:{a:{x:2500,y:-130},b:{x:2500,y:130},normal:{x:1,y:0}},capacity:17};
assert.throws(()=>makeLive4StartingGrid(gridInput));
assert.equal(makeLive4StartingGrid({...gridInput,offlineFullGrid:true}).positions.length,17);
assert.deepEqual(offlineHudEntries(Array.from({length:17},(_,i)=>({human:i===10})),17).map(x=>x.rank),[1,10,11,12]);
assert.match(bridge,/config.capacity/);assert.match(scene,/offlineFullGrid:this\._offlineFourRace\?\.capacity===17/);
console.log('PASS: duel and full grid, 285 configurations, all 16 AI identities, online capacity unchanged and compact HUD');

// Santa Cruz's actual nominal width supports compact 2-car rows; the full
// grid may never use the old single-file length just because its default gap is large.
const compact=makeLive4StartingGrid({...gridInput,trackWidth:156,offlineFullGrid:true,compact:true});
assert.equal(compact.positions.length,17);
assert.ok(compact.gridBackDistance>0);
const extendedRoute=makeOfflineStandingsRoute(line,gates,700);
assert.ok(offlineRouteProgress(extendedRoute,{x:0,y:500,laps:0,phase:0})<0);

for(const contact of ['ghost','soft','full']){
 const c=makeOfflineFourRace({...launchConfig,contact});assert.equal(c.contact,contact);assert.deepEqual(makeOfflineFourRace(c),c);
}
assert.equal(OFFLINE_DEFAULT_CONTACT,'soft');assert.equal(launchConfig.contact,'soft');assert.throws(()=>makeOfflineFourRace({...launchConfig,contact:'other'}));
assert.match(bridge,/config.contact==='ghost'\?null:createOfflineContactPhysics/);
assert.match(menu,/contact:contact.value/);

import {CONTACT_TUNING,makeContactBox,orientedContact,resolveContact,trafficAssist,createOfflineContactPhysics,contactBoxFromVisual,opaqueContactBounds} from '../src/game/ai/offlineContactPhysics.js';
{

const check=(v,msg)=>{if(!v)throw Error(msg)};
const box=(x,y,angle=0,vx=0,vy=0)=>makeContactBox({x,y,angle,vx,vy,halfLength:40,halfWidth:20});
check(orientedContact(box(0,0),box(0,41))===null,'side clearance');
check(orientedContact(box(0,0),box(0,45,Math.PI/2))!==null,'rotation affects footprint');
check(orientedContact(box(0,0),box(200,0))===null,'broad phase');
for(const tuning of Object.values(CONTACT_TUNING)){
 let a=box(0,0,0,160),b=box(76,0,0,80);
 let hit=resolveContact(a,b,tuning,420,1/60);
 check(hit.normal>0&&a.vx<160&&b.vx>80,'rear collision transfers speed');
 check(Math.abs(a.vx+b.vx-240)<1e-8,'momentum');
 a=box(0,0,0,100);b=box(77,0,0,140);
 hit=resolveContact(a,b,tuning,420,1/60);
 check(hit.normal===0&&a.vx===100&&b.vx===140,'no extra impulse when separating');
 a=box(0,0,0,150);b=box(0,39,0,150);
 hit=resolveContact(a,b,tuning,420,1/60);
 check(a.vx===150&&b.vx===150&&Math.abs(a.vy)<20,'parallel rub preserves forward momentum');
 a=box(0,0,0,180);b=box(77,0,Math.PI,-180);
 hit=resolveContact(a,b,tuning,420,1/60);
 check(a.vx<180&&b.vx> -180&&Math.abs(a.vx)<=180&&Math.abs(b.vx)<=180,'head-on bounded');
 a=box(0,0,0,160);b=box(99,0,0,80);
 trafficAssist(a,b,tuning,1/60);
 check(a.vx<160&&a.vx>=80,'near traffic braking');
 a=box(0,0,0,160);b=box(500,0,0,80);
 trafficAssist(a,b,tuning,1/60);
 check(a.vx===160,'clear track untouched');
}
const sprite=(x,y,vx)=>({x,y,rotation:0,body:{enable:true,velocity:{x:vx,y:0}}});
const visual={displayWidth:80,displayHeight:40,originX:.5,originY:.5,rotation:0,visible:true,texture:{key:'car'},frame:{}};
const human=sprite(0,0,160),bot=sprite(54,0,80);
const world={carBody:human,carRig:{list:[visual]},maxFwd:420,track:{meta:{carScale:1}},baseSpec:{collisionScale:1}};
const directorMock={bots:[{seat:1,plannerBody:bot,visual,finished:false},...Array.from({length:15},(_,i)=>({seat:i+2,plannerBody:sprite(1000+i*300,500,200),visual,finished:false}))]};
const pixels=new Uint8ClampedArray(10*10*4);
for(let y=2;y<8;y++)for(let x=3;x<7;x++)pixels[(y*10+x)*4+3]=255;
check(JSON.stringify(opaqueContactBounds(pixels,10,10))===JSON.stringify({left:.3,top:.2,right:.7,bottom:.8}),'transparent padding excluded');
const crop={left:.3,top:.2,right:.7,bottom:.8};
const tall={...visual,displayWidth:40,displayHeight:80};
const fit=contactBoxFromVisual(human,tall,Math.PI/2,crop);
check(Math.abs(fit.halfLength-22.08)<1e-8&&Math.abs(fit.halfWidth-7.36)<1e-8,'actual painted size and rotated long axis');
check(Math.abs(Math.sin(fit.angle))<1e-8,'rig offset aligns tall sprite with heading');
const near=contactBoxFromVisual(sprite(46,0,80),tall,Math.PI/2,crop);
check(orientedContact(fit,near)===null,'visible gap does not collide');
const touching=contactBoxFromVisual(sprite(43,0,80),tall,Math.PI/2,crop);
check(orientedContact(fit,touching)!==null,'visible contact detected');
const solver=createOfflineContactPhysics(world,directorMock,{contact:'soft',humanSeat:0});
bot.x=63;solver.update(16.67,0,false);
check(human.body.velocity.x===160&&bot.body.velocity.x===80&&solver.playerImpacts===0,'no impulse or AI braking across visible gap');
bot.x=54;solver.update(16.67,1,false);solver.update(16.67,18,false);
check(solver.playerImpacts===1,'persistent overlap counted once');
check(human.x===0&&bot.x===54,'no center teleport');
check(directorMock.bots.slice(1).every(b=>b.plannerBody.body.velocity.x===200),'distant cars unchanged');
bot.x=500;solver.update(16.67,35,false);bot.x=54;solver.update(16.67,52,false);
check(solver.playerImpacts===2,'new contact counted');
solver.update(16.67,69,true);check(solver.playerImpacts===2,'finished human excluded');

}
console.log('PASS: oriented hitboxes, bounded impulses, traffic assist, 17-body isolation and contact counting');

import {formatRaceResultTime,formatRaceResultGap} from '../src/game/ui/raceResultTime.js';
{
const checks=[
 [formatRaceResultTime(99225),'1:39.225'],[formatRaceResultTime(100142),'1:40.142'],
 [formatRaceResultTime(18885),'0:18.885'],[formatRaceResultTime(59999.7),'1:00.000'],
 [formatRaceResultTime(3600000),'60:00.000'],[formatRaceResultTime(null),'—'],
 [formatRaceResultTime(NaN),'—'],[formatRaceResultGap(917),'+0.917 s'],
 [formatRaceResultGap(-8702),'−8.702 s'],[formatRaceResultGap(60000),'+1:00.000'],
 [formatRaceResultGap(null),'—']
];
for(const [actual,expected] of checks)if(actual!==expected)throw Error(actual+' != '+expected);
}
assert.match(bridge,/formatRaceResultTime as fmt,formatRaceResultGap as gapFmt/);
console.log('PASS: minute-second-millisecond presentation and signed gaps');

assert.match(menu,/contact.value=OFFLINE_DEFAULT_CONTACT/);
for(const capacity of [2,4,17]){
 const c=makeOfflineFourRace({...launchConfig,capacity,humanSeat:0,contact:undefined});
 assert.equal(c.contact,'soft');assert.equal(makeOfflineFourRace({...c,contact:'ghost'}).contact,'ghost');
}
for(const capacity of [2,4])assert.equal(makeOfflineFourRace({...launchConfig,trackKey:'circuito-atlantico',capacity,humanSeat:0}).trackKey,'circuito-atlantico');
assert.throws(()=>makeOfflineFourRace({...launchConfig,trackKey:'circuito-atlantico',capacity:17}));
// The CI installer stages the official Atlantic source; check its actual gate/grid.
// The repository fallback is older, so only enforce authored-geometry checks when installed.
const atlantic=JSON.parse(read('src/game/tracks/library/track01/track.json'));
if(atlantic.meta?.trackId==='circuito-atlantico'&&atlantic.closed===true&&atlantic.finishLine?.normal){
 const cl=atlantic.raceDirection==='reverse'?atlantic.centerline.slice().reverse():atlantic.centerline;
 for(const capacity of [2,4]){
  const grid=makeLive4StartingGrid({start:atlantic.start,trackWidth:atlantic.trackWidth,carScale:atlantic.carScale||1,centerline:cl,finishLine:atlantic.finishLine,capacity});
  assert.equal(grid.positions.length,capacity);assert.equal(grid.trackAligned,true);
  assert.ok(grid.positions.every(p=>[p.x,p.y,p.r].every(Number.isFinite)));
 }
 const tracker=makeLive4LapGates({centerline:cl,trackWidth:atlantic.trackWidth,finishLine:atlantic.finishLine,checkpoints:atlantic.checkpoints});
 assert.equal(tracker.gates.length,3);assert.equal(tracker.usedAuthoredFinish,true);
}
console.log('PASS: soft contact default, explicit ghost retained, Atlantic limited to 2/4 drivers');

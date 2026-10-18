import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldUseLobbyDeparture,runLobbyRaceDeparture,lobbyDepartureTurnForCar,lobbyDepartureLocalDrive,lobbyDepartureWheelTracks,paintLobbyRubber,paintLobbySmoke,LOBBY_DOWN_FACING_CARS,LOBBY_DEPARTURE_TIMING,LOBBY_DEPARTURE_DEPTH} from '../src/game/ui/LobbyRaceDeparture.js';
const read=p=>readFileSync(p,'utf8');
assert.deepEqual(LOBBY_DEPARTURE_TIMING,{turn:1600,hold:180,drive:520});
assert.equal(LOBBY_DEPARTURE_TIMING.turn+LOBBY_DEPARTURE_TIMING.hold+LOBBY_DEPARTURE_TIMING.drive,2300);
assert.deepEqual(LOBBY_DEPARTURE_DEPTH,{platform:0,car:1,mastery:4});
assert.deepEqual(LOBBY_DOWN_FACING_CARS,['helix_comet','helix_pulse','helix_vortex']);
for(const id of LOBBY_DOWN_FACING_CARS){
 assert.equal(lobbyDepartureTurnForCar(id),-90,id+' turns toward its nose');
 assert.deepEqual(lobbyDepartureLocalDrive(-90,600),{x:0,y:600},
  'down-facing cars drive viewport-right after negative turn');
}
for(const id of ['crown_axis','forge_hammer','helix_spark','veloce_photon']){
 assert.equal(lobbyDepartureTurnForCar(id),90,id+' keeps default clockwise departure');
 assert.deepEqual(lobbyDepartureLocalDrive(90,600),{x:0,y:-600});
}
assert.equal(lobbyDepartureTurnForCar('helix_comet','180deg'),90,
 'a preview flipped with skin calibration also flips departure direction');
assert.deepEqual(lobbyDepartureLocalDrive(lobbyDepartureTurnForCar('helix_spark','90deg'),600),
 {x:600,y:0},'a car already looking right departs with no turn');


// Two independent marks, behind the direction of travel, for BOTH +/-90.
const rect={left:150,top:110,width:100,height:200};
const platformRect={left:0,top:0,width:400,height:400};
const clockwise=lobbyDepartureWheelTracks(rect,platformRect,90);
const counterclockwise=lobbyDepartureWheelTracks(rect,platformRect,-90);
assert.equal(clockwise.length,2);
assert.equal(counterclockwise.length,2);
assert.ok(clockwise.every(t=>t.dy===1&&t.y>rect.top+rect.height/2-platformRect.height/2));
assert.ok(counterclockwise.every(t=>t.dy===-1&&t.y<rect.top+rect.height/2-platformRect.height/2));
assert.notEqual(clockwise[0].x,clockwise[1].x);
assert.notEqual(clockwise[0].length,clockwise[1].length,'two marks are not cloned');
assert.ok(clockwise.every(t=>t.length>=49&&t.length<=85&&t.width>=3.5&&t.width<=7));
const markOps={strokes:0,curves:0,segments:0,colors:new Set()};
const ctx={
 beginPath(){},moveTo(){},quadraticCurveTo(){markOps.curves++},
 lineTo(){markOps.segments++},stroke(){markOps.strokes++;markOps.colors.add(this.strokeStyle);}
};
paintLobbyRubber(ctx,clockwise);
assert.ok(markOps.strokes>70&&markOps.curves>50,'many fragmented brush strokes, not two bars');
assert.ok(markOps.segments>10,'natural scuffs interrupt the two marks');
assert.ok(markOps.colors.size>20,'non-uniform rubber opacity');
const smokeOps={wisps:0,rects:0,stops:0};
const smokeCtx={
 createRadialGradient(){smokeOps.wisps++;return {addColorStop(){smokeOps.stops++;}};},
 fillRect(){smokeOps.rects++;}
};
paintLobbySmoke(smokeCtx,175,100);
assert.ok(smokeOps.wisps>=50&&smokeOps.rects===smokeOps.wisps);
assert.equal(smokeOps.stops,smokeOps.wisps*3);

const storage={getItem:()=>null};
assert.equal(shouldUseLobbyDeparture({prod:true,storage,nativeAndroid:false}),false,'Public web release remains unchanged');
assert.equal(shouldUseLobbyDeparture({prod:true,storage,nativeAndroid:true}),true,'Android release WebView must animate lobby departure');
assert.equal(shouldUseLobbyDeparture({prod:true,storage:{getItem:()=> 'off'},nativeAndroid:true}),false,'Android release rollback switch');
assert.equal(shouldUseLobbyDeparture({prod:false,storage,nativeAndroid:false}),true,'DEV web retains transition');
assert.equal(shouldUseLobbyDeparture({prod:false,storage:{getItem:()=> 'off'},nativeAndroid:true}),false,'DEV rollback switch');
let called=0;
assert.equal(runLobbyRaceDeparture({},()=>called++,{prod:true,nativeAndroid:false}),false);
assert.equal(called,1,'Public production fallback launches without delay');
assert.equal(runLobbyRaceDeparture({},()=>called++,{prod:true,nativeAndroid:true}),false);
assert.equal(called,2,'Android still launches if lobby imagery is not ready, never hangs');
const scene=read('src/game/scenes/MenuGameModesScene.js');
assert.match(scene,/if\(this\._raceDeparturePending\)return/);
assert.match(scene,/runLobbyRaceDeparture\(this,launch,\{prod:IS_PROD_BUILD\}\)/);
assert.match(scene,/this\.scene\.start\('race',\{carId,trackKey:launchTrack,gameMode:mode\}\)/);
assert.match(scene,/this\._closeGameModeModal\(\)/);
assert.match(read('src/game/scenes/MenuGameModeSnapScene.js'),/this\._startSelectedMode\?\.\(key\)/);
const warm=read('src/game/game.js');
assert.match(warm,/window\.__tdrWarmRaceScene=\(\)=>ensureLazyScene\('race'\)/);
const script=read('src/game/ui/LobbyRaceDeparture.js');
assert.match(script,/Capacitor\.isNativePlatform\(\)\&\&Capacitor\.getPlatform\(\)==='android'/,
 'Native Android should be detected like the existing working lift');
assert.ok(script.includes('if(prod&&!nativeAndroid)return false;'),
 'Only public web should be disabled by production mode');
assert.ok(script.includes('shouldUseLobbyDeparture({prod,nativeAndroid})'),
 'The race launch must pass Android native detection into the animation gate');
for(const keyword of ['tdr-lobby-car-platform','[data-lobby-car]','[data-lobby-mastery]',
 'rotate(0deg)','translate3d(0,','platformPart','carPart','masteryPart',
 'prefers-reduced-motion',"once?.('shutdown',stop)",'stop();',
 '__tdrWarmRaceScene','root.appendChild(wrapper)'])assert.ok(script.includes(keyword),keyword);
assert.ok(script.indexOf('if(!shouldUseLobbyDeparture')<script.indexOf('const platformPart=departureLayer'));
assert.doesNotMatch(script,/document\.body\.appendChild\(/,'no viewport-level overlay allowed');
assert.doesNotMatch(script,/2147481900|zIndex:'214748/,'no high z-index layer');
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.platform/);
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.car/);
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.mastery/);
assert.match(script,/function playLobbyTireEffects\(platformPart,carRect,platformRect,turnAngle,animations\)/);
assert.match(script,/playLobbyTireEffects\(platformPart,car\.getBoundingClientRect\(\),pr,turnAngle,animations\)/);
assert.match(script,/rubber\.ctx\.translate\(platformRect\.width\/2,platformRect\.height\/2\)/,
 'centered tire contact coordinates must map into canvas pixel space');
assert.match(script,/paintLobbyRubber\(rubber\.ctx,contacts\)/);
assert.match(script,/paintLobbySmoke\(smoke\.ctx,175,100\)/);
assert.match(script,/makeLobbyDepartureCanvas\(175,100,'tdr-lobby-tire-smoke'\)/);
assert.match(script,/tdr-lobby-tire-streaks/);
assert.doesNotMatch(script,/tdr-lobby-tire-streak';|const streak=document\.createElement/,'no opaque rectangular streaks');
assert.doesNotMatch(script,/borderRadius:'47%|boxShadow:'0 0 2px/,'no pill clouds or hard tire borders');
assert.match(script,/ctx\.quadraticCurveTo\(/,'variable soft rubber microstrokes');
assert.match(script,/ctx\.createRadialGradient\(/,'many overlapping smoke wisps');
assert.match(script,/ctx\.fillRect\(/,'soft gradient ink, no single opaque ellipse');
assert.doesNotMatch(script,/requestAnimationFrame|setInterval/,'one-shot textures without rendering loop');
assert.match(script,/void animateAndWait\(rubber\.canvas/,'rubber never holds up the race');
assert.match(script,/void animateAndWait\(smoke\.canvas/,'smoke never holds up the race');
assert.match(script,/for\(const part of stages\)part\.remove\(\)/,'both canvases cleaned with platform');
assert.match(script,/animation\.cancel\(\)/,'no stale animation on menu shutdown');

assert.match(script,/Promise\.all\(stages\.map/,'independent stage layers rotate together');
assert.match(script,/const raceReady=await prepareRace\(\)/,'await slow network lazy scene');
assert.match(script,/return \(await prewarm\(\)\)===true/,'do not launch when lazy scene unavailable');
assert.match(script,/if\(!raceReady\|\|scene\?\.sys\?\.isActive/,'restore lobby when scene fails to load');
assert.match(script,/launched=true;[\s\S]{0,240}launch\(\)/,'launch only after readiness');
assert.doesNotMatch(script,/launched=true;stop\(\)/,'never restore center car before race launch');
assert.match(script,/scene\?\.events\?\.once\?\.\('shutdown',stop\)/,'restore only on actual menu shutdown');

assert.match(script,/const departures=\[carPart,\.\.\.\(masteryPart/);
assert.ok(script.includes('const turnAngle=lobbyDepartureTurnForCar(scene?.selectedCarId'),
 'uses current native preview heading before turning');
assert.ok(script.includes('const movement=lobbyDepartureLocalDrive(turnAngle,distance)'),
 'movement direction adjusts for clockwise/counter-clockwise turn');
assert.ok(!script.includes('rotate(90deg) translate3d(0,'),
 'outbound direction must not be hardcoded for cars facing down');
assert.match(script,/duration:LOBBY_DEPARTURE_TIMING\.drive,easing:'cubic-bezier\(\.6,\.05,\.94,\.45\)'/,'approved getaway unchanged');
assert.match(read('src/game/ui/lobby-dom.css'),/\.tdr-lobby-dom\.tdr-lobby-departing/);
assert.match(read('index.html'),/name="tdr-dev-version" content="DEV 1\.2\.\d+"/);
console.log('Lobby departure: two organic broken rubber deposits and one continuous smoke plume, no rectangles or circular pills; 520ms and Android parity preserved');

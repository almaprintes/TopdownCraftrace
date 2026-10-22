import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldUseLobbyDeparture,runLobbyRaceDeparture,lobbyDepartureTurnForCar,lobbyDepartureLocalDrive,lobbyDepartureFrontPivot,paintLobbySmoke,LOBBY_DEPARTURE_TAIL_KICK,LOBBY_DOWN_FACING_CARS,LOBBY_DEPARTURE_TIMING,LOBBY_DEPARTURE_DEPTH} from '../src/game/ui/LobbyRaceDeparture.js';
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


// Existing 180ms glint is reused for a tail-kick: 1600+180+520 stays fixed.
assert.deepEqual(LOBBY_DEPARTURE_TAIL_KICK,[0,4.5,-5,2.5,0]);
assert.equal(lobbyDepartureFrontPivot('helix_comet'),'50% 77%');
assert.equal(lobbyDepartureFrontPivot('helix_vortex'),'50% 77%');
assert.equal(lobbyDepartureFrontPivot('crown_axis'),'50% 23%');
assert.equal(lobbyDepartureFrontPivot('helix_spark'),'50% 23%');
const smokeOps={wisps:0,rects:0,stops:0};
const smokeCtx={
 createRadialGradient(){smokeOps.wisps++;return {addColorStop(){smokeOps.stops++;}};},
 fillRect(){smokeOps.rects++;}
};
paintLobbySmoke(smokeCtx,320,100);
assert.equal(smokeOps.wisps,96,'continuous, overlapping wisps on ONE texture');
assert.equal(smokeOps.rects,smokeOps.wisps);
assert.equal(smokeOps.stops,smokeOps.wisps*3);
const sampledAlpha=[];
paintLobbySmoke({
 createRadialGradient(){return {addColorStop(_,rgba){const match=String(rgba).match(/^rgba\(226,234,238,([\d.]+)\)$/);if(match)sampledAlpha.push(+match[1]);}};},
 fillRect(){}
},320,100);
assert.ok(Math.min(...sampledAlpha)>.035&&Math.max(...sampledAlpha)<.13,
 'wisps remain transparent but moderately denser');

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
// Zero burn marks: not a hidden/skipped effect but fully removed code.
assert.doesNotMatch(script,/paintLobbyRubber|lobbyDepartureWheelTracks|tdr-lobby-tire-streaks|playLobbyTireEffects/);
assert.match(script,/function playLobbyDepartureSmoke\(platformPart,carRect,platformRect,turnAngle,animations\)/);
assert.match(script,/playLobbyDepartureSmoke\(platformPart,car\.getBoundingClientRect\(\),pr,turnAngle,animations\)/);
assert.match(script,/const smoke=makeLobbySmokeCanvas\(width,height\)/);
assert.equal((script.match(/document\.createElement\('canvas'\)/g)||[]).length,1,'one smoke element, no particles');
assert.match(script,/ctx\.createRadialGradient\(/,'smoke built from many translucent overlapping wisps');
assert.match(script,/const angle=Math\.atan2\(-forward\.y,-forward\.x\)\*180\/Math\.PI/,
 'smoke must extend BEHIND the car');
assert.match(script,/filter:'blur\(2\.7px\)'/,'haze more legible without hard edges');
assert.match(script,/opacity:\.76,clipPath:'inset\(0 38% 0 0\)'/,'modest density increase');
assert.match(script,/clipPath:'inset\(0 100% 0 0\)'/,'plume initially hidden, not a static blob');
assert.match(script,/clipPath:'inset\(0 38% 0 0\)'/,'continuous smoke revealed during drive');
assert.match(script,/duration:LOBBY_DEPARTURE_TIMING\.hold\+LOBBY_DEPARTURE_TIMING\.drive/,'one plume covers hold and drive');
assert.match(script,/void animateAndWait\(smoke,/,'smoke never awaits or delays scene switch');
assert.match(script,/previewCar\.style\.transformOrigin=lobbyDepartureFrontPivot/,'rear end, not front, must wobble');
assert.match(script,/LOBBY_DEPARTURE_TAIL_KICK\.map/,'two signed swings settle to neutral');
assert.match(script,/await Promise\.all\(\[\s*animateAndWait\(platformPart\.firstElementChild/,'wobble fits inside existing hold');
assert.doesNotMatch(script,/requestAnimationFrame|setInterval/,'no extra render loops');
assert.match(script,/for\(const part of stages\)part\.remove\(\)/,'smoke cleaned up with platform');
assert.match(script,/animation\.cancel\(\)/,'cancel old animations at shutdown');

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
assert.match(read('index.html'),/name="tdr-dev-version" content="DEV \d+\.\d+\.\d+"/);
console.log('Lobby departure: zero rubber marks, front-pivot rear kick during 180ms hold, one continuously revealing plume through 520ms exit; Android parity and scene cleanup retained');

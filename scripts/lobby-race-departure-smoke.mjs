import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldUseLobbyDeparture,runLobbyRaceDeparture,LOBBY_DEPARTURE_TIMING} from '../src/game/ui/LobbyRaceDeparture.js';
const read=p=>readFileSync(p,'utf8');
assert.deepEqual(LOBBY_DEPARTURE_TIMING,{turn:800,hold:180,drive:520});
assert.equal(LOBBY_DEPARTURE_TIMING.turn+LOBBY_DEPARTURE_TIMING.hold+LOBBY_DEPARTURE_TIMING.drive,1500);
const storage={getItem:()=>null};
assert.equal(shouldUseLobbyDeparture({prod:true,storage}),false,'public release remains unchanged');
assert.equal(shouldUseLobbyDeparture({prod:false,storage}),true);
assert.equal(shouldUseLobbyDeparture({prod:false,storage:{getItem:()=> 'off'}}),false,'DEV rollback switch');
let called=0;
assert.equal(runLobbyRaceDeparture({},()=>called++,{prod:true}),false);
assert.equal(called,1,'production fallback launches without delay');
const scene=read('src/game/scenes/MenuGameModesScene.js');
assert.match(scene,/if\(this\._raceDeparturePending\)return/);
assert.match(scene,/runLobbyRaceDeparture\(this,launch,\{prod:IS_PROD_BUILD\}\)/);
assert.match(scene,/this\.scene\.start\('race',\{carId,trackKey:launchTrack,gameMode:mode\}\)/);
assert.match(scene,/this\._closeGameModeModal\(\)/);
assert.match(read('src/game/scenes/MenuGameModeSnapScene.js'),/this\._startSelectedMode\?\.\(key\)/);
const warm=read('src/game/game.js');
assert.match(warm,/window\.__tdrWarmRaceScene=\(\)=>ensureLazyScene\('race'\)/);
const script=read('src/game/ui/LobbyRaceDeparture.js');
for(const keyword of ['tdr-lobby-car-platform','[data-lobby-car]','[data-lobby-mastery]',
 'rotate(90deg)','translate3d(0,','platformClone','getAnimations','prefers-reduced-motion',
 "once?.('shutdown',stop)","stop();",'__tdrWarmRaceScene'])assert.ok(script.includes(keyword),keyword);
assert.ok(script.indexOf("if(!shouldUseLobbyDeparture")<script.indexOf('document.body.appendChild(layer)'));
assert.match(read('src/game/ui/lobby-dom.css'),/\.tdr-lobby-dom\.tdr-lobby-departing/);
assert.ok(read('index.html').includes('content="DEV 1.2.202"'));
console.log('Lobby race departure: 90deg clockwise turn, fixed stage, rightward getaway, single launch, prewarm, cleanup and disabled public builds OK');

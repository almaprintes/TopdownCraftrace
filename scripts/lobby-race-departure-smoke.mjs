import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shouldUseLobbyDeparture,runLobbyRaceDeparture,LOBBY_DEPARTURE_TIMING,LOBBY_DEPARTURE_DEPTH} from '../src/game/ui/LobbyRaceDeparture.js';
const read=p=>readFileSync(p,'utf8');
assert.deepEqual(LOBBY_DEPARTURE_TIMING,{turn:1600,hold:180,drive:520});
assert.equal(LOBBY_DEPARTURE_TIMING.turn+LOBBY_DEPARTURE_TIMING.hold+LOBBY_DEPARTURE_TIMING.drive,2300);
assert.deepEqual(LOBBY_DEPARTURE_DEPTH,{platform:0,car:1,mastery:4});
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
 'rotate(90deg)','translate3d(0,','platformPart','carPart','masteryPart',
 'prefers-reduced-motion',"once?.('shutdown',stop)",'stop();',
 '__tdrWarmRaceScene','root.appendChild(wrapper)'])assert.ok(script.includes(keyword),keyword);
assert.ok(script.indexOf('if(!shouldUseLobbyDeparture')<script.indexOf('const platformPart=departureLayer'));
assert.doesNotMatch(script,/document\.body\.appendChild\(/,'no viewport-level overlay allowed');
assert.doesNotMatch(script,/2147481900|zIndex:'214748/,'no high z-index layer');
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.platform/);
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.car/);
assert.match(script,/LOBBY_DEPARTURE_DEPTH\.mastery/);
assert.match(script,/Promise\.all\(stages\.map/,'independent stage layers rotate together');
assert.match(script,/const departures=\[carPart,\.\.\.\(masteryPart/);
assert.match(script,/duration:LOBBY_DEPARTURE_TIMING\.drive,easing:'cubic-bezier\(\.6,\.05,\.94,\.45\)'/,'approved getaway unchanged');
assert.match(read('src/game/ui/lobby-dom.css'),/\.tdr-lobby-dom\.tdr-lobby-departing/);
assert.ok(read('index.html').includes('content="DEV 1.2.204"'));
console.log('Lobby departure: 1.6s turn; 0.52s original getaway; platform z0, car z1, mastery z4; UI depth untouched; rollback and fallback OK');

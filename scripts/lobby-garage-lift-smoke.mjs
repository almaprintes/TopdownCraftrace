import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GARAGE_LIFT_TIMING,GARAGE_LIFT_DEPTH,GARAGE_LIFT_SWITCH,GARAGE_LIFT_RETURN_KEY,garageLiftEnabled,markGarageLiftReturn,consumeGarageLiftReturn} from '../src/game/ui/LobbyGarageLiftTransition.js';
const read=p=>readFileSync(p,'utf8');
assert.deepEqual(GARAGE_LIFT_TIMING,{down:1040,up:1120});
assert.deepEqual(GARAGE_LIFT_DEPTH,{platform:0,car:1,mastery:4});
assert.equal(GARAGE_LIFT_SWITCH,'tdr2:devGarageLift');
const on={getItem:()=>null},off={getItem:()=> 'off'};
assert.equal(garageLiftEnabled({prod:true,storage:on}),false,'public build unchanged');
assert.equal(garageLiftEnabled({prod:false,storage:on}),true);
assert.equal(garageLiftEnabled({prod:false,storage:off}),false,'local rollback switch');
const map=new Map();
const session={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
assert.equal(markGarageLiftReturn({prod:true,storage:session}),false);
assert.equal(markGarageLiftReturn({prod:false,storage:session}),true);
assert.equal(map.get(GARAGE_LIFT_RETURN_KEY),'rise');
assert.equal(consumeGarageLiftReturn({prod:false,storage:session}),true);
assert.equal(map.size,0,'consume exactly once');
assert.equal(consumeGarageLiftReturn({prod:false,storage:session}),false);
const source=read('src/game/ui/LobbyGarageLiftTransition.js');
for(const str of ['.tdr-lobby-car-platform',"[data-lobby-car]","[data-lobby-mastery]",
 'createFloorWell','copyAtPivot','anchoredPart','Promise.all(progress)',
 'scene._garageLiftBusy','root.appendChild(node)',
 "visibility:'visible'","scene?.scene?.start?.('menu')",
 "scene?.scene?.start?.('GarageScene',{mode:'player'})",
 "root.classList.add('tdr-lobby-garage-lifting')"])assert.ok(source.includes(str),str);
assert.doesNotMatch(source,/document\.body\.appendChild/,'no screen-covering overlay');
assert.doesNotMatch(source,/214748|zIndex:\s*['"]999/,'native z-index required');
assert.match(source,/const frames=goingDown\?\[LEVEL,FALL\]:\[FALL,LEVEL\]/);
assert.match(source,/scene\?\.events\?\.once\?\.\('shutdown',cleanup\)/);
assert.match(source,/if\(attempts\+\+>35\)return restore\(\)/,'image failures must fall back');
const lobby=read('src/game/ui/LobbyDomUi.js'),polish=read('src/game/ui/LobbyPublishPolish.js');
assert.match(lobby,/label:tr\('lobby\.garage'\),action:\(\)=>goToPlayerGarageWithLift\(scene\)/);
assert.match(polish,/makeCardButton\(car,t\('lobby\.openGarage'\),\(\)=>goToPlayerGarageWithLift\(scene\)\)/);
const garage=read('src/game/scenes/GarageLazyCardsScene.js');
assert.match(garage,/this\._garageReturnPending=false/);
assert.match(garage,/onBack:\(\)=>returnToLobbyFromGarage\(this\)/);
assert.match(garage,/data-select.*?returnToLobbyFromGarage\(this\)/s);
assert.match(garage,/data-back.*?returnToLobbyFromGarage\(this\)/s);
assert.match(garage,/this\._lockedCar\(selected\.id\)/);
const menu=read('src/game/scenes/MenuDomUiScene.js');
assert.match(menu,/polishLobbyForPublish\(this, lobbyRoot\);[\s\S]{0,240}beginGarageLiftRise\(this,lobbyRoot\)/);
assert.match(read('src/game/ui/LobbyRaceDeparture.js'),/turn:1600,hold:180,drive:520/,'approved departure unchanged');
assert.match(read('src/game/ui/lobby-dom.css'),/\.tdr-lobby-dom\.tdr-lobby-garage-lifting/);
assert.match(read('index.html'),/content="DEV 1\.2\.205"/);
console.log('Garage lift: stage+car down/up in native lobby layers; all player garage navigation; one-shot return; rollback; no public change; race departure untouched');

// Regression for REAL LIVE 4: host + 3 AI, G Bezier and invisible dice.
// No spectator scene or independent 5-car mode is allowed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CrafRaceLive4BotDirector} from '../src/game/online/craftraceLiveV2BotDirector.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {isLive4GuidedGSupported,setLive4GuidedGForRoom,hasLive4GuidedGForRoom}
  from '../src/game/online/craftraceLive4GuidedGExperiment.js';
const room='550e8400-e29b-41d4-a716-446655440005';
const other='550e8400-e29b-41d4-a716-446655440006';
const store=new Map();
const memory={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)};
assert.equal(isLive4GuidedGSupported({trackId:'santa-cruz',dev:true,aiDifficulty:3}),true);
for(const [trackId,dev,aiDifficulty] of [
 ['santa-cruz',false,3],['track01',true,3],['santa-cruz',true,2]])
 assert.equal(isLive4GuidedGSupported({trackId,dev,aiDifficulty}),false);
assert.equal(hasLive4GuidedGForRoom(room,memory),false);
assert.equal(setLive4GuidedGForRoom(room,true,memory),true);
assert.equal(hasLive4GuidedGForRoom(room,memory),true);
assert.equal(hasLive4GuidedGForRoom(other,memory),false);
setLive4GuidedGForRoom(room,false,memory);
assert.equal(hasLive4GuidedGForRoom(room,memory),false);
const lobby=readFileSync('src/game/ui/craftraceLiveV2Lobby.js','utf8');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const game=readFileSync('src/game/scenes/RaceScene.js','utf8');
for(const text of ['data-guided-g','data-edit-guided-g',
 'setLive4GuidedGForRoom(s.id','data-fill','data-capacity','data-ai']){
 assert.ok(lobby.includes(text),'Missing actual LIVE 4 lobby option '+text);
}
assert.ok(bridge.includes('live4GuidedGTrial:guidedGTrial'));
assert.ok(bridge.includes('roster.some(x=>x.kind===\'ai\'&&x.difficulty===3)'));
assert.ok(bridge.includes('hasLive4GuidedGForRoom(roomId)'));
assert.ok(bridge.includes('advanceHostedLive4Bots('));
assert.ok(bridge.includes('data?.lapTimes||data?.lap_times'), 'Show actual times by lap');
assert.ok(game.includes('liveV2RoomId')&&!game.includes('directorPlayable'),
 'Play through the existing LIVE 4 race, not a second director mode');
const track=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
const host='550e8400-e29b-41d4-a716-446655440000';
function body(x,y){return{x,y,rotation:0,body:{velocity:{x:0,y:0}},
 setVisible(){return this},setCircle(){return this},setCollideWorldBounds(){return this},
 setBounce(){return this},setDrag(){return this},setVelocity(x,y){
 this.body.velocity.x=x;this.body.velocity.y=y;return this;},destroy(){}}}
function sprite(x,y,key='car'){return{x,y,texture:{key},scaleX:1,scaleY:1,
 setVisible(){return this},setOrigin(){return this},setPosition(){return this},
 setScale(){return this},setRotation(){return this},setAlpha(){return this},
 setTint(){return this},setTexture(next){this.texture.key=next;return this}}}
const scene={trackKey:'santa-cruz',track:{closed:true,meta:{...track,id:'santa-cruz'}},
 maxFwd:420,accel:520,brakeForce:720,turnRate:2.4,carParams:{maxFwd:420,
 accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{}},
 carRig:{list:[sprite(0,0)]},textures:{exists:key=>key==='car'},
 physics:{add:{sprite:(x,y)=>body(x,y)}},
 add:{sprite,container:(x,y)=>({x,y,setDepth(){return this},
 setPosition(a,b){this.x=a;this.y=b;return this},
 setRotation(){return this},destroy(){}})},simTick:1};
const roster=[{kind:'human',seat:0,player_id:host},
 ...Array.from({length:3},(_,i)=>({kind:'ai',seat:i+1,
 bot_id:'guided-'+(i+1),owner_id:host,difficulty:3}))];
const a=track.centerline[0],b=track.centerline[1];
const origin={x:a.x,y:a.y,r:Math.atan2(b.y-a.y,b.x-a.x)};
const grid=makeLive4StartingGrid({start:origin,capacity:4,
 centerline:track.centerline,finishLine:track.finishLine,
 trackWidth:track.trackWidth,carScale:track.carScale});
const director=new CrafRaceLive4BotDirector(scene,{roster,hostId:host,
 localId:host,startingGrid:grid,laps:3,live4GuidedGTrial:true});
assert.equal(director.bots.length,3,'Host drives only three bots');
assert.equal(director.preview,false,'This is NOT Realizador');
assert.equal(director.live4GuidedGTrial,true);
assert.equal(director.previewMode,'G');
assert.equal(director.previewBezierActive,true);
assert.equal(director.previewGuideReport.accepted,10);
assert.ok(director.previewGuidedProfile.valid);
for(const b of director.bots){
 assert.ok(b.guidedRoll>=1&&b.guidedRoll<=6,'Start die is automatic');
 assert.equal(b.bezierDieHistory.length,1);
 assert.equal(b.bezierDieHistory[0].lap,1);
 assert.ok(b._bezierProfile.valid);
 assert.equal(b._bezierProfile.parameters.maxSpeed,420,'No faster car');
}
assert.equal(director.update(16,1000,false).length,0,'No early AI launch');
director.destroy();
// Non-opted host continues to race on A, not silently G.
const standard=new CrafRaceLive4BotDirector(scene,{roster,hostId:host,
 localId:host,startingGrid:grid,laps:3,live4GuidedGTrial:false});
assert.equal(standard.live4GuidedGTrial,false);
assert.equal(standard.bots[0].bezierDieHistory.length,0);
standard.destroy();
console.log('PASS LIVE 4: 1 human + 3 AI, host-only G Bezier, initial dice, room scoping, unchanged default');

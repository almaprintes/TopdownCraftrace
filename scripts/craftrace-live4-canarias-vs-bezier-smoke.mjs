// REAL LIVE 4 (not Realizador): the human host races 3 EXPERT
// Karting Canarias 4096 bots driving the owner-taught 14-node Bezier.
// The published old/inverse circuits must NOT inherit it.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CrafRaceLive4BotDirector} from '../src/game/online/craftraceLiveV2BotDirector.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {liveV2Grid} from '../src/game/online/craftraceLiveV2Roster.js';
import {isLive4GuidedGSupported,guidedGTrackLabel,setLive4GuidedGForRoom,hasLive4GuidedGForRoom}
 from '../src/game/online/craftraceLive4GuidedGExperiment.js';

const id='karting-canarias-4096';
assert.equal(isLive4GuidedGSupported({trackId:id,dev:true,aiDifficulty:3}),true);
assert.equal(isLive4GuidedGSupported({trackId:'santa-cruz',dev:true,aiDifficulty:3}),true);
for(const candidate of [
 {trackId:id,dev:false,aiDifficulty:3},
 {trackId:id,dev:true,aiDifficulty:2},
 {trackId:'karting-canarias',dev:true,aiDifficulty:3},
 {trackId:'karting-canarias-4096-inverso',dev:true,aiDifficulty:3},
 {trackId:'karting-canarias-inverso',dev:true,aiDifficulty:3},
 {trackId:'imola',dev:true,aiDifficulty:3}
])assert.equal(isLive4GuidedGSupported(candidate),false,JSON.stringify(candidate));
assert.equal(guidedGTrackLabel(id),'KARTING CANARIAS 4096');

const roomId='550e8400-e29b-41d4-a716-446655440034';
const store=new Map();
const memory={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
assert.equal(hasLive4GuidedGForRoom(roomId,memory),false);
assert.equal(setLive4GuidedGForRoom(roomId,true,memory),true);
assert.equal(hasLive4GuidedGForRoom(roomId,memory),true);
assert.equal(hasLive4GuidedGForRoom('550e8400-e29b-41d4-a716-446655440035',memory),false);

const host='550e8400-e29b-41d4-a716-446655440000';
const line=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias-4096/track.json','utf8'));
assert.equal(line.worldW,4096);assert.equal(line.worldH,6144);
const base={state:'waiting',capacity:4,fill_ai:true,ai_difficulty:3,host_id:host,
 locked_roster:null,members:[{seat:0,player_id:host,ready:true,online:true}]};
const seats=liveV2Grid(base);
assert.equal(seats.canStart,true);
assert.equal(seats.humanCount,1);
assert.equal(seats.aiCount,3);

function body(x,y){return{x,y,rotation:0,body:{velocity:{x:0,y:0}},
 setVisible(){return this},setCircle(){return this},setCollideWorldBounds(){return this},
 setBounce(){return this},setDrag(){return this},setVelocity(x,y){
 this.body.velocity.x=x;this.body.velocity.y=y;return this;},destroy(){}}}
function sprite(x,y,key='car'){return{x,y,texture:{key},scaleX:1,scaleY:1,
 setVisible(){return this},setOrigin(){return this},setPosition(){return this},
 setScale(){return this},setRotation(){return this},setAlpha(){return this},
 setTint(){return this},setTexture(next){this.texture.key=next;return this}}}
const scene={trackKey:id,track:{closed:true,meta:{...line,id}},
 maxFwd:420,accel:520,brakeForce:720,turnRate:2.4,carParams:{maxFwd:420,
 accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{}},
 carRig:{list:[sprite(0,0)]},textures:{exists:key=>key==='car'},
 physics:{add:{sprite:(x,y)=>body(x,y)}},
 add:{sprite,container:(x,y)=>({x,y,setDepth(){return this},
 setPosition(a,b){this.x=a;this.y=b;return this},
 setRotation(){return this},destroy(){}})},simTick:1};
const roster=[{kind:'human',seat:0,player_id:host},
 ...Array.from({length:3},(_,i)=>({kind:'ai',seat:i+1,bot_id:'canarias-ai-'+(i+1),
 owner_id:host,difficulty:3}))];
const a=line.centerline[0],b=line.centerline[1];
const origin={x:a.x,y:a.y,r:Math.atan2(b.y-a.y,b.x-a.x)};
const grid=makeLive4StartingGrid({start:origin,capacity:4,
 centerline:line.centerline,finishLine:line.finishLine,
 trackWidth:line.trackWidth,carScale:line.carScale});
const race=new CrafRaceLive4BotDirector(scene,{roster,hostId:host,
 localId:host,startingGrid:grid,laps:3,live4GuidedGTrial:true});
assert.equal(race.preview,false,'This is a playable human LIVE 4 room');
assert.equal(race.bots.length,3,'Three expert rivals, one human');
assert.equal(race.live4GuidedGTrial,true);
assert.equal(race.previewMode,'G');
assert.equal(race.previewBezierActive,true);
assert.equal(race.previewGuideReport.total,14);
assert.equal(race.previewGuideReport.active,true);
assert.equal(race.previewGuidedProfile.valid,true);
// Active DEV LIVE 4 G rooms must use the calibrated monotone mode for physics.
const g1=race._bezierProfileForDie(1,1);
const g2=race._bezierProfileForDie(1,2);
const g6=race._bezierProfileForDie(1,6);
assert.ok(g1.live4DieVariationPx>g2.live4DieVariationPx,
  '1 must be more perturbed than 2 in this same G seat');
assert.ok(g2.live4DieVariationPx>g6.live4DieVariationPx);
assert.equal(g6.live4DieVariationPx,0);
for(const bot of race.bots){
 assert.equal(bot.difficulty,3);
 assert.ok(bot.guidedRoll>=1&&bot.guidedRoll<=6);
 assert.equal(bot.bezierDieHistory.length,1);
 assert.equal(bot.bezierDieHistory[0].lap,1);
 assert.ok(bot._bezierProfile.valid);
 assert.equal(bot._bezierProfile.parameters.maxSpeed,420);
}
assert.equal(race.update(16,1000,false).length,0);
race.destroy();
const chosen=new CrafRaceLive4BotDirector(scene,{roster,hostId:host,
 localId:host,startingGrid:grid,laps:3,live4GuidedGTrial:true,
 aiIdentitySeed:roomId,aiPilotIds:{1:'falcon',2:'nova',3:'comet'}});
assert.deepEqual(chosen.bots.map(b=>b.aiPilot?.id),['falcon','nova','comet']);
assert.deepEqual(chosen.bots.map(b=>b.aiPilot?.elo),[1800,900,1730]);
assert.equal(chosen.results().length,0);
assert.ok(chosen.bots.every(b=>b.bezierDieHistory.length===1));
chosen.destroy();
const ordinary=new CrafRaceLive4BotDirector(scene,{roster,hostId:host,
 localId:host,startingGrid:grid,laps:3,live4GuidedGTrial:false});
assert.equal(ordinary.live4GuidedGTrial,false);
assert.equal(ordinary.previewMode,'A');
ordinary.destroy();

const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const bot=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const lobby=readFileSync('src/game/ui/craftraceLiveV2Lobby.js','utf8');
assert.ok(bridge.includes('room.track_id===scene.trackKey'));
assert.ok(bridge.includes('room.fill_ai===true'));
assert.ok(bridge.includes('room.ai_difficulty'));
assert.ok(bridge.includes('hasLive4GuidedGForRoom(roomId)'));
assert.ok(bot.includes('isLive4GuidedGSupported({trackId:scene.trackKey'));
assert.ok(lobby.includes('data-g-label')&&lobby.includes('data-edit-g-label'));
assert.ok(lobby.includes('PARA CORRER CONTRA 3 EXPERTOS'));
assert.ok(lobby.includes("setLive4GuidedGForRoom(s.id"));
assert.ok(lobby.includes('startLiveV2Lobby(room.id)'));
console.log('PASS LIVE 4: 1 human vs 3 exact-source Canarias 4096 G experts, dice, 14-node line, no official records, no inverse/legacy mode.');

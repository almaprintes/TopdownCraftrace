import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CrafRaceLive4RemoteModel,validateLive4Roster} from '../src/game/online/craftraceLiveV2RaceModel.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {CrafRaceLive4BotDirector,LIVE4_AI_LEVELS} from '../src/game/online/craftraceLiveV2BotDirector.js';
import {syncLive4CarVisual} from '../src/game/online/craftraceLiveV2CarVisual.js';
import {makeDirectorCameraState,chooseDirectorAction,stepDirectorCamera,directorZoom,
 directorStickVector,directorAltitudeStick,directorStartPhase}
 from '../src/game/online/craftraceDirectorCamera.js';
const a='550e8400-e29b-41d4-a716-446655440000';
const b='550e8400-e29b-41d4-a716-446655440001';
const c='550e8400-e29b-41d4-a716-446655440002';
const room='550e8400-e29b-41d4-a716-446655440005';
const roster=[{kind:'human',seat:0,player_id:a},{kind:'human',seat:1,player_id:b},
 {kind:'human',seat:2,player_id:c},{kind:'ai',seat:3,bot_id:'ai-seat-4',owner_id:a,difficulty:3}];
const valid=validateLive4Roster(roster,a,a);
assert.equal(valid.localSeat,0);
assert.deepEqual(valid.racers.map(x=>x.seat),[0,1,2,3]);
assert.equal(validateLive4Roster(roster,a,b).localSeat,1);
for(const broken of [
  [roster[0],roster[0]],
  [{...roster[0],seat:1},roster[1]],
  [roster[0],{...roster[3],owner_id:b}],
  [roster[0],{...roster[3],bot_id:'other'}],
  [...roster,{kind:'ai',seat:4,owner_id:a,difficulty:2,bot_id:'ai-seat-5'}]
])assert.throws(()=>validateLive4Roster(broken,a,a));
const model=new CrafRaceLive4RemoteModel({roomId:room,hostId:a,localId:a,roster});
assert.equal(model.state.size,3);
const pose={x:12,y:8,angle:0,speed:120,tick:1,lap:0};
const packet={v:1,type:'position',roomId:room,from:b,seat:1,seq:1,generation:1,payload:pose};
assert.equal(model.accept(packet,1000),true);
assert.equal(model.accept(packet,1200),false,'Duplicate packet');
assert.equal(model.accept({...packet,from:c,seq:2},1200),false,'No identity spoofing');
assert.equal(model.accept({...packet,roomId:'wrong',seq:2},1200),false);
assert.equal(model.accept({...packet,seq:2,payload:{...pose,x:Infinity}},1200),false);
assert.equal(model.accept({...packet,seq:2,payload:{...pose,tick:2,x:25}},1150),true);
assert.equal(model.accept({...packet,seq:3,payload:{...pose,tick:1}},1250),false,
 'Stale simulation tick rejected');
assert.equal(model.accept({...packet,seat:3,from:b,seq:3},1300),false,'Guest cannot send bot');
assert.equal(model.accept({...packet,seat:3,from:a,seq:1},1300),true,'Host owns bot');
assert.equal(model.stats().accepted,3);
// A live sender cannot arbitrarily switch session generation.
assert.equal(model.accept({...packet,seq:3,generation:2,payload:{...pose,tick:3}},1400),
 false,'Unexpected epoch switch rejected while old stream is active');
// After silence (for example an app crash), the same authorized pilot may
// reconnect with a new epoch and reset both packet sequence and sim tick.
assert.equal(model.accept({...packet,seq:1,generation:2,payload:{...pose,tick:0,x:80}},
 4100),true,'Reconnection accepted after stale interval');
assert.equal(model.accept({...packet,seq:1,generation:1,payload:{...pose,tick:25}},
 4200),false,'Delayed old epoch must not replace the new stream');
assert.equal(model.accept({...packet,seq:2,generation:2,payload:{...pose,tick:1,x:90}},
 4250),true,'New epoch continues with increasing seq and tick');
assert.equal(model.stats().samples.find(s=>s.seat===1).reconnects,1);
assert.equal(model.accept({...packet,seq:4,generation:1,payload:{...pose,tick:4}},
 8000),false,'A previously seen generation cannot be replayed even after silence');
assert.equal(model.stats().accepted,5);
assert.equal(model.positions(7100).find(x=>x.seat===1).disconnected,true);
assert.equal(model.positions(4300).filter(x=>x.pose).length,1, 'Stale bot hidden while reconnected human remains visible');
const remoteView=new CrafRaceLive4RemoteModel({roomId:room,hostId:a,localId:b,roster});
assert.equal(remoteView.state.size,3);
assert.equal(remoteView.accept({...packet,seat:3,from:a},500),true);
assert.throws(()=>new CrafRaceLive4RemoteModel({roomId:room,hostId:a,localId:'550e8400-e29b-41d4-a716-446655440099',roster}));
const wide=makeLive4StartingGrid({start:{x:500,y:400,r:0},trackWidth:420,carScale:1});
const narrow=makeLive4StartingGrid({start:{x:500,y:400,r:Math.PI/2},trackWidth:80,capacity:3});
assert.equal(wide.parallel,true);
assert.equal(narrow.parallel,false);
assert.equal(narrow.positions.length,3);
assert.ok(new Set(narrow.positions.map(s=>s.y.toFixed(2))).size===3);
assert.ok(wide.positions[0].y!==wide.positions[1].y);
assert.ok(wide.positions[0].x!==wide.positions[2].x);
assert.deepEqual(Object.keys(LIVE4_AI_LEVELS).map(Number),[1,2,3]);
assert.equal(LIVE4_AI_LEVELS[3].pace,1,'Expert never receives more than player maximum speed');
assert.equal(LIVE4_AI_LEVELS[3].plannerDrive,1,'Expert anticipates using the actual acceleration limit');
assert.equal(LIVE4_AI_LEVELS[3].plannerBrake,1,'Expert anticipates using the actual brake limit');
assert.ok(LIVE4_AI_LEVELS[1].pace<LIVE4_AI_LEVELS[2].pace);
assert.ok(LIVE4_AI_LEVELS[2].pace<LIVE4_AI_LEVELS[3].pace);
const landscape={centerline:[{x:100,y:100},{x:700,y:100},{x:700,y:700},{x:100,y:700}],trackWidth:170,carScale:1};
function mockBody(x,y){
  return{scene:{},x,y,rotation:0,body:{velocity:{x:0,y:0}},setVisible(){return this;},
    setCircle(){return this;},setCollideWorldBounds(){return this;},
    setBounce(){return this;},setDrag(){return this;},setVelocity(vx,vy){
      this.body.velocity.x=vx;this.body.velocity.y=vy;return this;},
    destroy(){this.scene=null;}
  };
}
const makeVisual=(x,y,key)=>({
 texture:{key},x,y,originX:.5,originY:.5,scaleX:1,scaleY:1,rotation:0,alpha:1,visible:true,
 setTexture(value){this.texture.key=value;return this;},
 setVisible(value){this.visible=value;return this;},
 setOrigin(x,y){this.originX=x;this.originY=y;return this;},
 setPosition(x,y){this.x=x;this.y=y;return this;},
 setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},
 setRotation(value){this.rotation=value;return this;},
 setAlpha(value){this.alpha=value;return this;},
 setTint(value){this.tint=value;return this;}
});
const mockScene={
 track:{closed:true,meta:landscape},maxFwd:420,carParams:{maxFwd:420,accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{}},
 textures:{exists:key=>key==='car'||key==='published_skin'},
 carRig:{list:[makeVisual(0,0,'car')]},
 physics:{add:{sprite:(x,y)=>mockBody(x,y)}},
 add:{sprite:makeVisual,
   container:(x,y)=>({scene:{},x,y,setDepth(){return this;},setPosition(nx,ny){this.x=nx;this.y=ny;return this;},
      setRotation(rotation){this.rotation=rotation;return this;},destroy(){this.scene=null;}})},
 simTick:1
};
const aiRoster=[roster[0],{kind:'ai',seat:1,bot_id:'ai-seat-2',owner_id:a,difficulty:1},
 {kind:'ai',seat:2,bot_id:'ai-seat-3',owner_id:a,difficulty:2},roster[3]];
const director=new CrafRaceLive4BotDirector(mockScene,{roster:aiRoster,hostId:a,localId:a,startingGrid:wide,laps:3});
assert.equal(director.bots.length,3);
assert.equal(director.profiles.get(3).parameters.maxSpeed,420,
 'Expert targets the true car limit, not the old hardcoded 520px/s');
assert.equal(director.profiles.get(3).parameters.driveAccel,520,'Expert uses real acceleration (no boost)');
assert.ok(director.profiles.get(3).metrics.meanTargetSpeed>=director.profiles.get(2).metrics.meanTargetSpeed);
assert.equal(new Set(director.bots.map(b=>b.style)).size,3,'Every bot has a deterministic driving style');
assert.equal(director.update(16,1000,false).length,0,'No bot driving during countdown');
assert.ok(director.bots.every(b=>b.visual.texture.key==='car'&&b.visual.visible));
const visual=director.bots[0].visual;
mockScene.carRig.list[0].setTexture('__MISSING');
assert.equal(syncLive4CarVisual(mockScene,visual,0xffffff),false,'Missing textures never render');
assert.equal(visual.visible,false);
mockScene.carRig.list[0].setTexture('published_skin').setScale(.8,.85).setRotation(.12);
director.update(16,1001,false);
assert.ok(director.bots.every(b=>b.visual.visible&&b.visual.texture.key==='published_skin'));
assert.equal(visual.scaleX,.8,'AI skin must inherit the player skin fit');
assert.equal(visual.rotation,.12,'AI skin must inherit artwork rotation');
let count=0;
for(let frame=0;frame<80;frame++){
 const reports=director.update(16.667,1000+frame*16.667,true);
 count+=reports.length;
 for(const bot of director.bots){
  bot.plannerBody.x+=bot.plannerBody.body.velocity.x/60;
  bot.plannerBody.y+=bot.plannerBody.body.velocity.y/60;
 }
}
assert.ok(count>=6,'Bot positions published at bounded cadence');
assert.ok(Number.isFinite(director.stats().botCpuMeanMs));
assert.ok(director.stats().count===3);
for(const bot of director.bots)assert.ok(Number.isFinite(bot.plannerBody.x)&&Number.isFinite(bot.plannerBody.y));
director.destroy();
assert.equal(director.bots.length,0);
assert.throws(()=>new CrafRaceLive4BotDirector(mockScene,{roster:aiRoster,hostId:a,localId:b,startingGrid:wide}));
const four=Array.from({length:4},(_,seat)=>({kind:'ai',seat,bot_id:'local-ai-'+(seat+1),
 owner_id:'local-director',difficulty:3}));
const localScene={...mockScene,_crafRaceDirectorPreview:true};
const localGrid=makeLive4StartingGrid({start:{x:500,y:400,r:0},trackWidth:170,capacity:4});
assert.throws(()=>new CrafRaceLive4BotDirector(mockScene,{
 roster:four,hostId:'local-director',localId:'local-director',
 startingGrid:localGrid,laps:3}),
 'Four AI must remain forbidden inside LIVE v2 network rooms');
const fourBots=new CrafRaceLive4BotDirector(localScene,{
 roster:four,hostId:'local-director',localId:'local-director',
 startingGrid:localGrid,laps:3,preview:true});
assert.equal(fourBots.bots.length,4,'Director preview creates exactly four AI');
assert.equal(fourBots.update(16,1000,false).length,0,'No early start during countdown');
assert.equal(fourBots.stats().count,4);
fourBots.destroy();
const link=fs.readFileSync(new URL('../src/game/online/craftraceLiveV2PositionLink.js',import.meta.url),'utf8');
assert.ok(link.includes("private:true")&&link.includes("craftrace-live4:"));
assert.ok(link.includes("identity.id!==this.localId"));

// Producer flight: two (and only two) analog levers. Speed is LEFT radius,
// not a gas/brake button. The RIGHT lever only changes altitude/zoom.
const rect={left:100,top:200,width:100,height:100};
const topStick=directorStickVector(150,201,rect);
assert.equal(topStick.x,0,'Up is pure Y, no inadvertent horizontal movement');
assert.ok(topStick.y<-.95&&topStick.offsetY<0,'Thumb and movement track finger');
const halfStick=directorStickVector(150,237,rect);
assert.ok(halfStick.magnitude>.35&&halfStick.magnitude<.7,
 'Stick near center gives proportional speed');
const eastStick=directorStickVector(290,250,rect);
assert.ok(eastStick.x>.95&&eastStick.y===0,'Horizontal movement');
assert.ok(Math.hypot(eastStick.offsetX,eastStick.offsetY)<=26.01,'Thumb stays inside the track');
const diagonalStick=directorStickVector(260,150,rect);
assert.ok(diagonalStick.x>0&&diagonalStick.y<0,'Both XY directions work');
const heightRect={left:400,top:200,width:76,height:150};
const high=directorAltitudeStick(200,heightRect);
const low=directorAltitudeStick(350,heightRect);
const neutral=directorAltitudeStick(275,heightRect);
assert.equal(high.axis,-1,'Right lever up points toward the asphalt');
assert.equal(low.axis,1,'Right lever down ascends to a wider view');
assert.equal(neutral.axis,0,'Right lever returns to neutral');
assert.ok(Math.abs(directorAltitudeStick(160,heightRect).offsetY+51)<1e-9,
 'Right lever is constrained to its vertical track');
assert.deepEqual(directorStartPhase(1000,4000),{started:false,seconds:3});
assert.deepEqual(directorStartPhase(3000,4000),{started:false,seconds:1});
assert.deepEqual(directorStartPhase(4000,4000),{started:true,seconds:0});
const startState=()=>makeDirectorCameraState({x:0,y:0,heading:0});
const run=(input)=>{let state=startState();
 for(let frame=0;frame<50;frame++)state=stepDirectorCamera(state,input,.02);return state;};
const fast=run({stickX:0,stickY:topStick.y});
const slow=run({stickX:0,stickY:halfStick.y});
assert.ok(fast.y<slow.y&&slow.y<0,'Speed follows distance from center');
assert.ok(fast.speed>slow.speed*1.6,'Analog speed is not constant');
let snappy=startState();
for(let frame=0;frame<7;frame++)
 snappy=stepDirectorCamera(snappy,{stickX:1,stickY:0},1/60);
assert.ok(snappy.vx>650,'Direction reaches useful speed within ~120 ms');
let responsiveZoom=startState();
for(let frame=0;frame<30;frame++)
 responsiveZoom=stepDirectorCamera(responsiveZoom,{altitudeAxis:-1},1/60);
assert.ok(directorZoom(responsiveZoom.altitude)>1.8,
 'Zoom-in must respond clearly within half a second');
const combined=run({stickX:.7,stickY:-.5,altitudeAxis:-1});
assert.ok(combined.x>0&&combined.y<0&&directorZoom(combined.altitude)>1.9,
 'Moving, changing direction and zooming work simultaneously');
assert.ok(fast.speed>650,'Full stick gives lively panning at normal zoom');
assert.ok(Math.abs(fast.x)<1,'Pushing upward does not drift sideways');
const east=run({stickX:eastStick.x,stickY:eastStick.y});
assert.ok(east.x>0&&Math.abs(east.y)<1,'Rightward stick flies right');
const diagonal=run({stickX:diagonalStick.x,stickY:diagonalStick.y});
assert.ok(diagonal.x>0&&diagonal.y<0,'Diagonal motion has both components');
const climb=run({altitudeAxis:high.axis});
const descend=run({altitudeAxis:low.axis});
assert.ok(directorZoom(climb.altitude)>directorZoom(.52),
 'UP = camera descends / zoom IN');
assert.ok(directorZoom(descend.altitude)<directorZoom(.52),
 'DOWN = camera climbs / zoom OUT');
assert.ok(directorZoom(climb.altitude)>1.9,
 'Upward zoom has sufficient range to show a close-up');
assert.ok(directorZoom(descend.altitude)<.35,
 'Downward zoom allows a genuinely wide shot');
const centerAfter=stepDirectorCamera(fast,{stickX:0,stickY:0},.05);
assert.ok(centerAfter.speed<fast.speed,'Centering the stick slows flight');
let settling=centerAfter;
for(let i=0;i<30;i++)settling=stepDirectorCamera(settling,{},.05);
assert.ok(settling.speed<1,'Drone brakes naturally at neutral without a pedal');
const cars=[{plannerBody:{x:0,y:0}},{plannerBody:{x:12,y:0}},
 {plannerBody:{x:700,y:900}},{plannerBody:{x:800,y:900}}];
assert.equal(chooseDirectorAction(cars).x,6,'AUTO chooses the closest fight');
let tracking=startState();tracking.auto=true;
tracking=stepDirectorCamera(tracking,{altitudeAxis:-1},.05,cars);
assert.ok(tracking.auto&&tracking.x>0,
 'Second lever adjusts altitude without cancelling AUTO framing');
tracking=stepDirectorCamera(tracking,{stickX:1,stickY:0},.05,cars);
assert.equal(tracking.auto,false,'Manual translation cancels AUTO framing');
assert.ok(directorZoom(.1)>directorZoom(1));
console.log('PASS LIVE 4: validated 4-seat protocol, three independent interpolators, two grid layouts, three physical AI levels and 80-step synthetic physics');

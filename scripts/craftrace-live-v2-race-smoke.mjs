import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CrafRaceLive4RemoteModel,validateLive4Roster} from '../src/game/online/craftraceLiveV2RaceModel.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {CrafRaceLive4BotDirector,LIVE4_AI_LEVELS} from '../src/game/online/craftraceLiveV2BotDirector.js';
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
const mockScene={
 track:{closed:true,meta:landscape},maxFwd:420,carParams:{maxFwd:420,accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{}},
 carRig:{list:[{originX:.5,originY:.5,scaleX:1,scaleY:1,texture:{key:'car'}}]},
 physics:{add:{sprite:(x,y)=>mockBody(x,y)}},
 add:{sprite:()=>({setOrigin(){return this;},setScale(){return this;},setTint(){return this;}}),
   container:(x,y)=>({scene:{},x,y,setDepth(){return this;},setPosition(nx,ny){this.x=nx;this.y=ny;return this;},
      setRotation(rotation){this.rotation=rotation;return this;},destroy(){this.scene=null;}})},
 simTick:1
};
const aiRoster=[roster[0],{kind:'ai',seat:1,bot_id:'ai-seat-2',owner_id:a,difficulty:1},
 {kind:'ai',seat:2,bot_id:'ai-seat-3',owner_id:a,difficulty:2},roster[3]];
const director=new CrafRaceLive4BotDirector(mockScene,{roster:aiRoster,hostId:a,localId:a,startingGrid:wide,laps:3});
assert.equal(director.bots.length,3);
assert.equal(director.update(16,1000,false).length,0,'No bot driving during countdown');
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
const link=fs.readFileSync(new URL('../src/game/online/craftraceLiveV2PositionLink.js',import.meta.url),'utf8');
assert.ok(link.includes("private:true")&&link.includes("craftrace-live4:"));
assert.ok(link.includes("identity.id!==this.localId"));
console.log('PASS LIVE 4: validated 4-seat protocol, three independent interpolators, two grid layouts, three physical AI levels and 80-step synthetic physics');

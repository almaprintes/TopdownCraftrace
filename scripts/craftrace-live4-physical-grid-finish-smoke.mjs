// LIVE 4 physical regression: same director, real grid, 4 AI, 3 laps,
// real CP1 -> CP2 -> META crossings. A small mocked Arcade world advances
// velocity at 60 Hz; there are no network, collisions or unofficial rewards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {CrafRaceLive4BotDirector} from '../src/game/online/craftraceLiveV2BotDirector.js';
import {loopPathMetrics,gateOnLoop} from '../src/game/tracks/closedCircuitGateOrder.js';
const DT=1/60,HOST='local-director-preview';
const makeSprite=(x,y,key='car')=>({
 x,y,rotation:0,texture:{key},originX:.5,originY:.5,scaleX:1,scaleY:1,
 alpha:1,visible:true,body:{velocity:{x:0,y:0}},
 setVisible(v){this.visible=v;return this;},
 setTexture(k){this.texture.key=k;return this;},
 setCircle(){return this;},setCollideWorldBounds(){return this;},
 setBounce(){return this;},setDrag(){return this;},
 setVelocity(vx,vy){this.body.velocity.x=vx;this.body.velocity.y=vy;return this;},
 setOrigin(x,y){this.originX=x;this.originY=y;return this;},
 setPosition(x,y){this.x=x;this.y=y;return this;},
 setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;},
 setRotation(r){this.rotation=r;return this;},
 setAlpha(a){this.alpha=a;return this;},
 setTint(a){this.tint=a;return this;},
 destroy(){this.destroyed=true;}
});
const makeContainer=(x,y)=>({
 x,y,rotation:0,scene:{},setDepth(){return this;},
 setPosition(x,y){this.x=x;this.y=y;return this;},
 setRotation(r){this.rotation=r;return this;},
 destroy(){this.scene=null;}
});
function runCircuit(slug){
 const meta=JSON.parse(readFileSync(
  'src/game/tracks/library/'+slug+'/track.json','utf8'));
 assert.ok(meta.finishLine?.a&&meta.finishLine?.b,'Physical finish gate required');
 const first=meta.centerline[0],next=meta.centerline[1];
 const start=meta.start||{x:first.x,y:first.y,
  r:Math.atan2(next.y-first.y,next.x-first.x)};
 const grid=makeLive4StartingGrid({
  start,trackWidth:meta.trackWidth,carScale:meta.carScale||1,
  capacity:4,centerline:meta.centerline,finishLine:meta.finishLine
 });
 assert.equal(grid.trackAligned,true,'Grid must follow the real centreline');
 const metrics=loopPathMetrics(meta.centerline),finish=gateOnLoop(metrics,meta.finishLine);
 assert.ok(finish.hit,'Finish line must intersect track');
 const nearestDist=pos=>Math.min(...meta.centerline.map(
  p=>Math.hypot(pos.x-p.x,pos.y-p.y)));
 for(let i=0;i<4;i++){
  const pos=grid.positions[i],dist=nearestDist(pos);
  assert.ok(dist<Math.max(30,meta.trackWidth*.4),
   'Grid seat '+i+' is outside asphalt: distance='+dist);
 }
 const bodies=[],player=makeSprite(0,0,'car');
 const scene={
  _crafRaceDirectorPreview:true,track:{meta,closed:true},
  maxFwd:420,accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,
  carParams:{maxFwd:420,accel:520,brakeForce:720,linearDrag:.004,
   turnRate:2.4,steering:{}},
  carRig:{list:[player]},textures:{exists:k=>k==='car'},
  physics:{add:{sprite:(x,y,key)=>{const s=makeSprite(x,y,key);bodies.push(s);return s;}}},
  add:{sprite:makeSprite,container:makeContainer},simTick:0,
  _carVisualRotOffset:Math.PI/2
 };
 const roster=Array.from({length:4},(_,seat)=>({
  kind:'ai',seat,bot_id:'local-ai-'+seat,owner_id:HOST,difficulty:3
 }));
 const director=new CrafRaceLive4BotDirector(scene,{
  roster,hostId:HOST,localId:HOST,startingGrid:grid,laps:3,preview:true
 });
 assert.equal(director.bots.length,4);
 for(let i=0;i<4;i++)assert.ok(
  Math.hypot(director.bots[i].plannerBody.x-grid.positions[i].x,
    director.bots[i].plannerBody.y-grid.positions[i].y)<1e-7,
  'No hidden 44px shift on the aligned grid');
 let firstMoved=false;
 for(let frame=1;frame<=60*160;frame++){
  const now=1000+frame*1000/60;
  scene.simTick=frame;
  director.update(1000/60,now,true);
  for(const body of bodies){
   body.x+=body.body.velocity.x*DT;
   body.y+=body.body.velocity.y*DT;
  }
  if(frame===180)firstMoved=director.bots.every(b=>{
   const p=grid.positions[b.seat];
   return Math.hypot(p.x-b.plannerBody.x,p.y-b.plannerBody.y)>35;
  });
  if(director.stats().finished===4)break;
 }
 assert.ok(firstMoved,'Every AI must physically leave its grid slot');
 assert.equal(director.results().length,4,
  'All four Expert bots must physically cross three finish lines');
 const times=director.results().map(r=>r.elapsedMs);
 assert.ok(director.bots.every(b=>b.gatePhase===0&&b.completedLaps===3));
 assert.ok(director.results().every(r=>
  r.lapTimes.length===3&&r.lapTimes.every(ms=>ms>2000)));
 console.log('PASS physical LIVE 4',slug,JSON.stringify({
  firstGrid: grid.positions[0],finishDistance:finish.routeDistance,
  timesMs:times,completed:director.results().length
 }));
 director.destroy();
}
runCircuit('track01');
const santa=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/track.json','utf8'));
// Official photo source installer provides real finish/start gates in CI.
if(santa.finishLine?.a&&santa.finishLine?.b)runCircuit('santa-cruz');
else console.log('INFO Santa Cruz source not installed; track01 physical check passed');

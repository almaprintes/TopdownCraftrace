// Physical G skill A/B: compare the SAME start point with the SAME car.
// No GPS/room/real user data; installed Santa Cruz photo-source geometry.
// The real physical controller integrates rotations/velocity at 60 Hz.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AI_ELO_PILOTS,eloDieProbabilities,rollEloAiDie}
 from '../src/game/ai/craftraceAiEloLeague.js';
import {live4GDriverSkill,live4GCornerDecisions}
 from '../src/game/ai/craftraceLive4GDriverSkill.js';
import {CrafRaceLive4BotDirector} from '../src/game/online/craftraceLiveV2BotDirector.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {updateRacePhysicalBot} from '../src/game/ai/raceAiController.js';

const round=(v,d=3)=>Number(v.toFixed(d));
const flat=eloDieProbabilities(1350),top=eloDieProbabilities(1800),low=eloDieProbabilities(900);
for(const [name,distribution] of [['flat',flat],['top',top],['low',low]]){
 assert.equal(distribution.length,6);
 assert.ok(Math.abs(distribution.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.ok(distribution.every(p=>p>=.09&&p<=.25),'Neither Elo must monopolize a face: '+name);
}
assert.ok(top[4]+top[5]>low[4]+low[5]);
assert.ok(top[4]+top[5]<.48,'No excessive top-Elo high-roll stacking');
assert.ok(low[4]+low[5]>.19,'Even a 900-rated rookie can score a high face');
assert.ok(top[4]+top[5]<2.5*(low[4]+low[5]));
assert.ok(flat.every(p=>Math.abs(p-1/6)<1e-12));
const constantRng=()=>.18;
assert.ok(rollEloAiDie(1800,constantRng)>=rollEloAiDie(900,constantRng));
assert.equal(AI_ELO_PILOTS.length,16);

for(const elo of [900,1200,1500,1800]){
 for(let die=1;die<=6;die++){
  const p=live4GDriverSkill(elo,die);
  assert.ok(p&&p.quality>=0&&p.quality<=1);
  const curve=live4GCornerDecisions(p,1),straight=live4GCornerDecisions(p,0);
  assert.deepEqual(straight,{aimFactor:1,steerRateFactor:1,cornerSpeedFactor:1});
  assert.ok(curve.aimFactor>=.85&&curve.aimFactor<=1);
  assert.ok(curve.steerRateFactor>=.88&&curve.steerRateFactor<=1);
  assert.ok(curve.cornerSpeedFactor>=.8&&curve.cornerSpeedFactor<=1);
  if(die<6)assert.ok(p.quality<live4GDriverSkill(elo,die+1).quality);
 }
}
assert.deepEqual(live4GCornerDecisions(null,1),{
 aimFactor:1,steerRateFactor:1,cornerSpeedFactor:1
});
assert.equal(live4GDriverSkill(null,6),null);
assert.ok(live4GDriverSkill(1800,1).quality>live4GDriverSkill(900,6).quality,
 'Elo experience matters even if the novice gets a lucky die');

const track=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
const host='550e8400-e29b-41d4-a716-446655440000';
function body(x,y){return{x,y,rotation:0,body:{velocity:{x:0,y:0}},
 setVisible(){return this},setCircle(){return this},
 setCollideWorldBounds(){return this},setBounce(){return this},
 setDrag(){return this},setVelocity(x,y){this.body.velocity.x=x;this.body.velocity.y=y;return this},destroy(){}}}
function sprite(x,y,key='car'){return{x,y,texture:{key},scaleX:1,scaleY:1,
 setVisible(){return this},setPosition(){return this},setOrigin(){return this},
 setScale(){return this},setRotation(){return this},setAlpha(){return this},
 setTint(){return this},setTexture(k){this.texture.key=k;return this}}}
const scene={trackKey:'santa-cruz',track:{closed:true,meta:{...track,id:'santa-cruz'}},simTick:1,
 maxFwd:480,accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,
 carParams:{maxFwd:480,accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{}},
 carRig:{list:[sprite(0,0)]},textures:{exists:key=>key==='car'},
 physics:{add:{sprite:(x,y)=>body(x,y)}},
 add:{sprite,container:(x,y)=>({x,y,setDepth(){return this},
 setPosition(a,b){this.x=a;this.y=b;return this},setRotation(){return this},destroy(){}})}};
const a=track.centerline[0],b=track.centerline[1];
const grid=makeLive4StartingGrid({
 start:{x:a.x,y:a.y,r:Math.atan2(b.y-a.y,b.x-a.x)},capacity:4,
 centerline:track.centerline,finishLine:track.finishLine,
 trackWidth:track.trackWidth,carScale:track.carScale});
const roster=[{kind:'human',seat:0,player_id:host},
 ...[1,2,3].map(seat=>({kind:'ai',seat,owner_id:host,difficulty:3,bot_id:'bot'+seat}))];
const director=new CrafRaceLive4BotDirector(scene,{
 roster,hostId:host,localId:host,startingGrid:grid,laps:3,
 live4GuidedGTrial:true,aiIdentitySeed:'smoke-elo',
 aiPilotIds:{1:'falcon',2:'nova',3:'comet'}
});
assert.ok(director.previewBezierActive,'Use the actual authored G Bézier');
for(const bot of director.bots)assert.equal(bot._live4GDriverSkill?.elo,bot.aiPilot.elo);
assert.ok(director._bezierProfileForDie(1,6).valid);
const DT=1/60;
function simulate(elo,die,lapCount=1){
 // Fixed seat and identical starting point; only die/profile and driver
 // judgment vary. Reuse the actual G director's generated speed profiles.
 const profile=director._bezierProfileForDie(1,die);
 const samples=profile.samples,n=samples.length;
 const origin=samples[0],next=samples[4];
 const physicsBody={x:origin.x,y:origin.y,
  rotation:Math.atan2(next.y-origin.y,next.x-origin.x),
  body:{velocity:{x:0,y:0}}};
 const bot={plannerBody:physicsBody,_plannerSampleIndex:0};
 const skill=live4GDriverSkill(elo,die);
 let progress=0,last=0,errors=0,maxError=0,avgDecision=0,brakes=0;
 const lapEnds=[];
 for(let frame=0;frame<60*130;frame++){
  const control=updateRacePhysicalBot(bot,profile,{
   dt:DT,spacing:director.spacing,maxFwd:480,cornerRisk:.35,
   accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{},
   live4PrecisionCornering:true,
   live4GuidedApex:{continuousOnly:true,guides:[]},
   live4GDriverSkill:skill
  });
  assert.ok(control.valid);
  physicsBody.x+=physicsBody.body.velocity.x*DT;
  physicsBody.y+=physicsBody.body.velocity.y*DT;
  assert.ok(Number.isFinite(physicsBody.x)&&Number.isFinite(physicsBody.y));
  let step=control.nearestIndex-last;
  if(step< -n/2)step+=n;
  if(step>n/2)step-=n;
  if(step>0&&step<Math.min(50,n*.12))progress+=step;
  last=control.nearestIndex;
  errors+=control.distanceToLine;
  maxError=Math.max(maxError,control.distanceToLine);
  avgDecision+=control.live4GCornerSpeedFactor;
  if(control.brake>.001)brakes++;
  if(progress>=n){
   progress-=n;lapEnds.push(round((frame+1)*DT));
   if(lapEnds.length>=lapCount)return{
    seconds:round((frame+1)*DT),
    lapTimes:lapEnds.map((v,i)=>round(v-(lapEnds[i-1]||0))),
    meanError:round(errors/(frame+1)),
    maxError:round(maxError),
    cornerDecisionPct:round(avgDecision/(frame+1)*100,2),
    brakePct:round(brakes/(frame+1)*100,2)
   };
  }
 }
 throw Error('Physical lap did not complete Elo='+elo+' die='+die);
}
// Same physical car/start: changing the ELO or the die must change decisions
// and produce measurable time deltas, not just rerender a different nickname.
const cases=[
 {name:'rookie die 1',elo:900,die:1},
 {name:'rookie die 6',elo:900,die:6},
 {name:'ace die 1',elo:1800,die:1},
 {name:'ace die 6',elo:1800,die:6},
 {name:'middle die 3',elo:1350,die:3},
 {name:'middle die 5',elo:1350,die:5}
];
const results=cases.map(x=>({...x,...simulate(x.elo,x.die)}));
const byName=Object.fromEntries(results.map(x=>[x.name,x]));
console.info('LIVE4-G-REAL-ELO-AB',JSON.stringify(results));
assert.ok(byName['rookie die 1'].seconds>byName['rookie die 6'].seconds+.15,
 'Dice must affect actual physical lap time for same pilot');
assert.ok(byName['ace die 1'].seconds>byName['ace die 6'].seconds+.08,
 'Die must affect actual expert lap time');
assert.ok(byName['rookie die 1'].seconds>byName['ace die 1'].seconds+.15,
 'ELO must produce physical experience benefit independent of dice');
assert.ok(byName['rookie die 6'].seconds>byName['ace die 6'].seconds+.15,
 'High Elo must have meaningful proficiency even on equal perfect roll');
assert.ok(results.every(x=>x.maxError<110),
 'Skill variation must still follow racing line safely; no teleport or shortcut');
// More than a lucky roll: compare expected physical lap time across ALL SIX
// faces with the newly softened probabilities, fixed grid and same engine.
const expectedByElo={};
for(const elo of [900,1350,1800]){
 const probs=eloDieProbabilities(elo);
 const perFace=Array.from({length:6},(_,i)=>simulate(elo,i+1));
 expectedByElo[elo]=round(perFace.reduce((sum,run,i)=>sum+probs[i]*run.seconds,0));
 assert.ok(perFace.every(x=>x.maxError<110),
  'All six skill choices must remain on track: '+elo);
}
assert.ok(expectedByElo[900]>expectedByElo[1350] &&
 expectedByElo[1350]>expectedByElo[1800],
 'Expected ELO pace must be ordered over all rolls');
assert.ok(expectedByElo[900]-expectedByElo[1800]>.4,
 'Physical skill and softened dice must separate 900 from 1800 ELO');
console.info('LIVE4-G-WEIGHTED-ELO-PACE',JSON.stringify(expectedByElo));
// Standing-start-only comparisons may exaggerate skill. Diagnose launched
// laps before adjusting gameplay: same continuous physical state, no reset.
const rolling=Array.from({length:6},(_,i)=>i+1).flatMap(die=>[900,1800].map(elo=>{
 const x=simulate(elo,die,3);
 return{elo,die,lapTimes:x.lapTimes,
  movingLapMean:round((x.lapTimes[1]+x.lapTimes[2])/2),
  meanError:x.meanError,brakePct:x.brakePct,cornerDecisionPct:x.cornerDecisionPct};
}));
console.info('LIVE4-G-ROLLING-AB',JSON.stringify(rolling));
director.destroy();
console.log('PASS LIVE4 G Elo/dice physical driving A/B',JSON.stringify({dice:{
 topHigh:round(top[4]+top[5]),rookieHigh:round(low[4]+low[5]),
 topLow:round(top[0]+top[1]),rookieLow:round(low[0]+low[1])
},track:'santa-cruz',sameStart:true,samePhysics:true,results}));

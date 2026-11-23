// Headless *physical-controller* experiment. No rewards, Supabase writes or
// production AI changes. Deterministic, paired starting conditions for every
// die face. This is simulated evidence, NOT iPhone Arcade-collision evidence.
// Each simulation uses the actual LIVE 4 planner, steering and gate logic.
// Usage: RACE_DIE_REPS=1 node scripts/craftrace-live4-die-physics-benchmark.mjs
// Full:  RACE_DIE_REPS=35 node scripts/craftrace-live4-die-physics-benchmark.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildBezierAiRacingLineModel,buildBezierDieVariant} from '../src/game/ai/trackBezierAiRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../src/game/ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../src/game/ai/raceAiController.js';
import {makeLive4LapGates,advanceLive4PhysicalLap} from '../src/game/online/craftraceLive4LapGates.js';
import {makeLive4StartingGrid} from '../src/game/online/craftraceLiveV2GridGeometry.js';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
import {resolveDirectorGuideSource} from '../src/game/online/craftraceDirectorGuideSource.js';

const track=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias-4096/track.json','utf8'));
const source=resolveDirectorGuideSource({meta:{...track,id:'karting-canarias-4096'}});
const baseline=buildTrackRacingLineModel({raceCenterline:track.raceCenterline||track.centerline,
 trackWidth:track.trackWidth},{apexCommitment:.22});
const model=buildBezierAiRacingLineModel(baseline,source.bezier,source.shape,source.dimensions,
 {carRadius:14});
assert.ok(model.report.active,'Registered owner Bézier must be physically safe: '+JSON.stringify(model.report));
const base=model.model;
const gates=makeLive4LapGates({centerline:track.raceCenterline||track.centerline,
 finishLine:track.finishLine||track.finish,checkpoints:track.checkpoints,trackWidth:track.trackWidth});
const grid=makeLive4StartingGrid({start:track.start,capacity:4,
 centerline:track.raceCenterline||track.centerline,finishLine:track.finishLine,
 trackWidth:track.trackWidth,carScale:track.carScale});
const mask=makeKartingShapeMask(source.shape,source.dimensions.worldW,source.dimensions.worldH);
const reps=Math.max(1,Math.min(80,Number(process.env.RACE_DIE_REPS||35)|0));
const fpsList=process.env.RACE_DIE_FPS==='60'?[60]:[30,60];
const MAX_SECONDS=140,SEATS=[1,2,3],FACES=[1,2,3,4,5,6];
const profileOptions={maxSpeed:420,lateralAccel:2050,minCornerSpeed:80,
 maxYawRate:2.4,curvatureSmoothWindow:21,driveAccel:520,brakeDecel:720};
const seedRng=initial=>{let s=initial>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}};
const round=(n,places=4)=>Number(Number(n).toFixed(places));
const variationSamples=(variant,original)=>{
 const a=variant.racingLine,b=original.racingLine,n=a.length,sep=[];
 for(let i=0;i<n;i++)sep.push(Math.hypot(a[i].x-b[i].x,a[i].y-b[i].y));
 sep.sort((x,y)=>x-y);
 return{plannedPx:round(Number(variant.metrics?.dieVariationPx||0),2),
 meanActualRoutePx:round(sep.reduce((s,x)=>s+x,0)/n,3),
 peakActualRoutePx:round(sep.at(-1)||0,3),
 p95RoutePx:round(sep[Math.floor(sep.length*.95)]||0,3)};
};
const combos=[];
for(const seat of SEATS)for(const face of FACES){
 const line=buildBezierDieVariant(base,face,seat,source.shape,source.dimensions,
 {carRadius:14,monotoneCalibration:process.env.RACE_DIE_CALIBRATED==='1'});
 const plan=buildTrackManeuverPlan(buildTrackSpeedProfile(line,profileOptions));
 assert.ok(plan.valid&&plan.samples.length>=12,'Invalid controlled G profile');
 const distance=variationSamples(line,base);
 combos.push({face,seat,plan,line,variation:distance});
}
const lerp=(a,b,t)=>a+(b-a)*t;
function simulate({face,seat,plan,line,variation},seed,fps){
 const rng=seedRng((seed*2654435761+8121)>>>0);
 // All six die faces and all seats experience the same seed-derived lateral
 // offset, yaw and bounded frame-time pattern. Only their plan differs.
 const jitter=(rng()-.5)*12,heading=(rng()-.5)*.07;
 const start=grid.positions[seat];
 const nx=-Math.sin(start.r),ny=Math.cos(start.r);
 const x=start.x+nx*jitter,y=start.y+ny*jitter;
 const body={x,y,rotation:start.r+heading,body:{velocity:{x:0,y:0}},
  setVelocity(a,b){this.body.velocity.x=a;this.body.velocity.y=b;}};
 let best=0,dist=Infinity;
 for(let i=0;i<plan.samples.length;i++){
  const s=plan.samples[i],d=(x-s.x)**2+(y-s.y)**2;
  if(d<dist){dist=d;best=i;}
 }
 const bot={plannerBody:body,_plannerSampleIndex:best,lastPhysicalPosition:{x,y},
  gatePhase:0,completedLaps:0,lapTimes:[],lastLapAt:null,finished:false};
 let sumError=0,sumSpeed=0,sumBrake=0,sumSteer=0,offRoad=0,
   maxError=0,frames=0,progress=0,lastIndex=best,wallHits=0;
 let now=0,lastOutside=false,closedGate=false;
 const dtNominal=1/fps;
 const maxFrames=Math.ceil(MAX_SECONDS*fps*1.04);
 for(let frame=0;frame<maxFrames;frame++){
  // Small deterministic frame-duration fluctuations preserve paired matching.
  const dt=dtNominal*(.965+.07*rng());
  const control=updateRacePhysicalBot(bot,plan,{
   dt,spacing:base.spacing,maxFwd:420,cornerRisk:.35,
   accel:520,brakeForce:720,linearDrag:.004,turnRate:2.4,steering:{},
   live4PrecisionCornering:true,
   live4GuidedApex:{continuousOnly:true,guides:[]}
  });
  if(!control.valid)return{finished:false,reason:'controller-invalid',elapsed:null};
  // Same position integrator as the existing repository LIVE4 Expert A/B
  // headless benchmark. Phaser Arcade collisions are not emulated.
  body.x+=body.body.velocity.x*dt;
  body.y+=body.body.velocity.y*dt;
  now+=dt*1000;frames++;
  if(!Number.isFinite(body.x)||!Number.isFinite(body.y))
   return{finished:false,reason:'non-finite',elapsed:null};
  let step=control.nearestIndex-lastIndex;
  if(step< -plan.samples.length/2)step+=plan.samples.length;
  if(step>plan.samples.length/2)step-=plan.samples.length;
  if(step>0&&step<Math.min(50,plan.samples.length*.12))progress+=step;
  lastIndex=control.nearestIndex;
  sumError+=control.distanceToLine;
  maxError=Math.max(maxError,control.distanceToLine);
  sumSpeed+=control.speed;sumBrake+=control.brake;sumSteer+=Math.abs(control.steer);
  if(frame%5===0){
   const outside=!mask.isOnTrack(body.x,body.y);
   if(outside)offRoad++;
   if(outside&&!lastOutside)wallHits++;
   lastOutside=outside;
  }
  if(bot.lastLapAt===null)bot.lastLapAt=now;
  if(advanceLive4PhysicalLap(bot,gates,now,1)){closedGate=true;break;}
 }
 const finished=bot.finished===true;
 return{finished,reason:finished?'finish-checkpoints':
   (progress>=plan.samples.length?'no-finish-gate':'no-full-lap'),
  elapsed:finished?round(bot.lapTimes[0]/1000,3):null,
  meanLineErrorPx:round(sumError/frames,3),maxLineErrorPx:round(maxError,2),
  meanSpeed:round(sumSpeed/frames,3),meanBrake:round(sumBrake/frames,4),
  meanAbsSteer:round(sumSteer/frames,4),offRoadFraction:round(offRoad/Math.max(1,Math.ceil(frames/5)),4),
  offRoadEpisodes:wallHits,frames,progressFraction:round(progress/plan.samples.length,3)};
}
const cases=[],started=Date.now();
for(const fps of fpsList){
 for(let seed=0;seed<reps;seed++){
  for(const combo of combos)cases.push({face:combo.face,seat:combo.seat,seed,fps,
   ...combo.variation,...simulate(combo,seed+177,fps)});
 }
 console.log('CHECKPOINT fps='+fps+' simulated='+cases.length+' elapsedMs='+(Date.now()-started));
}
const stats=values=>{if(!values.length)return null;
 const s=values.slice().sort((a,b)=>a-b),sum=s.reduce((a,b)=>a+b,0);
 return{n:s.length,mean:round(sum/s.length,3),median:round(s[Math.floor(s.length/2)],3),
  p05:round(s[Math.floor((s.length-1)*.05)],3),
  p95:round(s[Math.floor((s.length-1)*.95)],3),
  min:round(s[0],3),max:round(s.at(-1),3)};};
const perDie=FACES.map(face=>{
 const entries=cases.filter(x=>x.face===face),completed=entries.filter(x=>x.finished);
 return{face,total:entries.length,completed:completed.length,completionRate:round(completed.length/entries.length,4),
  elapsedSeconds:stats(completed.map(x=>x.elapsed)),
  trackingErrorPx:stats(entries.map(x=>x.meanLineErrorPx)),
  offRoadFraction:stats(entries.map(x=>x.offRoadFraction)),
  planningPx:stats(entries.map(x=>x.plannedPx)),
  realizedPathOffsetPx:stats(entries.map(x=>x.meanActualRoutePx)),
  meanSpeed:stats(entries.map(x=>x.meanSpeed))};
});
const map=new Map(cases.map(x=>[[x.seed,x.seat,x.fps,x.face].join(':'),x]));
const paired=[];
for(const fps of fpsList)for(let seed=0;seed<reps;seed++)for(const seat of SEATS){
 const a=map.get([seed,seat,fps,1].join(':')),b=map.get([seed,seat,fps,6].join(':'));
 if(a?.finished&&b?.finished)
  paired.push({fps,seed,seat,badFace1:a.elapsed,perfectFace6:b.elapsed,
   deltaFace1Minus6:round(a.elapsed-b.elapsed,3)});
}
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
const summary={kind:'physics-controller-headless-not-full-gameplay',
 track:'karting-canarias-4096',faceRule:'1=26px worst, 6=0px ideal',
 caveats:['No Phaser Arcade collision integration','No human player or AI-to-AI collision','No server/netcode','Randomized initial pose and dt jitter are synthetic conditions; repeated passes are not independent real-world races'],
 setup:{repetitionsPerSeatFaceFps:reps,seats:SEATS,faces:FACES,fps:fpsList,
  requestedRuns:SEATS.length*FACES.length*fpsList.length*reps,
  actualRuns:cases.length},
 perDie,pairedFace1vs6:{count:paired.length,
  deltaSeconds:stats(paired.map(x=>x.deltaFace1Minus6)),
  face1SlowerFraction:round(paired.filter(x=>x.deltaFace1Minus6>0).length/Math.max(1,paired.length),4)},
 beforeFixExpectedRole:'No seat-specific pace multipliers in controlled simulation',
 timingMs:Date.now()-started};
const output=process.env.RACE_DIE_OUTPUT||(process.env.RACE_DIE_CALIBRATED==='1'?'artifacts/live4-bezier-dice-calibrated.json':'artifacts/live4-bezier-dice-physics.json');
mkdirSync('artifacts',{recursive:true});
writeFileSync(output,JSON.stringify({summary,cases,paired},null,2));
console.log('BENCHMARK_RESULT='+JSON.stringify(summary));
if(cases.length!==summary.setup.requestedRuns)throw Error('Incomplete factorial coverage');
if(cases.some(x=>!Number.isFinite(x.meanLineErrorPx)))throw Error('Invalid physics measurements');
console.log('PASS '+cases.length+' controlled physical-controller simulations; full report: '+output);

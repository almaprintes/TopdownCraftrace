// LIVE 4 Expert A/B: reproducible, headless same-car physics benchmark.
// NOT an official lap timer. Geometry progress and cross-track deviation are
// proxies; the iPhone test must still validate checkpoints and collisions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../src/game/ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../src/game/ai/raceAiController.js';

const CASES=[
 {name:'Santa Cruz',path:'santa-cruz'},
 {name:'Track 01',path:'track01'},
 {name:'Karting Tenerife',path:'karting-tenerife'},
 {name:'Technical Ridge',path:'technical-ridge'}
];
const CAR=Object.freeze({
 maxFwd:420,accel:520,brakeForce:720,linearDrag:.004,
 turnRate:2.4,steering:{}
});
const DT=1/60,MAX_SECONDS=180;
function lineFor(track,expert){
 const geometry={raceCenterline:track.centerline,trackWidth:track.trackWidth};
 return buildTrackRacingLineModel(geometry,expert?{apexCommitment:.22}:{});
}
function profileFor(line,expert){
 const profile=buildTrackSpeedProfile(line,{
  maxSpeed:CAR.maxFwd,lateralAccel:2050,
  minCornerSpeed:expert?80:125,driveAccel:CAR.accel,
  brakeDecel:CAR.brakeForce,
  ...(expert?{maxYawRate:CAR.turnRate,curvatureSmoothWindow:21}:{})
 });
 assert.ok(profile.valid,'Valid velocity plan required');
 assert.equal(profile.parameters?.curvatureSmoothWindow,expert?21:undefined);
 return buildTrackManeuverPlan(profile);
}
function simulate(track,expert){
 const line=lineFor(track,expert),profile=profileFor(line,expert);
 assert.ok(line.valid&&profile.valid);
 const samples=profile.samples,n=samples.length;
 const first=samples[0],look=samples[4];
 const body={
  x:first.x,y:first.y,
  rotation:Math.atan2(look.y-first.y,look.x-first.x),
  body:{velocity:{x:0,y:0}}
 };
 const bot={plannerBody:body,_plannerSampleIndex:0};
 let completed=0,lastIndex=0,meanError=0,maxError=0,wideSamples=0;
 const maxFrames=MAX_SECONDS*60;
 for(let frame=0;frame<maxFrames;frame++){
  const result=updateRacePhysicalBot(bot,profile,{
   dt:DT,spacing:line.spacing,
   maxFwd:CAR.maxFwd,cornerRisk:.35,
   accel:CAR.accel,brakeForce:CAR.brakeForce,
   linearDrag:CAR.linearDrag,turnRate:CAR.turnRate,
   steering:CAR.steering,live4PrecisionCornering:expert
  });
  assert.ok(result.valid,'Invalid physical bot control');
  body.x+=body.body.velocity.x*DT;
  body.y+=body.body.velocity.y*DT;
  assert.ok(Number.isFinite(body.x)&&Number.isFinite(body.y),
   'No NaN or infinite coordinates');
  let step=result.nearestIndex-lastIndex;
  if(step< -n/2)step+=n;
  if(step>n/2)step-=n;
  if(step>0&&step<Math.min(50,n*.12))completed+=step;
  lastIndex=result.nearestIndex;
  meanError+=result.distanceToLine;
  maxError=Math.max(maxError,result.distanceToLine);
  if(result.distanceToLine>35)wideSamples++;
  if(completed>=n){
   const samplesTaken=frame+1;
   return {
    seconds:+(samplesTaken*DT).toFixed(2),
    meanError:+(meanError/samplesTaken).toFixed(2),
    maxError:+maxError.toFixed(2),
    wideFraction:+(wideSamples/samplesTaken).toFixed(3),
    samples:n
   };
  }
 }
 throw Error('No synthetic lap completed: '+track.name+
  ' expert='+expert+' samples='+n+' progress='+completed);
}
let totalLegacy=0,totalExpert=0;
const results=[];
for(const entry of CASES){
 const track=JSON.parse(readFileSync(
  'src/game/tracks/library/'+entry.path+'/track.json','utf8'));
 assert.notEqual(track.closed,false,'Explicitly open tracks are not valid A/B laps');
 const old=simulate(track,false),next=simulate(track,true);
 totalLegacy+=old.seconds;totalExpert+=next.seconds;
 const gap=100*(next.seconds/old.seconds-1);
 const lineGain=100*(1-next.meanError/old.meanError);
 console.log(
  entry.name.padEnd(18),
  'old='+old.seconds.toFixed(2)+'s',
  'expert='+next.seconds.toFixed(2)+'s',
  'delta='+gap.toFixed(1)+'%',
  'error='+old.meanError+' -> '+next.meanError,
  'max='+old.maxError+' -> '+next.maxError);
 assert.ok(next.seconds<=old.seconds*1.035,
  'Expert cannot lose >3.5% of lap pace on '+entry.name);
 assert.ok(next.meanError<=old.meanError*.83,
  'Expert must noticeably reduce mean tracking error on '+entry.name);
 // Official track installers alter resampling and curvature near isolated
 // points. Require no WORSE peak error, while demanding a substantial mean
 // error reduction and a smaller off-line fraction on every tested layout.
 assert.ok(next.maxError<=old.maxError+1e-6,
  'Expert must not increase worst-case line error on '+entry.name);
 assert.ok(next.wideFraction<=old.wideFraction,
  'Expert must not increase overwide driving on '+entry.name);
 results.push({track:entry.path,old,next,deltaPercent:+gap.toFixed(2),
  meanErrorReductionPercent:+lineGain.toFixed(2)});
}
assert.ok(totalExpert<totalLegacy*.98,
 'New Expert must be >=2% faster in aggregate in the A/B baseline');
console.log('PASS: LIVE 4 Expert track-curvature A/B',JSON.stringify({
 reference:'headless 60 Hz, 1 synthetic lap per track',
 aggregateOldSeconds:+totalLegacy.toFixed(2),
 aggregateExpertSeconds:+totalExpert.toFixed(2),
 results
}));

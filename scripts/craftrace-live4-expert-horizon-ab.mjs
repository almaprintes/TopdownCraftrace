// Headless LIVE 4 adaptive aim A/B. One shared physics model and identical
// speed profile in each pair. No fake grip/speed/latency advantages.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../src/game/ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../src/game/ai/raceAiController.js';
const TRACKS=['santa-cruz','track01','karting-tenerife','technical-ridge'];
const DT=1/60,MAX_FRAMES=60*180;
const maxFwd=420,accel=520,brakeForce=720,turnRate=2.4;
const round=(v,n=2)=>+v.toFixed(n);
function simulate(track,adaptive){
  const line=buildTrackRacingLineModel({
    raceCenterline:track.centerline,trackWidth:track.trackWidth
  },{apexCommitment:.22});
  assert.ok(line.valid,'Valid racing line required');
  const profile=buildTrackManeuverPlan(buildTrackSpeedProfile(line,{
    maxSpeed:maxFwd,lateralAccel:2050,minCornerSpeed:80,maxYawRate:turnRate,
    curvatureSmoothWindow:21,driveAccel:accel,brakeDecel:brakeForce
  }));
  assert.ok(profile.valid,'Valid Expert speed profile required');
  profile.live4CurveComplexity=adaptive?line.metrics.meanAbsCurvature:0;
  const boost=Math.min(1,Math.max(0,(profile.live4CurveComplexity-.050)/.005));
  const samples=profile.samples, n=samples.length;
  const body={x:samples[0].x,y:samples[0].y,
    rotation:Math.atan2(samples[4].y-samples[0].y,samples[4].x-samples[0].x),
    body:{velocity:{x:0,y:0}}};
  const bot={plannerBody:body,_plannerSampleIndex:0};
  let progress=0,last=0,sum=0,peak=0,wide=0;
  for(let frame=0;frame<MAX_FRAMES;frame++){
    const report=updateRacePhysicalBot(bot,profile,{
      dt:DT,spacing:line.spacing,maxFwd,cornerRisk:.35,
      accel,brakeForce,turnRate,linearDrag:.004,steering:{},
      live4PrecisionCornering:true
    });
    assert.ok(report.valid,'Expert must produce valid controls');
    body.x+=body.body.velocity.x*DT;
    body.y+=body.body.velocity.y*DT;
    assert.ok(Number.isFinite(body.x)&&Number.isFinite(body.y),
      'Physics cannot produce NaN or infinite position');
    let step=report.nearestIndex-last;
    if(step<-n/2)step+=n;
    if(step>n/2)step-=n;
    if(step>0&&step<Math.min(50,n*.12))progress+=step;
    last=report.nearestIndex;
    sum+=report.distanceToLine;
    peak=Math.max(peak,report.distanceToLine);
    if(report.distanceToLine>35)wide++;
    if(progress>=n)return{
      seconds:round((frame+1)*DT),
      meanError:round(sum/(frame+1)),
      maxError:round(peak),
      wideFraction:round(wide/(frame+1),3),
      aimBoost:round(boost,3),complexity:round(line.metrics.meanAbsCurvature,4)
    };
  }
  throw Error('AI did not complete synthetic lap within 180 seconds');
}
const comparisons=[];
let baseTotal=0,candidateTotal=0,improved=0;
for(const key of TRACKS){
  const track=JSON.parse(readFileSync(
    'src/game/tracks/library/'+key+'/track.json','utf8'));
  const base=simulate(track,false),candidate=simulate(track,true);
  baseTotal+=base.seconds;candidateTotal+=candidate.seconds;
  const active=candidate.aimBoost>.01;
  if(candidate.seconds<base.seconds-.05)improved++;
  assert.ok(candidate.seconds<=base.seconds*1.025,
    'Adaptive Expert cannot sacrifice >2.5% time on '+key);
  assert.ok(candidate.maxError<=base.maxError*1.15+.1,
    'Adaptive Expert must not turn a corner into a large overrun on '+key);
  assert.ok(candidate.wideFraction<=base.wideFraction+.025,
    'Adaptive Expert cannot markedly increase off-line driving on '+key);
  if(!active)assert.deepEqual(
    {...base,aimBoost:candidate.aimBoost,complexity:candidate.complexity},
    candidate,'Unchanged circuits must remain literally identical: '+key);
  console.log(key,JSON.stringify({base,candidate,
    deltaPct:round(100*(candidate.seconds/base.seconds-1))}));
  comparisons.push({track:key,base,candidate});
}
assert.ok(candidateTotal<=baseTotal*1.005,
  'Adaptive AI cannot be slower across all tracks');
assert.ok(improved>=1||comparisons.every(x=>x.candidate.aimBoost<.01),
  'Expected one physically faster technical circuit when adaptive steering engages');
console.log('PASS LIVE 4 ADAPTIVE Expert horizon A/B',JSON.stringify({
  physics:'identical Gripline test envelope; synthetic 60 Hz',
  totalBaselineSeconds:round(baseTotal),
  totalCandidateSeconds:round(candidateTotal),
  comparisons
}));

// Instrument A/B/G preview planning on the installed official Santa Cruz.
// Do not assert time improvements: these are projected speeds, NOT driven times.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildGuidedTrackRacingLineModel}
 from '../src/game/ai/trackGuidedRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
import {resolveDirectorGuideSource}
 from '../src/game/online/craftraceDirectorGuideSource.js';

const track=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
assert.equal(track.meta?.sourceFile,'Santa-Cruz-x3-nitido.tdrtrack');
const source=resolveDirectorGuideSource({meta:track});
const geometry={raceCenterline:track.raceCenterline||track.centerline,
 trackWidth:track.trackWidth};
const b=buildTrackRacingLineModel(geometry,{apexCommitment:.22,racecraftPreview:true});
const guided=buildGuidedTrackRacingLineModel(b,source.guides,source.shape,
 source.dimensions,{carRadius:14,recoveryMargin:8});
assert.ok(b.valid&&guided.report.active);
const g=guided.model;
const profileOpts={maxSpeed:420,lateralAccel:2050,minCornerSpeed:80,
 maxYawRate:2.4,curvatureSmoothWindow:21,driveAccel:520,brakeDecel:720};
const pb=buildTrackSpeedProfile(b,profileOpts),pg=buildTrackSpeedProfile(g,profileOpts);
assert.ok(pb.valid&&pg.valid);
function summarize(line,profile){
 const path=line.racingLine;
 let actualLength=0,physicsSeconds=0;
 for(let i=0;i<path.length;i++){
  const next=(i+1)%path.length;
  const dist=Math.hypot(path[next].x-path[i].x,path[next].y-path[i].y);
  actualLength+=dist;
  physicsSeconds+=dist/Math.max(1,(profile.samples[i].targetSpeed+
    profile.samples[next].targetSpeed)*.5);
 }
 const speeds=profile.samples.map(x=>x.targetSpeed);
 const vlow=speeds.filter(v=>v<200).length;
 const curvs=line.curvature.map(v=>Math.abs(v));
 return{lengthPx:+actualLength.toFixed(2),
  projectedTimeSeconds:+physicsSeconds.toFixed(3),
  plannerTimeSeconds:+profile.metrics.estimatedLapSeconds.toFixed(3),
  avgTargetSpeed:+profile.metrics.meanTargetSpeed.toFixed(2),
  minTargetSpeed:+profile.metrics.minTargetSpeed.toFixed(2),
  lowSpeedPct:+(100*vlow/path.length).toFixed(1),
  meanTurnAngle:+(curvs.reduce((a,v)=>a+v,0)/curvs.length).toFixed(5),
  maxTurnAngle:+Math.max(...curvs).toFixed(5),
  brakePct:+(100*profile.metrics.brakingFraction).toFixed(1)};
}
const result={track:'Santa Cruz official',guides:guided.report.accepted,
 safeSamplesModified:guided.report.changedSamples,
 b:summarize(b,pb),g:summarize(g,pg)};
result.difference={
 lengthPercent:+(100*(result.g.lengthPx/result.b.lengthPx-1)).toFixed(2),
 projectedTimeSeconds:+(result.g.projectedTimeSeconds-result.b.projectedTimeSeconds).toFixed(3),
 meanTargetSpeedPercent:+(100*(result.g.avgTargetSpeed/result.b.avgTargetSpeed-1)).toFixed(2),
 meanTurnAnglePercent:+(100*(result.g.meanTurnAngle/result.b.meanTurnAngle-1)).toFixed(2)
};
console.log('CRAFT RACE G PACE AUDIT',JSON.stringify(result));
console.log('PASS plan-only B vs G pace audit (not a substitute for driving)');

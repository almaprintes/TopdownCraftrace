// Only opt-in calibration candidate: compare six dice using exact same
// oscillation phase, safe amplitude and physical track. Does not change runtime.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildBezierAiRacingLineModel,buildBezierDieVariant}
 from '../src/game/ai/trackBezierAiRacingLinePlanner.js';
import {resolveDirectorGuideSource} from '../src/game/online/craftraceDirectorGuideSource.js';
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias-4096/track.json','utf8'));
const source=resolveDirectorGuideSource({meta:{...track,id:'karting-canarias-4096'}});
const baseModel=buildTrackRacingLineModel({raceCenterline:track.centerline,trackWidth:track.trackWidth},{apexCommitment:.22});
const base=buildBezierAiRacingLineModel(baseModel,source.bezier,source.shape,source.dimensions,{carRadius:14});
assert.equal(base.report.active,true);
const amplitudes={1:26,2:20,3:13,4:9,5:2.5,6:0};
const all=[];
for(const seat of [1,2,3]){
 const rows=[];
 for(const face of [1,2,3,4,5,6]){
  const v=buildBezierDieVariant(base.model,face,seat,source.shape,source.dimensions,
   {carRadius:14,monotoneCalibration:true});
  const px=Number(v.metrics?.dieVariationPx||0);
  assert.ok(Number.isFinite(px)&&px>=0);
  const actualMean=v.racingLine.reduce((acc,p,i)=>{
   const ref=base.model.racingLine[i];
   return acc+Math.hypot(p.x-ref.x,p.y-ref.y);
  },0)/v.racingLine.length;
  rows.push({face,seat,px:Number(px.toFixed(4)),meanRoutePx:Number(actualMean.toFixed(4))});
 }
 for(let i=1;i<6;i++){
  assert.ok(rows[i-1].px>=rows[i].px,
   'Nominal amplitude must decrease with each better die '+JSON.stringify(rows));
  assert.ok(rows[i-1].meanRoutePx+1e-6>=rows[i].meanRoutePx,
   'Actual Bézier deviation must decrease with each better die '+JSON.stringify(rows));
 }
 assert.ok(rows[0].px>rows[1].px,'Worst face must have stronger correction than 2');
 assert.equal(rows[5].px,0);
 all.push(...rows);
}
console.log('PASS monotone G die severity per seat / all six faces: '+JSON.stringify(all));

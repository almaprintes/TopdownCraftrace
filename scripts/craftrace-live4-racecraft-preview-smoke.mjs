// DEV-only exploratory A/B: distinguish planned road-center tracking from
// bounded outer-entry/apex/outer-exit targets. No production AI promotion.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';
const files=['santa-cruz','track01','karting-tenerife','technical-ridge'];
for(const key of files){
 const track=JSON.parse(readFileSync('src/game/tracks/library/'+key+'/track.json','utf8'));
 const geom={raceCenterline:track.centerline,trackWidth:track.trackWidth};
 const a=buildTrackRacingLineModel(geom,{apexCommitment:.22});
 const b=buildTrackRacingLineModel(geom,{apexCommitment:.22,racecraftPreview:true});
 assert.ok(a.valid&&b.valid);
 assert.equal(a.racingLine.length,b.racingLine.length);
 assert.ok(!a.metrics.racecraftPreview&&b.metrics.racecraftPreview);
 assert.ok(b.offsets.every((v,i)=>Number.isFinite(v)&&
   Math.abs(v)<=b.limits[i]+1e-5),'A/B can never exceed its safe lateral corridor');
 assert.ok(b.metrics.minBoundaryClearance>=b.metrics.safetyMargin-1e-5);
 const deviations=b.offsets.map((v,i)=>Math.abs(v-a.offsets[i]));
 const maxShift=Math.max(...deviations);
 assert.ok(maxShift>1,'Experimental geometry must visibly differ from baseline '+key);
 const profile=buildTrackSpeedProfile(b,{maxSpeed:420,lateralAccel:2050,
   minCornerSpeed:80,maxYawRate:2.4,curvatureSmoothWindow:21,
   driveAccel:520,brakeDecel:720});
 assert.ok(profile.valid,'No NaN target speed on '+key);
 assert.ok(profile.samples.every(s=>s.targetSpeed<=420&&s.targetSpeed>=0),
  'Experimental geometry cannot change physical max speed');
 console.log('A/B RACECRAFT',key,JSON.stringify({
  maxShiftPx:+maxShift.toFixed(2),
  meanShiftPx:+(deviations.reduce((a,b)=>a+b,0)/deviations.length).toFixed(2),
  safeClearancePx:+b.metrics.minBoundaryClearance.toFixed(2),
  maxTargetSpeed:+profile.metrics.maxTargetSpeed.toFixed(2)
 }));
}
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const preview=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
assert.ok(director.includes('if(preview){')&&
 director.includes('setPreviewRacecraft(enabled)')&&
 director.includes('if(!this.preview||this.raceStarted'),
 'Racecraft cannot activate in hosted online races or after green light');
for(const marker of ['data-mode','data-lines','paintLines','captureTrails','lineGraphics.destroy'])
 assert.ok(preview.includes(marker),'Director overlay missing '+marker);
console.log('PASS racecraft A/B is local-preview-only; geometry and overlays bounded');

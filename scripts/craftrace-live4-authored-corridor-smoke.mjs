// LIVE 4 Realizador B: boundary verification on installed photographic track.
// This is NOT a production-line homologation or a physics/collision test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {constrainRacecraftToAuthoredEdges} from '../src/game/ai/trackAuthoredCorridor.js';
import {buildTrackSpeedProfile} from '../src/game/ai/trackSpeedProfilePlanner.js';

function pct(line){
 return Math.round(100*line.offsets.reduce((a,v,i)=>
  a+Math.abs(v)/Math.max(1,line.limits[i]),0)/line.offsets.length);
}
const key='santa-cruz';
const track=JSON.parse(readFileSync('src/game/tracks/library/'+key+'/track.json','utf8'));
assert.equal(track.meta?.sourceFile,'Santa-Cruz-x3-nitido.tdrtrack',
 'Run this smoke AFTER the official photo installer');
const geom={raceCenterline:track.centerline,trackWidth:track.trackWidth};
const a=buildTrackRacingLineModel(geom,{apexCommitment:.22});
const experimental=buildTrackRacingLineModel(geom,{
 apexCommitment:.22,racecraftPreview:true});
assert.ok(a.valid&&experimental.valid);
const {model:b,report}=constrainRacecraftToAuthoredEdges(
 experimental,track.trackShape,{carRadius:14,reservePx:14});
console.log('LIVE4 AUTHORED ROAD',JSON.stringify({
 geometry:track.meta.sourceFile,referenceNodes:track.centerline.length,
 baselineTargetPct:pct(a),unboundedPreviewPct:pct(experimental),
 boundedPreviewPct:pct(b),...report
}));
assert.ok(report.applied,'Real Santa Cruz Bézier corridor must be complete');
assert.ok(report.coveragePct>=95,'Need >=95% road cross-section coverage');
assert.ok(report.minClearancePx>=27.5,'Body radius plus tracking reserve must fit');
assert.ok(b.valid&&b.racingLine.length===a.racingLine.length);
assert.ok(b.offsets.every((v,i)=>Math.abs(v)<=b.limits[i]+1e-7));
assert.ok(b.racingLine.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
const speed=buildTrackSpeedProfile(b,{maxSpeed:420,lateralAccel:2050,
 minCornerSpeed:80,maxYawRate:2.4,curvatureSmoothWindow:21,
 driveAccel:520,brakeDecel:720});
assert.ok(speed.valid);
assert.ok(speed.samples.every(x=>x.targetSpeed<=420&&x.targetSpeed>=0));
const online=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
assert.ok(online.includes('if(preview&&this.previewExpertLine?.valid)'));
assert.ok(online.includes('this.standardExpertLine=expertLine'));
assert.ok(online.includes('if(!this.preview||this.raceStarted'));
console.log('PASS authored Bézier corridor used only in DEV preview B');

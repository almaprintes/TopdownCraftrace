import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {measureLateralUse} from '../src/game/online/craftraceRacingLineTelemetry.js';
import {summarizePlannedLateral,samplePlannedVsReal}
 from '../src/game/online/craftraceLive4LineTrackingAudit.js';

const square={centerline:[
 {x:0,y:0,width:100},{x:100,y:0,width:100},
 {x:100,y:100,width:100},{x:0,y:100,width:100}
],trackWidth:100};
const synth=buildTrackRacingLineModel(square,{apexCommitment:.22});
assert.ok(synth.valid);
assert.ok(summarizePlannedLateral(synth)?.samples>0);
const p=synth.racingLine[9];
const measured=measureLateralUse(synth,p.x,p.y,9);
const compared=samplePlannedVsReal(synth,measured);
assert.ok(compared);
assert.ok(compared.errorFraction<.16,'A perfectly followed sampled path should have limited geometric projection error');

for(const key of ['santa-cruz','track01','karting-tenerife','technical-ridge']){
 const track=JSON.parse(readFileSync('src/game/tracks/library/'+key+'/track.json','utf8'));
 const geometry={raceCenterline:track.centerline,trackWidth:track.trackWidth};
 const a=buildTrackRacingLineModel(geometry,{apexCommitment:.22});
 const b=buildTrackRacingLineModel(geometry,{apexCommitment:.22,racecraftPreview:true});
 assert.ok(a.valid&&b.valid);
 const baseline=summarizePlannedLateral(a),alternative=summarizePlannedLateral(b);
 assert.ok(baseline?.meanPct>=0&&baseline.meanPct<=100);
 assert.ok(alternative?.meanPct>=0&&alternative.meanPct<=100);
 console.log('[LIVE 4 LINE PLAN]',key,JSON.stringify({
  baselineTargetPct:baseline.meanPct,experimentalTargetPct:alternative.meanPct,
  baselineMaxPct:baseline.maxPct,experimentalMaxPct:alternative.maxPct
 }));
}
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(director.includes('samplePlannedVsReal(candidate,occupied)'));
assert.ok(director.includes('targetMeanPct:'));
assert.ok(director.includes('followMeanErrorPct:'));
assert.ok(bridge.includes('OBJETIVO LATERAL')&&bridge.includes('ERROR SEGUIMIENTO'));
assert.ok(director.includes('preview?buildTrackRacingLineModel'));
assert.ok(director.includes('if(!this.preview||this.raceStarted'));
console.log('PASS LIVE 4 measured path vs planned path is read-only and B stays preview-only');

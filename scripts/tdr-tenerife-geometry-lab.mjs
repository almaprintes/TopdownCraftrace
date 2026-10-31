import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {buildTenerifeJudgeGeometry,reviewTenerifeGhost}
  from '../src/game/online/serverGeometryJudge.js';
import {sampleLoopAt} from '../src/game/tracks/closedCircuitGateOrder.js';
import {encodeOnlineGhostNative,decodeOnlineGhostNative} from '../src/game/online/onlineGhostCodec.js';

const source=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
const official=buildTenerifeJudgeGeometry(source);
const clockwise=buildTenerifeJudgeGeometry(source,{trackId:'karting-tenerife-horario'});
assert.equal(clockwise.trackId,'karting-tenerife-horario');
assert.equal(clockwise.checkpoints.length,2);
assert.notEqual(clockwise.geometrySha256,official.geometrySha256,
  'Clockwise edition must have independent trusted geometry identity');
for(let i=0;i<2;i++){
  const other=official.checkpoints[1-i];
  const inverted=clockwise.checkpoints[i];
  assert.deepEqual(inverted.a,other.a);
  assert.deepEqual(inverted.b,other.b);
  assert.equal(inverted.normal.x,-other.normal.x);
  assert.equal(inverted.normal.y,-other.normal.y);
}
assert.equal(clockwise.finishLine.normal.x,-official.finishLine.normal.x);
assert.equal(clockwise.finishLine.normal.y,-official.finishLine.normal.y);
assert.equal(official.trackId,'karting-tenerife');
assert.match(official.geometrySha256,/^[0-9a-f]{64}$/);
assert.equal(official.checkpoints.length,2);
const {metrics,anchorDistance}=official;
assert.ok(metrics.total>1000,'Actual karting course must be nontrivial');

function recording({from=.008,to=1.008,number=850,wrongWay=false,
  trackId='karting-tenerife'}={}){
  const direction=(trackId==='karting-tenerife-horario'?-1:1)*(wrongWay?-1:1);
  const samples=Array.from({length:number},(_,i)=>{
    const progress=from+(to-from)*i/(number-1);
    const p=sampleLoopAt(metrics,anchorDistance+metrics.total*direction*progress);
    return {t:i*50,x:p.x,y:p.y,
      r:Math.atan2(direction*p.tangent.y,direction*p.tangent.x)};
  });
  const src={lapMs:samples.at(-1).t,trackKey:trackId,
    carId:'avenir_gripline',samples};
  // Analyse actual quarter-pixel/angle/time quantization, not ideal float paths.
  return decodeOnlineGhostNative(encodeOnlineGhostNative(src));
}
const good=recording();
const clean=reviewTenerifeGhost(good,official);
assert.equal(clean.status,'pass','One complete exact-centerline circuit must pass: '+JSON.stringify(clean));
assert.equal(clean.diagnostics.gateSequenceReached,2);
assert.equal(clean.diagnostics.finishSeen,true);
assert.ok(clean.diagnostics.coverageBins>=10);
console.log('CLEAN '+JSON.stringify(clean.diagnostics));

const goodClockwise=recording({trackId:'karting-tenerife-horario'});
const cleanClockwise=reviewTenerifeGhost(goodClockwise,clockwise);
assert.equal(cleanClockwise.status,'pass',
  'Clockwise centerline lap must cross reversed CP2→CP1→finish: '+JSON.stringify(cleanClockwise));
assert.equal(cleanClockwise.diagnostics.coverageBins,12);
assert.equal(cleanClockwise.diagnostics.gateSequenceReached,2);
assert.equal(cleanClockwise.diagnostics.finishSeen,true);
assert.equal(cleanClockwise.diagnostics.variant,'clockwise');
assert.ok(cleanClockwise.diagnostics.max100msSpeedPxPerSecond<2500);
console.log('CLOCKWISE '+JSON.stringify(cleanClockwise.diagnostics));

const skipped=recording({from:.008,to:.52,number:380});
const skipVerdict=reviewTenerifeGhost(skipped,official);
assert.equal(skipVerdict.status,'review','Partial circuit must not be homologated');
assert.ok(skipVerdict.reasons.includes('missing_checkpoint')||skipVerdict.reasons.includes('finish_not_observed'));

const reverse=reviewTenerifeGhost(recording({wrongWay:true}),official);
assert.equal(reverse.status,'review','Wrong-direction replay must be reviewed');
assert.ok(reverse.reasons.includes('missing_checkpoint')||reverse.reasons.includes('finish_not_observed'));

const reverseClockwise=reviewTenerifeGhost(
  recording({trackId:'karting-tenerife-horario',wrongWay:true}),clockwise);
assert.equal(reverseClockwise.status,'review',
  'Clockwise gate direction must reject the legacy direction');
assert.ok(reverseClockwise.reasons.includes('missing_checkpoint')||
  reverseClockwise.reasons.includes('finish_not_observed'));
assert.deepEqual(reviewTenerifeGhost(good,clockwise).reasons,['track_mismatch'],
  'A legacy ghost cannot be homologated under a clockwise track identity');

const spliced=structuredClone(good);
const jumpEnd=Math.floor(spliced.samples.length*.58);
spliced.samples.splice(Math.floor(spliced.samples.length*.40),
  jumpEnd-Math.floor(spliced.samples.length*.40));
const cut=reviewTenerifeGhost(spliced,official);
assert.equal(cut.status,'review','Shortcuts must not be homologated without review');
assert.ok(cut.reasons.includes('road_corridor_anomaly')||
  cut.reasons.includes('route_jump')||cut.reasons.includes('missing_checkpoint'));

const teleport=structuredClone(good);
const jumpIndex=Math.floor(teleport.samples.length*.43);
teleport.samples[jumpIndex].x+=1100;
teleport.samples[jumpIndex].y+=400;
const teleportCheck=reviewTenerifeGhost(teleport,official);
assert.equal(teleportCheck.status,'review',
  'Sudden displacement must lead to shadow review only');
assert.ok(teleportCheck.reasons.includes('motion_anomaly_needs_physics_review'));
assert.ok(teleportCheck.diagnostics.max100msSpeedPxPerSecond>2500);
const tinyClockJitter=structuredClone(good);
tinyClockJitter.samples[12].t=tinyClockJitter.samples[11].t+1;
const jitterCheck=reviewTenerifeGhost(tinyClockJitter,official);
assert.equal(jitterCheck.status,'pass',
  '1-ms timestamp jitter does not automatically constitute cheating');
assert.equal(jitterCheck.diagnostics.shortTimestampGaps>0,true);

const changedTrack=structuredClone(good);changedTrack.trackKey='karting-americas';
assert.deepEqual(reviewTenerifeGhost(changedTrack,official).reasons,['track_mismatch']);
const alteredTimes=structuredClone(good);alteredTimes.samples[9].t=alteredTimes.samples[8].t;
assert.equal(reviewTenerifeGhost(alteredTimes,official).status,'invalid');
const fakeFinish=structuredClone(good);fakeFinish.lapMs-=10;
assert.equal(reviewTenerifeGhost(fakeFinish,official).status,'invalid');
const changedGeometry=structuredClone(source);
changedGeometry.centerline[0].x+=2;
assert.notEqual(buildTenerifeJudgeGeometry(changedGeometry).geometrySha256,official.geometrySha256,
  'An altered published road must produce another audit identifier');

console.log('PASS: Tenerife legacy+clockwise; ordered gates, world corridor, cuts, teleport telemetry, timing jitter, forged time/track; SHADOW-ONLY.');
console.log('ROAD LENGTH '+Math.round(metrics.total)+' world px; geometry '+official.geometrySha256.slice(0,16));
if(process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n## TDR Phase 2: Geometry shadow judge\n'+
    '- Exact official Karting Tenerife source + native quarter-pixel ghost encoder.\n'+
    '- Both Tenerife official directions, skipped checkpoints, reverse, shortcut, forged identity/time.\n'+
    '- Teleport flagged for review; 1-ms timestamp jitter is not automatically penalized.\n'+
    '- No player records read or changed; SHADOW, not production anticheat.\n'+
    '- SHA-256 of trusted geometry: '+official.geometrySha256+'\n');
}

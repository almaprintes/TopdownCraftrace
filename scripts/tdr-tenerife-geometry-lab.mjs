import assert from 'node:assert/strict';
import {readFileSync,appendFileSync} from 'node:fs';
import {buildTenerifeJudgeGeometry,reviewTenerifeGhost}
  from '../src/game/online/serverGeometryJudge.js';
import {sampleLoopAt} from '../src/game/tracks/closedCircuitGateOrder.js';
import {encodeOnlineGhostNative,decodeOnlineGhostNative} from '../src/game/online/onlineGhostCodec.js';

const source=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
const official=buildTenerifeJudgeGeometry(source);
assert.equal(official.trackId,'karting-tenerife');
assert.match(official.geometrySha256,/^[0-9a-f]{64}$/);
assert.equal(official.checkpoints.length,2);
const {metrics,anchorDistance}=official;
assert.ok(metrics.total>1000,'Actual karting course must be nontrivial');

function recording({from=.008,to=1.008,number=850,wrongWay=false}={}){
  const samples=Array.from({length:number},(_,i)=>{
    const progress=from+(to-from)*i/(number-1);
    const p=sampleLoopAt(metrics,anchorDistance+metrics.total*(wrongWay?-progress:progress));
    return {t:i*50,x:p.x,y:p.y,r:Math.atan2(p.tangent.y,p.tangent.x)};
  });
  const src={lapMs:samples.at(-1).t,trackKey:'karting-tenerife',
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

const skipped=recording({from:.008,to:.52,number:380});
const skipVerdict=reviewTenerifeGhost(skipped,official);
assert.equal(skipVerdict.status,'review','Partial circuit must not be homologated');
assert.ok(skipVerdict.reasons.includes('missing_checkpoint')||skipVerdict.reasons.includes('finish_not_observed'));

const reverse=reviewTenerifeGhost(recording({wrongWay:true}),official);
assert.equal(reverse.status,'review','Wrong-direction replay must be reviewed');
assert.ok(reverse.reasons.includes('missing_checkpoint')||reverse.reasons.includes('finish_not_observed'));

const spliced=structuredClone(good);
const jumpEnd=Math.floor(spliced.samples.length*.58);
spliced.samples.splice(Math.floor(spliced.samples.length*.40),
  jumpEnd-Math.floor(spliced.samples.length*.40));
const cut=reviewTenerifeGhost(spliced,official);
assert.equal(cut.status,'review','Shortcuts must not be homologated without review');
assert.ok(cut.reasons.includes('road_corridor_anomaly')||
  cut.reasons.includes('route_jump')||cut.reasons.includes('missing_checkpoint'));

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

console.log('PASS: Karting Tenerife official gate order, complete route, reverse, cuts, forged time/track; SHADOW-ONLY.');
console.log('ROAD LENGTH '+Math.round(metrics.total)+' world px; geometry '+official.geometrySha256.slice(0,16));
if(process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n## TDR Phase 2: Geometry shadow judge\n'+
    '- Exact official Karting Tenerife source + native quarter-pixel ghost encoder.\n'+
    '- Complete lap, skipped checkpoints, reverse, shortcut, forged identity/time.\n'+
    '- No player records read or changed; SHADOW, not production anticheat.\n'+
    '- SHA-256 of trusted geometry: '+official.geometrySha256+'\n');
}

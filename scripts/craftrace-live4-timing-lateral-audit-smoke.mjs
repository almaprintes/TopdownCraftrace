import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLive4TimingAudit,observeLive4Timing,summarizeLive4Timing}
 from '../src/game/online/craftraceLive4TimingAudit.js';
let a=makeLive4TimingAudit();
for(let i=0;i<60;i++)observeLive4Timing(a,1000/60);
let r=summarizeLive4Timing(a);
assert.equal(r.frames,60);
assert.equal(r.hitches,0);
assert.equal(r.droppedSeconds,0);
assert.equal(r.wallSeconds,1);
let b=makeLive4TimingAudit();
for(let i=0;i<12;i++)observeLive4Timing(b,1000/60);
observeLive4Timing(b,320);
r=summarizeLive4Timing(b);
assert.equal(r.hitches,1);
assert.ok(r.droppedSeconds>=.27);
assert.ok(r.maxFrameMs===320);
// Measurement code must never rescale or silently approve finish time.
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
for(const key of ['observeLive4Timing(this.timingAudit','measureLateralUse(candidate',
  'lateralMeanPct','timing:summarizeLive4Timing(this.timingAudit)'])
 assert.ok(director.includes(key),'Missing host diagnostic '+key);
assert.ok(bridge.includes('OBJETIVO LATERAL')&&
 bridge.includes('ERROR SEGUIMIENTO')&&bridge.includes('IA HITCH'));
assert.ok(bridge.includes('elapsedMs:bot.elapsedMs'),
 'Results should remain physical-gate elapsed time');
console.log('PASS LIVE 4: frame-time debt + physical lateral occupancy are read-only');

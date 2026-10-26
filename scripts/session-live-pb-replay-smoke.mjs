import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localRecordGhost} from '../src/game/ui/sessionPersonalBestPublish.js';
import {ghostGeometryRevision,ghostReplayCompatibility} from '../src/game/tracks/ghostTrackCompatibility.js';

const id='circuito-atlantico',car='avenir_gripline',ms=11485;
const track={worldW:2000,worldH:1800,trackWidth:120,
  centerline:Array.from({length:24},(_,i)=>({x:200+i*60,y:250+i*35})),
  finishLine:{a:{x:220,y:210},b:{x:240,y:290}},meta:{imageNative:{worldScale:.7}}};
const revision=ghostGeometryRevision(id,track);
assert.ok(revision?.startsWith('geo1:'));
const ghost={version:5,trackKey:id,carId:car,lapMs:ms,geometryRevision:revision,
  recordedAt:Date.now(),samples:Array.from({length:120},(_,i)=>({t:i*95,x:220+i*12,y:300+i*9,r:0}))};
assert.equal(ghostReplayCompatibility(ghost,id,track).compatible,true);
globalThis.localStorage={getItem(){throw Error('QuotaExceededError')}};
assert.equal(localRecordGhost(id,car,ms,ghost),ghost,'In-memory exact PB works without storage');
assert.equal(localRecordGhost(id,car,ms+1264,ghost),null,'Cannot replay prior PB');
assert.equal(localRecordGhost('santa-cruz',car,ms,ghost),null,'No cross-track mixing');
assert.equal(localRecordGhost(id,'helix_vortex',ms,ghost),null,'No cross-car mixing');
assert.equal(localRecordGhost(id,car,ms,{...ghost,samples:[]}),null);
assert.equal(localRecordGhost(id,car,ms,{...ghost,samples:[...ghost.samples.slice(1),{t:0,x:Infinity,y:0}]}),null);
assert.equal(ghostReplayCompatibility(ghost,id,{...track,worldW:1900}).compatible,false);
const source=readFileSync('src/game/scenes/RaceTop10ReplayScene.js','utf8');
const report=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
assert.match(source,/this\._tdrSessionExactPbReplay=null/);
assert.match(source,/this\._tdrSessionExactPbReplay=replay/);
assert.match(source,/geometryRevision:ghostGeometryRevision\(trackId,this\.track\)/);
assert.ok(source.indexOf('this._tdrSessionExactPbReplay=replay;')<source.indexOf('persistOfficialPersonalBestReplay({'));
assert.ok(report.includes('localRecordGhost(trackId,carId,best.lapMs,scene?._tdrSessionExactPbReplay)'));
assert.ok(report.includes('submitRaceControlRecordWithoutGhost({'),
  'Existing explicitly-consented no-ghost fallback is preserved');
console.log('PASS: exact PB replay survives storage quota, cannot mix times/cars/tracks or stale circuit geometry.');

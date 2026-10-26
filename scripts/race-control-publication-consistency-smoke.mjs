import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getCircuitRecord} from '../src/game/stats/localRaceRecords.js';
import {sessionPersonalBest} from '../src/game/ui/sessionPersonalBestPublish.js';

// Real reported scenario: new local PB 12.749 from 21.084, while the
// authenticated online account still owns 9.054 from a previous version.
assert.deepEqual(sessionPersonalBest({bestMs:12749,laps:[{lapMs:12749,valid:true}]},21084),
  {lapMs:12749,previousMs:21084,improvementMs:8335});

// Derived local index may be stale (or fail to persist when localStorage is
// full). The selected PB must be read from ttBest, like the Race Control hero.
const data=new Map([
  ['tdr2:raceRecords:v1',JSON.stringify({version:1,tracks:{'circuito-atlantico':{
    trackId:'circuito-atlantico',bestLapMs:21084}}})],
  ['tdr2:ttBest:circuito-atlantico',JSON.stringify({lapMs:12749,carId:'avenir_gripline'})],
  ['tdr2:ttHist:circuito-atlantico',JSON.stringify([{lapMs:12749,carId:'avenir_gripline',t:10}])]
]);
globalThis.localStorage={
  get length(){return data.size;},
  key:i=>[...data.keys()][i]??null,
  getItem:k=>data.get(k)??null,
  setItem:(k,v)=>{if(k==='tdr2:raceRecords:v1')throw new Error('QuotaExceededError');data.set(k,String(v));},
  removeItem:k=>data.delete(k)
};
assert.equal(getCircuitRecord('circuito-atlantico')?.bestLapMs,12749);
assert.equal(JSON.parse(data.get('tdr2:raceRecords:v1')).tracks['circuito-atlantico'].bestLapMs,21084,
  'The stale cache is reproduced; the authoritative getter must ignore it');

const read=path=>readFileSync(path,'utf8');
const replay=read('src/game/scenes/StatsBroadcastReplayScene.js');
const stats=read('src/game/scenes/StatsBroadcastScene.js');
const report=read('src/game/ui/sessionRecordPublishOffer.js');
const online=read('src/game/online/raceControlOnline.js');
const video=read('src/game/scenes/StatsBroadcastRealReplayScene.js');
assert.match(replay,/_getSelectedRecord\(trackId\)\{return trackId\?getCircuitRecord\(trackId\):null;/,
  'Rivals, replay and hero must resolve the same local PB');
assert.match(online,/export async function getMyRaceControlRecord\(trackId\)/);
assert.match(online,/row\?\.scope==='global'&&row\?\.is_me===true/,
  'Never infer the online owner by nickname');
for(const source of [stats,report]){
  assert.match(source,/await getMyRaceControlRecord\(/);
  assert.ok(source.indexOf('await getMyRaceControlRecord(')<source.indexOf('await showRewardedAd('),
    'Verify existing online PB before a rewarded ad');
  assert.match(source,/row.improved!==true/,
    'A no-op server upsert is NOT a successful publication');
  assert.match(source,/No se ha/);
}
assert.match(stats,/PERSONAL BEST · LOCAL/);
assert.match(stats,/ONLINE '\+fmtLap\(onlineMine.best_time_ms\)/);
assert.match(video,/ghostReplayCompatibility\(ghost,row.track_id,TRACK_REGISTRY\[row.track_id\]\)/,
  'Before replay an existing online ghost, reject obsolete track coordinates');
console.log('PASS: 21.084 -> 12.749 local, 9.054 online, stale index, no-op submissions, no preflight ads, ghost geometry gate');

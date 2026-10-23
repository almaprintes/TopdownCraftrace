import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  RETIRED_TRACK_IDS,retiredTrackKeys,migrationMarker,archiveAndResetTracks
} from '../src/game/stats/archiveRetiredTrackRecords.js';
import {ghostGeometryRevision,ghostReplayCompatibility} from '../src/game/tracks/ghostTrackCompatibility.js';
import {persistOfficialPersonalBestReplay} from '../src/game/tracks/ghostReplayRecovery.js';

function fakeStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    map,get length(){return map.size;},
    key:i=>[...map.keys()][i]??null,
    getItem:k=>map.get(k)??null,
    setItem:(k,v)=>map.set(k,String(v)),
    removeItem:k=>map.delete(k)
  };
}
const unrelated={
  'tdr2:ttBest:karting-americas':'{"lapMs":17000}',
  'tdr2:ghostPb:karting-tenerife':'{"lapMs":18000}',
  'tdr2:topReplay:karting-canarias:lap':'unchanged',
  'tdr2:cloudBackup:test':'cloud-unsynced-progress',
  'tdr2:settings':'{"sound":true}',
  'tdr2:raceRecords:v1':'{"version":1,"tracks":{"karting-americas":{"lapMs":17000}}}'
};
const initial={...unrelated};
for(const id of RETIRED_TRACK_IDS){
  initial['tdr2:ttBest:'+id]='{"lapMs":12565}';
  initial['tdr2:ttHist:'+id]='{"v":1,"history":[{"lapMs":12565}]}';
  initial['tdr2:ghostPb:'+id]='{"samples":[1,2,3]}';
  initial['tdr2:ghost:'+id+':spark']='legacy replay';
  initial['tdr2:ghostGeometry:'+id+':geo1:old']='old-road ghost';
  initial['tdr2:topReplay:'+encodeURIComponent(id)+':lapA']='native replay';
}
const storage=fakeStorage(initial),archived=new Map();
assert.deepEqual(RETIRED_TRACK_IDS,[
 'santa-cruz','santa-cruz-inverso','circuito-atlantico','circuito-atlantico-inverso'
]);
assert.deepEqual(retiredTrackKeys(storage,'karting-americas'),[]);
const before=Object.fromEntries(storage.map);
let result=await archiveAndResetTracks({storage,archive:async(id,entries)=>{
 archived.set(id,{...archived.get(id),...entries});
}});
assert.equal(result.failed.length,0);
assert.equal(result.reset.length,4);
for(const id of RETIRED_TRACK_IDS){
 assert.equal(storage.getItem(migrationMarker(id)),'1');
 assert.deepEqual(retiredTrackKeys(storage,id),[]);
 const expected=retiredTrackKeys(fakeStorage(before),id);
 assert.equal(expected.length,6);
 for(const key of expected)assert.equal(archived.get(id)[key],before[key]);
}
for(const [key,value] of Object.entries(unrelated))
 assert.equal(storage.getItem(key),value,'An unrelated/online key was modified: '+key);
const twice=await archiveAndResetTracks({storage,archive:async()=>{throw Error('Must not archive twice');}});
assert.equal(twice.already.length,4);
assert.equal(twice.failed.length,0);

// If backup fails, NO RECORD from that circuit may be deleted. Other circuits
// may complete independently; do not conflate or mix their IDs.
const failedStore=fakeStorage(initial);
const failedArchives=new Map();
result=await archiveAndResetTracks({
 storage:failedStore,
 archive:async(id,entries)=>{
  if(id==='santa-cruz')throw Error('IDB quota / blocked');
  failedArchives.set(id,entries);
 }
});
assert.deepEqual(result.failed.map(x=>x.id),['santa-cruz']);
assert.equal(failedStore.getItem('tdr2:ttBest:santa-cruz'),'{"lapMs":12565}');
assert.equal(failedStore.getItem(migrationMarker('santa-cruz')),null);
assert.equal(failedStore.getItem(migrationMarker('santa-cruz-inverso')),'1');

// First valid lap of the new geometry creates an exact local PB ghost, and
// neither the old retired lap time nor a Race Control download is required.
const track={
 worldW:1900,worldH:2900,trackWidth:156,
 raceCenterline:Array.from({length:60},(_,i)=>({x:250+i*20,y:500,width:156})),
 finishLine:{a:{x:250,y:430},b:{x:250,y:570}},
 meta:{}
};
const samples=Array.from({length:60},(_,i)=>({t:i*300,x:260+i*19,y:500,r:0}));
const sampleRecord={lapMs:18000,carId:'spark',trackKey:'santa-cruz',
 samples,recordedAt:1792656000000,kind:'local-top10-lap'};
const fresh=fakeStorage({'tdr2:ttBest:santa-cruz':'{"lapMs":18000}'});
globalThis.localStorage=fresh;
const ttBest={lapMs:18000},ttKey='tdr2:ttBest:santa-cruz';
assert.equal(persistOfficialPersonalBestReplay({
 trackKey:'santa-cruz',track,lapMs:18000,
 replay:sampleRecord,ttKey,ttBest
}),true);
const saved=JSON.parse(fresh.getItem('tdr2:ghostPb:santa-cruz'));
assert.equal(saved.geometryRevision,ghostGeometryRevision('santa-cruz',track));
assert.equal(saved.kind,'circuit-personal-best');
assert.equal(ghostReplayCompatibility(saved,'santa-cruz',track).compatible,true);
assert.equal(ttBest.ghostKey,'tdr2:ghostPb:santa-cruz');
assert.equal(JSON.parse(fresh.getItem(ttKey)).lapMs,18000);

const sceneSource=readFileSync('src/game/scenes/RaceTop10ReplayScene.js','utf8');
const startup=readFileSync('src/main.js','utf8');
assert.match(sceneSource,/persistOfficialPersonalBestReplay\(\{/);
assert.match(startup,/archiveRetiredTrackRecords\(\)/);
assert.match(startup,/if\(!__tdrLocalTrackArchiveReady\)return;/);
assert.match(readFileSync('index.html','utf8'),
 /<meta name="tdr-dev-version" content="DEV 1\.3\.[5-9][0-9]*"/);
console.log('PASS: Retire only four local photo-track records after archived backup; one-time, idempotent, no online/unrelated mutation; fresh PB immediately has a local Ghost replay');

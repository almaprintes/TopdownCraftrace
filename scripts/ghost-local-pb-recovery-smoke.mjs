import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ghostGeometryRevision,ghostReplayCompatibility} from '../src/game/tracks/ghostTrackCompatibility.js';
import {findRaceControlGhost,persistOfficialPersonalBestReplay} from '../src/game/tracks/ghostReplayRecovery.js';

// Synthetic-only data. The smoke never uses a real account, record or backend.
const store=new Map();
globalThis.localStorage={
 get length(){return store.size;},
 key:i=>[...store.keys()][i]??null,
 getItem:key=>store.get(String(key))??null,
 setItem:(key,value)=>{store.set(String(key),String(value));},
 removeItem:key=>store.delete(String(key))
};
const track={
 worldW:1900,worldH:2900,trackWidth:156,
 raceCenterline:Array.from({length:61},(_,i)=>({x:200+i*20,y:500,width:156})),
 finishLine:{a:{x:200,y:420},b:{x:200,y:580}},
 meta:{}
};
const currentSamples=Array.from({length:40},(_,i)=>({
 t:i*55,x:220+i*29,y:500,r:0
}));
const oldSamples=currentSamples.map(p=>({...p,x:p.x+450,y:p.y+700}));
for(const id of ['santa-cruz','santa-cruz-inverso']){
 const current={trackKey:id,carId:'spark',lapMs:2200,samples:currentSamples};
 const old={...current,samples:oldSamples};
 assert.equal(ghostReplayCompatibility(current,id,track).compatible,true,
  id+' new race-space data must play');
 assert.equal(ghostReplayCompatibility(old,id,track).compatible,false,
  id+' displaced old ghost must not play');
 const revision=ghostGeometryRevision(id,track);
 assert.equal(ghostReplayCompatibility({...current,geometryRevision:revision},id,track).compatible,true);
 assert.equal(ghostReplayCompatibility({...current,geometryRevision:'geo1:old'},id,track).compatible,false);
}
for(const id of ['circuito-atlantico','circuito-atlantico-inverso']){
 const atlantic={...track,meta:{imageNative:{worldScale:.70}}};
 const current={trackKey:id,carId:'spark',lapMs:2200,samples:currentSamples};
 assert.equal(ghostReplayCompatibility(current,id,atlantic).compatible,true,
   id+' current 70% road samples must play without download');
 assert.equal(ghostReplayCompatibility({...current,samples:currentSamples.map(p=>({
    ...p,x:p.x/.70,y:p.y/.70
  }))},id,atlantic).compatible,false,
   id+' stale 100% replay must not be used');
}
const id='santa-cruz',ttKey='tdr2:ttBest:'+id;
const record={t:1720000000000,carId:'spark',lapMs:2200};
const replayKey='tdr2:topReplay:'+encodeURIComponent(id)+':'+encodeURIComponent(
 id+':'+record.carId+':'+record.t+':'+record.lapMs);
store.set('tdr2:ttHist:'+id,JSON.stringify({v:1,history:[record]}));
store.set(ttKey,JSON.stringify({lapMs:1800,carId:'spark'}));
const recorded={version:5,kind:'local-top10-lap',trackKey:id,carId:'spark',
 lapMs:2200,recordedAt:record.t,samples:currentSamples};
store.set(replayKey,JSON.stringify(recorded));
store.set('tdr2:ghostPb:'+id,JSON.stringify({...recorded,lapMs:1800,samples:oldSamples}));
// A malformed/stale Race Control index previously made the real replay invisible
// to Ghost mode, despite its valid, directly readable topReplay key.
store.set('tdr2:ttHist:'+id,JSON.stringify({v:1,history:[]}));
assert.equal(findRaceControlGhost(id,track,1800)?.ghost?.lapMs,2200,
  'Ghost mode must find actual topReplay even when Race Control index is empty');
store.set('tdr2:ttHist:'+id,JSON.stringify({v:1,history:[record]}));
let recovered=findRaceControlGhost(id,track,1800);
assert.equal(recovered?.ghost?.lapMs,2200,'Recover local Race Control replay automatically');
assert.equal(recovered?.isOfficialPb,false,'Do not rewrite the historic PB just to play a current lap');
assert.equal(JSON.parse(store.get(ttKey)).lapMs,1800,'Recovery is read-only');
store.set(ttKey,JSON.stringify({lapMs:2200,carId:'spark'}));
recovered=findRaceControlGhost(id,track,2200);
assert.equal(recovered?.ghost?.lapMs,2200);
assert.equal(recovered?.isOfficialPb,true,'Recognise exact on-device PB');
assert.equal(findRaceControlGhost('santa-cruz-inverso',track,2200),null,
 'Normal and inverse must not share local ghost recordings');
const best={lapMs:2200};
assert.equal(persistOfficialPersonalBestReplay({
 trackKey:id,track,lapMs:2200,replay:recorded,ttKey,ttBest:best
}),true,'New PB is saved locally without Race Control download');
const pb=JSON.parse(store.get('tdr2:ghostPb:'+id));
assert.equal(pb.kind,'circuit-personal-best');
assert.equal(pb.geometryRevision,ghostGeometryRevision(id,track));
assert.equal(pb.lapMs,2200);
assert.equal(best.ghostKey,'tdr2:ghostPb:'+id);
assert.equal(JSON.parse(store.get(ttKey)).lapMs,2200,'Historical lap time untouched');
assert.equal(persistOfficialPersonalBestReplay({
 trackKey:id,track,lapMs:1800,replay:recorded,ttKey,ttBest:best
}),false,'Cannot label a slower replay as the faster PB');
assert.equal(persistOfficialPersonalBestReplay({
 trackKey:'santa-cruz-inverso',track,lapMs:2200,replay:recorded,ttKey,ttBest:best
}),false,'Cannot store another circuit direction under this PB');
// Simulate a separate legacy installation that has no locally saved PB ghost.
store.delete('tdr2:ghostPb:'+id);
store.set(replayKey,JSON.stringify({...recorded,samples:oldSamples}));
assert.equal(findRaceControlGhost(id,track,2200),null,
 'Stale top-ten geometry must never be selected as personal best');

const source=readFileSync('src/game/scenes/RaceTop10ReplayScene.js','utf8');
const scene=readFileSync('src/game/scenes/RaceStaticGhostStatusScene.js','utf8');
const sectors=readFileSync('src/game/scenes/RaceReplayRealSectorsScene.js','utf8');
assert.match(source,/persistOfficialPersonalBestReplay\(\{/,
 'Top-ten recording must immediately persist exact PB on device');
assert.match(scene,/findRaceControlGhost\(key,this\.track,this\._tdrGhostKnownBestMs\)/);
assert.match(scene,/writePbGhost\(this\._tdrGeometryGhostStorageKey,current\)/);
assert.match(sectors,/if\(this\._onlineGhostChallenge\|\|!this\._ghostData\)return;/);
assert.ok(!sectors.includes('localStorage.setItem(this._ghostStorageKey'),
 'Sector metadata must never overwrite some other ghost key');
assert.match(sectors,/stored\.kind!==ghost\.kind/);
assert.match(readFileSync('index.html','utf8'),
 /<meta name="tdr-dev-version" content="DEV 1\.3\.3"/);
console.log('PASS: Santa Cruz Normal/Inverse old ghosts blocked; Race Control -> self ghost local recovery; on-device PB automatically saved; historic records and online rivals untouched');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBoundedOnlineGhostCache} from '../src/game/online/onlineGhostDownloadCache.js';

const ref='00000000-0000-4000-8000-000000000001';
const value={data:{record_ref:ref},ghost:{samples:[{t:0},{t:1},{t:2}]}};
const cache=createBoundedOnlineGhostCache({maxEntries:2,maxSamples:6});
let calls=0,release;
const first=cache.load(ref,()=>{calls++;return new Promise(r=>{release=r;});});
const simultaneous=cache.load(ref,()=>{calls++;throw Error('Should never be called');});
await Promise.resolve();
assert.equal(calls,1,'One in-flight Supabase download per record_ref');
assert.equal(cache.pendingCount(),1);
release(value);
const [a,b]=await Promise.all([first,simultaneous]);
assert.equal(a,b,'Concurrent Replay and VS share the exact decoded recording');
assert.equal(cache.pendingCount(),0,'In-flight promise released on success');
assert.equal(cache.size(),1);
assert.equal(cache.peek(ref),value,'A replay hit reuses bytes and decoded geometry');
assert.equal(await cache.load(ref,()=>{calls++;throw Error('Should be cached');}),value);
assert.equal(calls,1,'Replay after VS costs zero extra requests');

const next='00000000-0000-4000-8000-000000000002';
const third='00000000-0000-4000-8000-000000000003';
const ghostFor=id=>({data:{record_ref:id},ghost:{samples:[0,1,2].map(t=>({t}))}});
await cache.load(next,()=>ghostFor(next));
assert.equal(cache.size(),2);
assert.equal(cache.sampleCount(),6);
cache.peek(ref); // mark first record as recently used
await cache.load(third,()=>ghostFor(third));
assert.equal(cache.peek(next),null,'Evict least recently used recording');
assert.equal(cache.peek(ref),value,'Keep recently played recording');
assert.equal(cache.size(),2,'Bound decoded memory by number of ghosts');
assert.equal(cache.sampleCount(),6,'Bound decoded memory by sample count');

const failed='00000000-0000-4000-8000-000000000004';
let retries=0;
await assert.rejects(cache.load(failed,()=>{retries++;throw Error('offline');}),/offline/);
assert.equal(cache.pendingCount(),0,'Failed download must not block retry');
assert.equal(cache.peek(failed),null,'Never cache errors');
assert.equal(await cache.load(failed,()=>{retries++;return ghostFor(failed);}),cache.peek(failed));
assert.equal(retries,2);

const huge={data:{record_ref:'huge'},ghost:{samples:Array.from({length:7},(_,t)=>({t}))}};
assert.equal(await cache.load('huge',()=>huge),huge,'Huge ghost remains playable');
assert.equal(cache.peek('huge'),null,'Oversized ghost is not cached');
assert.equal(cache.sampleCount(),6);
cache.clear();assert.equal(cache.size(),0);assert.equal(cache.sampleCount(),0);

const src=readFileSync('src/game/scenes/StatsBroadcastRealReplayScene.js','utf8');
assert.match(src,/const ONLINE_GHOST_CACHE=createBoundedOnlineGhostCache\(\{maxEntries:4,maxSamples:20000\}\)/);
assert.equal((src.match(/await loadOnlineGhost\(ref\)/g)||[]).length,3,
  'Replay, VS and nearby rivals must share one download path');
assert.match(src,/if\(!ref\|\|!await this\._ensureOnlineGhostReward\(ref\)\)return null/,
  'Nearby rivals must verify rewarded gate before downloading');
assert.equal((src.match(/await this\._ensureOnlineGhostReward\(ref\)/g)||[]).length,3,
  'All entry points retain their existing rewarded gate');
assert.ok(src.includes("String(data?.record_ref||'')===ref"),
  'Nearby match must still verify exact record reference');
assert.match(src,/ghostReplayCompatibility\(ghost,row\.track_id/,
  'Historic geometry remains rejected');
assert.ok(src.includes("String(data?.record_ref||'')!==String(ref)"),
  'Unknown record refs cannot poison cache');
assert.doesNotMatch(src,/localStorage\.setItem\([^)]*(?:ghost_payload|ONLINE_GHOST_CACHE)/,
  'No sensitive payload persisted by the caching layer');
console.log('PASS: bounded LRU, shared in-flight Replay/VS requests, retries, no prefetch or reward bypass');

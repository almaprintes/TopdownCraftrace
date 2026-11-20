// Race Control publication status: JWT-scoped own best, exact circuit identity,
// equal/faster/slower/absent records, cache isolation and no premature advertisements.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyRaceControlPublication,createRaceControlPublicationChecks} from '../src/game/ui/raceControlPublicationStatus.js';

assert.equal(classifyRaceControlPublication(28586,28586),'published');
assert.equal(classifyRaceControlPublication(27096,27096),'published');
assert.equal(classifyRaceControlPublication(31743,31743),'published');
assert.equal(classifyRaceControlPublication(28586,27000),'online-better');
assert.equal(classifyRaceControlPublication(28586,30000),'publish');
assert.equal(classifyRaceControlPublication(28586,null),'publish');
assert.equal(classifyRaceControlPublication(0,28586),'no-local');
assert.throws(()=>classifyRaceControlPublication(28586,-20),/Invalid server/);

let now=1000,account='owner-A',queries=0;
const remote=new Map([
 ['owner-A|karting-americas-inverso',28586],
 ['owner-A|karting-americas',27096],
 ['owner-A|karting-canarias-4096-inverso',31743],
 ['owner-A|circuito-atlantico@g2-20261023',10469],
 ['owner-B|karting-americas-inverso',null]
]);
const read=async track=>{
 queries++;
 const value=remote.get(account+'|'+track);
 return value==null?null:{best_time_ms:value};
};
const cache=createRaceControlPublicationChecks(read,{now:()=>now,ttlMs:45000});
const inverse=await cache.read('owner-A','karting-americas-inverso');
assert.equal(inverse,28586);
assert.equal(await cache.read('owner-A','karting-americas-inverso'),28586);
assert.equal(queries,1,'Same account/track must not fetch repeatedly during re-renders');
assert.equal(await cache.read('owner-A','karting-americas'),27096);
assert.equal(await cache.read('owner-A','karting-canarias-4096-inverso'),31743);
assert.equal(await cache.read('owner-A','circuito-atlantico@g2-20261023'),10469);
assert.equal(queries,4,'Normal, inverse and edition must have different server keys');
account='owner-B';
assert.equal(await cache.read('owner-B','karting-americas-inverso'),null);
assert.equal(queries,5,'Changing Supabase account must not inherit the prior owner record');
account='owner-A';
now+=45001;remote.set('owner-A|karting-americas-inverso',27000);
assert.equal(await cache.read('owner-A','karting-americas-inverso'),27000);
assert.equal(await cache.read('owner-A','karting-americas-inverso',{force:true}),27000);
cache.invalidate('owner-A','karting-americas-inverso');
assert.equal(await cache.read('owner-A','karting-americas-inverso'),27000);
cache.remember('owner-A','karting-americas-inverso',26000);
assert.equal(await cache.read('owner-A','karting-americas-inverso'),26000);

const board=fs.readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
const rpc=fs.readFileSync('src/game/online/raceControlOnline.js','utf8');
assert.match(rpc,/get_my_track_personal_best/);
assert.match(board,/this\._syncRaceControlPublicationStatus\(selected\)/);
assert.match(board,/savedRaceControlIdentity\(\)/);
assert.match(board,/raceControlOnlineIsActive\(\)/);
assert.match(board,/getMyRaceControlRecord\(selected\.trackId\)/);
assert.doesNotMatch(board,/if\(claim\?\.published\)/,'A local ad receipt must not assert publication');
assert.doesNotMatch(board,/const onlineMine=cloudRows\.find/,'Stale ranking cache must not prove own PB');
const publishing=board.slice(board.indexOf('async _publishRaceControlRecord('));
const own=publishing.indexOf('const ownOnline=await getMyRaceControlRecord(');
const confirm=publishing.indexOf('window.confirm(');
const ad=publishing.indexOf('await showRewardedAd(');
assert.ok(own>=0&&own<confirm&&confirm<ad,'Server check must precede confirmation and ad');
assert.match(publishing,/publishState==='published'/);
assert.match(publishing,/button\.textContent=publishState==='published'/);
assert.match(board,/\.remember\(account,selected\.trackId,Number\(row\.best_time_ms\)\)/);
assert.match(board,/this\._raceControlPublicationChecks\?\.invalidate/);
console.log('PASS: verified own-record status, normal/inverse account isolation, no early ad, no stale publication labels');

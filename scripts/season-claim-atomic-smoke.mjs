import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 seasonClaimReceipt,reconcileSeasonClaimState,attachSeasonClaimReceipt,
 isStorageQuotaError,reclaimReplaceableSeasonCaches
} from '../src/game/events/seasonClaimPersistence.js';
const defs=[{id:'first-drive'},{id:'material-hunt'},{id:'clean-rhythm'}];
const old={index:1,baseline:{lootDraws:0},claimed:['first-drive']};
const next={index:2,baseline:{lootDraws:20},claimed:['first-drive','material-hunt']};
let garage={coins:4200,inventory:{disc:4}};
attachSeasonClaimReceipt(garage,'induction','material-hunt',next);
assert.equal(seasonClaimReceipt(garage,'induction').eventId,'material-hunt');
const stored=JSON.parse(JSON.stringify(garage));
assert.deepEqual(reconcileSeasonClaimState(old,stored,'induction',defs),next,
  'Progress advances from same key that contains the granted discs');
assert.deepEqual(reconcileSeasonClaimState(next,stored,'induction',defs),next,
  'Already-completed claim must not be re-applied');
assert.deepEqual(reconcileSeasonClaimState(old,{...stored,seasonClaimReceipts:{}},'induction',defs),old);
assert.deepEqual(reconcileSeasonClaimState(old,{...stored,
 seasonClaimReceipts:{induction:{...stored.seasonClaimReceipts.induction,eventId:'wrong'}}},'induction',defs),old,
 'Never trust receipt for a different mission');
assert.deepEqual(reconcileSeasonClaimState(old,stored,'cuper',defs),old,
  'Induction reward must never unlock Crown season');
let map=new Map([
 ['tdr2:raceRecords:v1','large disposable local index'],
 ['tdr2:leaderboardSnapshot:circuito-atlantico','downloadable ranking'],
 ['tdr2:onlineGhostCodec:lastReport','diagnostics'],
 ['tdr2:ghostPb:circuito-atlantico','valuable exact replay'],
 ['tdr2:ttBest:circuito-atlantico','official personal best'],
 ['tdr2:ttHist:circuito-atlantico','race history'],
 ['tdr2:garageFusion:v1',JSON.stringify(stored)],
 ['tdr2:seasonInduction:v1',JSON.stringify(old)],
 ['tdr2:onlineSession:v1','auth token']
]);
const storage={
 get length(){return map.size},
 key:i=>[...map.keys()][i]??null,
 getItem:k=>map.get(k)??null,
 removeItem:k=>map.delete(k)
};
assert.equal(reclaimReplaceableSeasonCaches(storage),3);
assert.deepEqual([...map.keys()].sort(),[
 'tdr2:ghostPb:circuito-atlantico',
 'tdr2:ttBest:circuito-atlantico',
 'tdr2:ttHist:circuito-atlantico',
 'tdr2:garageFusion:v1',
 'tdr2:seasonInduction:v1',
 'tdr2:onlineSession:v1'
].sort(),'No player progress, ghost or auth key may be removed');
assert.equal(isStorageQuotaError({name:'QuotaExceededError'}),true);
assert.equal(isStorageQuotaError({name:'SecurityError'}),false);
const src=readFileSync('src/game/events/raceEvents.js','utf8');
const ui=readFileSync('src/game/scenes/SeasonScene.js','utf8');
assert.ok(src.indexOf('attachSeasonClaimReceipt(garage,current.family,event.id,nextState)')<
 src.indexOf('saveGarage(garage);'),'Claim receipt must share reward transaction');
assert.ok(src.indexOf('saveGarage(garage);')<src.indexOf('const stateSaved=saveState(key,nextState)'),
 'Garages commits receipt and reward before secondary season projection');
assert.match(src,/reconcileSeasonClaimState\(state,loadGarage\(\),family,definitions\)/);
assert.match(src,/if\(!saved\)\{/);
assert.match(ui,/if\(result\?\.reason==='storage-unavailable'\)/);
assert.match(ui,/if\(!result\?\.ok\)\{/);
assert.match(src,/window\.dispatchEvent\(new CustomEvent\('tdr:seasonRewardClaimed'/);
console.log('PASS: identical durable receipt and reward, recovery after secondary write failure, no repeat and no deletion of valuable data.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class MemoryStorage{
  constructor(){this.data=new Map();}
  get length(){return this.data.size;}
  key(index){return [...this.data.keys()][index]??null;}
  getItem(key){return this.data.has(String(key))?this.data.get(String(key)):null;}
  setItem(key,value){this.data.set(String(key),String(value));}
  removeItem(key){this.data.delete(String(key));}
  clear(){this.data.clear();}
}

globalThis.localStorage=new MemoryStorage();

const actions=await import('../src/game/monetization/rewardedActions.js');
assert.equal(actions.verifiedReward({completed:true,verified:true}),true);
assert.equal(actions.verifiedReward({completed:true,verified:false}),false);
assert.equal(actions.legacyPostRaceClaimId({trackKey:'track 1',t:1234}),'post-race-x2:track-1:1234');
assert.equal(actions.recyclerRewardedPlacement(2),'recycler_exchange_2');
assert.equal(actions.recyclerRewardedPlacement(3),'recycler_exchange_3');
assert.equal(actions.recyclerRewardedClaimId('2026-09-22',2),'recycler-exchange:2026-09-22:2');
assert.equal(actions.raceControlGhostClaimId('abc-123'),'race-control-ghost:abc-123');

const firstStatus=actions.storeRewardedWindow(0,1_000_000);
assert.equal(firstStatus.available,true);
assert.equal(firstStatus.claimId,'store-coins-100:first');
const coolingDown=actions.storeRewardedWindow(1_000_000,1_000_001);
assert.equal(coolingDown.available,false,'four-hour reward must remain locked after a claim');
assert.equal(coolingDown.claimId,'store-coins-100:1000000');
assert.equal(actions.storeRewardedWindow(1_000_000,1_000_000+4*60*60*1000).available,true);

globalThis.window={location:{pathname:'/'},__tdrRewardedAds:{show:async()=>({completed:true,verified:false,reason:'ssv_failed'})}};
const provider=await import('../src/game/monetization/RewardedAdsProvider.js');
const rejected=await provider.showRewardedAd(null,{placement:'test',claimId:'claim-1'});
assert.equal(rejected.completed,false,'an unverified completion must never grant a reward');
assert.equal(rejected.verified,false);
window.__tdrRewardedAds.show=async()=>({completed:true,verified:true,transactionId:'verified-test'});
const accepted=await provider.showRewardedAd(null,{placement:'test',claimId:'claim-2'});
assert.equal(accepted.completed,true);
assert.equal(accepted.verified,true);

const publishSource=await readFile(new URL('../src/game/scenes/StatsBroadcastScene.js',import.meta.url),'utf8');
assert.match(publishSource,/RACE_CONTROL_PUBLISH/);
assert.match(publishSource,/getRaceControlSnapshot\(selected\.trackId\)/,'publishing must refresh the selected leaderboard');
const ghostSource=await readFile(new URL('../src/game/scenes/StatsBroadcastRealReplayScene.js',import.meta.url),'utf8');
assert.match(ghostSource,/RACE_CONTROL_GHOST/);
assert.match(ghostSource,/verifiedReward\(ad\)/);
const recyclerSource=await readFile(new URL('../src/game/ui/MaterialExchangeDom.js',import.meta.url),'utf8');
assert.match(recyclerSource,/recyclerRewardedPlacement\(ordinal\)/);
assert.match(recyclerSource,/verifiedReward\(ad\)/);
const storeSource=await readFile(new URL('../src/game/scenes/MenuRewardedAdsScene.js',import.meta.url),'utf8');
assert.match(storeSource,/STORE_COINS_100/);
assert.match(storeSource,/claimId:status\.claimId/);
assert.match(storeSource,/verifiedReward\(ad\)/);
for(const file of ['UpgradeShopScene.js','UpgradeWorkshopPerformanceScene.js','UpgradeWorkshopCrafterraScene.js']){
  const source=await readFile(new URL(`../src/game/scenes/${file}`,import.meta.url),'utf8');
  assert.match(source,/REWARDED_PLACEMENTS\.POST_RACE_DOUBLE_LOOT/);
  assert.match(source,/verifiedReward\(ad\)/,'legacy x2 entry points must never treat a failed result object as success');
}
const judgeSource=await readFile(new URL('../src/game/shipaton/ShipatonJudgeMode.js',import.meta.url),'utf8');
assert.match(judgeSource,/entitlementVerified&&enabledPreference\(\)/,'local storage alone must not authorize Judge Mode');

console.log('rewarded access smoke: verified');

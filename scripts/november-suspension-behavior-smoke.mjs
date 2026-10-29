import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAdFreePromoActive,isBlackFridayPromoWindow,refreshAdFreePromoControl} from '../src/game/monetization/adFreeNovember.js';
import {showRewardedAd} from '../src/game/monetization/RewardedAdsProvider.js';
import {rewardActionAllowed,REWARDED_PLACEMENTS} from '../src/game/monetization/rewardedActions.js';
const read=p=>readFileSync(p,'utf8');
for(const [date,marketing] of [['2026-10-31T23:59:59Z',false],['2026-11-01T00:00:00Z',true],['2026-11-30T23:59:59Z',true],['2026-12-01T00:00:00Z',false],['2027-01-01T00:00:00Z',false]]){
 assert.equal(isBlackFridayPromoWindow(Date.parse(date)),marketing,date);
 assert.equal(isAdFreePromoActive(Date.parse(date)),true,'suspension must outlast calendar');
}
let calls=0;
globalThis.window={__tdrRewardedAds:{show(){calls++;throw Error('inventory forbidden');}}};
for(const placement of Object.values(REWARDED_PLACEMENTS)){
 const grant=await showRewardedAd(null,{placement,claimId:'earned-claim'});
 assert.equal(grant.verified,false);assert.equal(grant.completed,false);
 assert.equal(rewardActionAllowed(grant),true);
}
assert.equal(calls,0);
assert.equal(rewardActionAllowed(await showRewardedAd(null,{placement:'arbitrary'})),false);

assert.equal(isAdFreePromoActive(),true);
// Execute the actual economy functions with an isolated transactional garage.
let state={coins:0,items:{}};
globalThis.__testGarage={load:()=>structuredClone(state),save:s=>{state=structuredClone(s);},add:(s,id,n)=>{s.items[id]=(s.items[id]||0)+n;}};
const moduleFrom=s=>import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));
const economy=await moduleFrom(read('src/game/store/storeEconomy.js')
 .replace(/^import .*;$/gm,'')+`\nconst {load:loadGarage,save:saveGarage,add:addItem}=globalThis.__testGarage;\nconst recordStoreBuy=()=>{};\n${read('src/game/monetization/rewardedActions.js').slice(read('src/game/monetization/rewardedActions.js').indexOf('export function storeRewardedWindow')).replace('export function','function')}\nconst storeCoinsClaimId=t=>String(t);`);

const now=Date.parse('2026-11-02T00:00:00Z');
assert.equal(economy.claimRewardedCoins(100,now).ok,true);
assert.equal(economy.claimRewardedCoins(100,now).ok,false);
assert.equal(economy.claimRewardedCoins(100,now-1).ok,false);
assert.equal(economy.claimRewardedCoins(1000,now+14400000).ok,false);
assert.equal(economy.claimRewardedCoins(100,now+14400000).ok,true);
assert.equal(state.coins,200);
const loot=await moduleFrom(read('src/game/monetization/postRaceDoubleLoot.js').replace(/^import .*;$/gm,'')+'\nconst {load:loadGarage,save:saveGarage,add:addItem}=globalThis.__testGarage;');
const claim={claimId:'earned-original',entries:[{id:'scrap',qty:5}]};
assert.equal(loot.claimPostRaceDoubleLoot(claim).ok,true);
assert.equal(loot.claimPostRaceDoubleLoot(claim).ok,false);
for(let i=0;i<70;i++)assert.equal(loot.claimPostRaceDoubleLoot({claimId:`earned-${i}`,entries:[{id:'scrap',qty:1}]}).ok,true);
assert.equal(loot.claimPostRaceDoubleLoot(claim).ok,false,'old consumed claims must not be evicted');
assert.equal(state.items.scrap,75);
assert.equal(loot.claimPostRaceDoubleLoot({claimId:'bad',entries:[{id:'scrap',qty:Infinity}]}).ok,false);
const native=read('android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt');
assert.ok(native.indexOf('if (BuildConfig.TDR_ADS_SUSPENDED)',native.indexOf('fun show(call'))<native.indexOf('showGoogleSampleAd(call, placement'));
assert.match(read('android/app/build.gradle'),/production \{[\s\S]*?TDR_ADS_SUSPENDED', 'true'/);
console.log('PASS: exact November boundaries, no inventory after expiry, six free placements, cooldown/rollback, x2 duplicate/replay protection.');

const remoteModule=await moduleFrom(read('src/game/monetization/adFreeNovember.js').replace("import {playerBackendConfig} from '../online/backendConfig.js';", "const playerBackendConfig=()=>({url:'https://test.invalid',key:'public-test'});"));
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,json:async()=>[{id:'november_2026',enabled:false,starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-12-01T00:00:00Z'}]});
await remoteModule.refreshAdFreePromoControl({force:true});
assert.equal(remoteModule.isAdFreePromoActive(Date.parse('2027-01-01')),true,'remote off must not end suspension');
globalThis.fetch=originalFetch;

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=path=>readFileSync(path,'utf8');
const promo=src('src/game/monetization/adFreeNovember.js');
const provider=src('src/game/monetization/RewardedAdsProvider.js');
const policy=src('src/game/monetization/rewardedActions.js');
const main=src('src/main.js');
const store=src('src/game/ui/StoreDomUi.js');
const storeScene=src('src/game/scenes/MenuRewardedAdsScene.js');
const legacyStore=src('src/game/scenes/MenuStoreScene.js');
const record=src('src/game/ui/sessionRecordPublishOffer.js');
const loot=src('src/game/scenes/RaceSessionRewardsScene.js');
const recycler=src('src/game/ui/MaterialExchangeDom.js');
const banner=src('src/game/ui/BlackFridayPromoUi.js');
const lobby=src('src/game/ui/LobbyDomUi.js');
const sql=src('supabase/migrations/20261027_021_november_ad_free_promotion.sql');

assert.match(promo,/2026-12-01T00:00:00Z/,'promotion covers Nov 30 Canary local');
assert.match(promo,/refreshAdFreePromoControl/);
assert.match(promo,/cache:'no-store'/);
assert.match(main,/installAdFreePromoControl\(\)/);
assert.match(provider,/if\(isAdFreePromoActive\(\)\)return \{/);
assert.ok(provider.indexOf('if(isAdFreePromoActive())return {')<
  provider.indexOf('if(nativeBridge())return nativeRewardedAd'),
  'no monetized AdMob request during promo');
assert.match(provider,/completed:false,verified:false,promotion:true,source:'november-2026'/,
  'never claim ad viewed or SSV verified');
assert.match(policy,/export function verifiedReward/);
assert.match(policy,/export function rewardActionAllowed/);
assert.match(policy,/result\?\.verified===false/);
for(const [name,source] of [['DOM store',store],['Phaser store',storeScene],
  ['legacy store',legacyStore],['record',record],['postrace x2',loot],['recycler',recycler]]){
  assert.match(source,/rewardActionAllowed/,`${name} must accept explicit promo grants`);
}
assert.match(record,/promotionGranted/);
assert.match(record,/REINTENTAR PUBLICACIÓN · GRATIS/);
assert.match(record,/submitRaceControlRecordWithGhost/);
assert.match(record,/submitRaceControlRecordWithoutGhost/);
assert.match(loot,/claimPostRaceDoubleLoot/);
assert.match(recycler,/requiresVideo=status.used>=1&&!isAdFreePromoActive\(\)/);
assert.match(store,/claimRewardedCoins\(100\)/);
assert.match(store,/rewardedStatus\(\)/);
assert.match(sql,/enable row level security/i);
assert.match(sql,/grant select.*anon, authenticated/i);
assert.doesNotMatch(sql,/grant (?:update|insert|delete|all) .*to anon/i);
assert.match(banner,/NOVIEMBRE SIN ANUNCIOS/);
assert.match(banner,/installBlackFridayPromoUi/);
assert.match(lobby,/installBlackFridayPromoUi\(root\)/);
console.log('PASS: Nov 2026 no-ads UI, 100 coins, records, x2, recycler and Supabase switch; no fake SSV.');

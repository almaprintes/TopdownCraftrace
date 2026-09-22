export const REWARDED_PLACEMENTS=Object.freeze({
  POST_RACE_DOUBLE_LOOT:'post_race_double_loot',
  RACE_CONTROL_PUBLISH:'race_control_publish_record',
  RACE_CONTROL_GHOST:'race_control_ghost_download',
  RECYCLER_SECOND:'recycler_exchange_2',
  RECYCLER_THIRD:'recycler_exchange_3',
  STORE_COINS_100:'store_coins_100_4h'
});

const token=value=>String(value??'').trim().replace(/[^a-zA-Z0-9._:-]+/g,'-').slice(0,120);

export function verifiedReward(result){
  return result?.completed===true&&result?.verified===true;
}

export function legacyPostRaceClaimId(lastReward={}){
  const track=token(lastReward?.trackKey||'race');
  const earnedAt=Math.max(0,Math.round(Number(lastReward?.t)||0));
  return `post-race-x2:${track}:${earnedAt||'latest'}`;
}

export function raceControlPublishClaimId(trackId,bestTimeMs){
  return `race-control-publish:${token(trackId)}:${Math.max(0,Math.round(Number(bestTimeMs)||0))}`;
}

export function raceControlGhostClaimId(recordRef){
  return `race-control-ghost:${token(recordRef)}`;
}

export function recyclerRewardedPlacement(ordinal){
  return Number(ordinal)===3?REWARDED_PLACEMENTS.RECYCLER_THIRD:REWARDED_PLACEMENTS.RECYCLER_SECOND;
}

export function recyclerRewardedClaimId(day,ordinal){
  return `recycler-exchange:${token(day)}:${Number(ordinal)===3?3:2}`;
}

export function storeCoinsClaimId(lastClaimAt=0){
  const last=Math.max(0,Math.round(Number(lastClaimAt)||0));
  return `store-coins-100:${last||'first'}`;
}

export function storeRewardedWindow(lastClaimAt=0,now=Date.now(),cooldownMs=4*60*60*1000){
  const last=Math.max(0,Number(lastClaimAt)||0);
  const remaining=Math.max(0,Math.max(0,Number(cooldownMs)||0)-(Number(now)-last));
  return {available:!last||remaining<=0,remaining,lastClaimAt:last,claimId:storeCoinsClaimId(last)};
}

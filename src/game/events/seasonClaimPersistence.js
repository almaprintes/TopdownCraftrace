// The garage and the season progression were previously stored in separate
// localStorage keys. On WebKit quota failure the garage reward could persist
// while the claim's progression was silently lost, permitting unlimited claims.
// Place the receipt INSIDE the same garage write as the reward. Reconciliation
// may then advance the season even if the secondary progress write fails.
const REPLACEABLE_KEYS=new Set([
  'tdr2:raceRecords:v1',
  'tdr2:onlineGhostCodec:lastReport'
]);
const REPLACEABLE_PREFIXES=['tdr2:leaderboardSnapshot:'];

export function seasonClaimReceipt(garage,family){
  const receipt=garage?.seasonClaimReceipts?.[family];
  return receipt&&typeof receipt==='object'&&!Array.isArray(receipt)?receipt:null;
}
export function reconcileSeasonClaimState(state,garage,family,definitions){
  const receipt=seasonClaimReceipt(garage,family);
  const step=Number(receipt?.index);
  if(!Number.isSafeInteger(step)||step<1||step>definitions.length||
     step<=Number(state?.index)||definitions[step-1]?.id!==receipt?.eventId||
     !Array.isArray(receipt?.claimed)||!receipt.claimed.includes(receipt.eventId)||
     !receipt.baseline||typeof receipt.baseline!=='object'||
     Array.isArray(receipt.baseline))return state;
  return {...state,index:step,baseline:receipt.baseline,
    claimed:[...new Set([...(Array.isArray(state?.claimed)?state.claimed:[]),...receipt.claimed])]};
}
export function attachSeasonClaimReceipt(garage,family,eventId,nextState){
  garage.seasonClaimReceipts={
    ...(garage.seasonClaimReceipts||{}),
    [family]:{
      index:nextState.index,eventId,
      claimed:[...nextState.claimed],
      baseline:nextState.baseline
    }
  };
  return garage;
}
export function isStorageQuotaError(error){
  return error?.name==='QuotaExceededError'||error?.code===22||error?.code===1014||
    /quota|storage full|almacenamiento lleno|no space left/i.test(String(error?.message||''));
}
// Only expendable, regenerable caches: NEVER delete ghosts, lap histories,
// personal bests, user wallets, sessions, auth tokens or cloud save data.
export function reclaimReplaceableSeasonCaches(storage=globalThis.localStorage){
  const keys=[];
  try{
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(REPLACEABLE_KEYS.has(key)||REPLACEABLE_PREFIXES.some(p=>key?.startsWith(p)))keys.push(key);
    }
    for(const key of keys)storage.removeItem(key);
  }catch{}
  return keys.length;
}

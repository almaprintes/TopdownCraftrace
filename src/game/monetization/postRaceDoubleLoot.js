import { addItem, loadGarage, saveGarage } from '../garage/garageStore.js';

const MAX_STORED_CLAIMS=64;

function cleanClaimId(value){
  return String(value||'').trim().slice(0,160);
}

function eligibleItems(entries=[]){
  const out={};
  for(const row of entries||[]){
    const id=String(row?.id||'').trim();
    const qty=Math.max(0,Math.floor(Number(row?.qty)||0));
    if(!id||qty<=0)continue;
    out[id]=(out[id]||0)+qty;
  }
  return out;
}

function ensureClaims(state){
  if(!state.rewardClaims||typeof state.rewardClaims!=='object'||Array.isArray(state.rewardClaims))state.rewardClaims={};
  return state.rewardClaims;
}

function pruneClaims(claims){
  const rows=Object.entries(claims).sort((a,b)=>Number(b?.[1]?.t||0)-Number(a?.[1]?.t||0));
  for(const [id] of rows.slice(MAX_STORED_CLAIMS))delete claims[id];
}

export function createPostRaceClaimId(trackKey='race'){
  const prefix=String(trackKey||'race').replace(/[^a-z0-9_-]+/gi,'-').slice(0,48)||'race';
  let random='';
  try{random=crypto?.randomUUID?.()||'';}catch{}
  if(!random)random=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  return `post-race-x2:${prefix}:${random}`;
}

export function hasClaimedPostRaceDouble(claimId){
  const id=cleanClaimId(claimId);
  if(!id)return false;
  try{return !!loadGarage()?.rewardClaims?.[id];}catch{return false;}
}

// Grants exactly one extra copy of the already-earned economic loot.
// Competitive results (times, wins, trophies, leaderboard data) never pass
// through this function, so the rewarded ad cannot alter race performance.
export function claimPostRaceDoubleLoot({claimId,entries=[]}={}){
  const id=cleanClaimId(claimId);
  if(!id)return{ok:false,reason:'invalid_claim'};
  const items=eligibleItems(entries);
  if(!Object.keys(items).length)return{ok:false,reason:'empty_loot'};

  const state=loadGarage();
  const claims=ensureClaims(state);
  if(claims[id])return{ok:false,reason:'already_claimed',claim:claims[id]};

  // Persist the claim in the same garage transaction as the duplicated items.
  // A duplicate callback therefore becomes harmless on the next invocation.
  for(const [itemId,qty] of Object.entries(items))addItem(state,itemId,qty);
  claims[id]={t:Date.now(),items:{...items},source:'rewarded_post_race_x2'};
  pruneClaims(claims);
  saveGarage(state);
  return{ok:true,claimId:id,items};
}

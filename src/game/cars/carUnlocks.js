const KEY='tdr2:carUnlocks:v1';
const DEV_FULL_ACCESS_KEY='tdr2:devFullCarAccess:v1';
const STARTER_CAR='helix_spark';
const PLAYER_STATS_KEY='tdr2:playerStats:v1';
const TT_HISTORY_PREFIX='tdr2:ttHist:';

function normalize(ids){return [...new Set((Array.isArray(ids)?ids:[]).map(x=>String(x||'').trim()).filter(Boolean))];}

export function loadCarUnlocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    const unlocked=normalize(raw?.unlocked);
    if(!unlocked.includes(STARTER_CAR))unlocked.unshift(STARTER_CAR);
    return {unlocked};
  }catch{return {unlocked:[STARTER_CAR]};}
}

export function saveCarUnlocks(state){
  const unlocked=normalize(state?.unlocked);
  if(!unlocked.includes(STARTER_CAR))unlocked.unshift(STARTER_CAR);
  const next={unlocked};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

export function unlockCar(carId){
  const id=String(carId||'').trim();
  if(!id)return false;
  const state=loadCarUnlocks();
  const had=state.unlocked.includes(id);
  if(!had)state.unlocked.push(id);
  saveCarUnlocks(state);
  return !had;
}

export function isCarUnlocked(carId){return loadCarUnlocks().unlocked.includes(String(carId||''));}

function devUsedCarIds(){
  const ids=[];
  try{
    const selected=String(localStorage.getItem('tdr2:carId')||'').trim();
    if(selected)ids.push(selected);

    const stats=JSON.parse(localStorage.getItem(PLAYER_STATS_KEY)||'null');
    if(stats?.cars&&typeof stats.cars==='object')ids.push(...Object.keys(stats.cars));

    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.startsWith(TT_HISTORY_PREFIX))continue;
      let parsed=null;
      try{parsed=JSON.parse(localStorage.getItem(key)||'null');}catch{continue;}
      const history=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.history)?parsed.history:[]);
      for(const row of history){
        const carId=String(row?.carId||'').trim();
        if(carId)ids.push(carId);
      }
    }
  }catch{}
  return normalize(ids);
}

export function unlockedCarIds(){
  const owned=loadCarUnlocks().unlocked;
  if(!devFullCarAccessEnabled())return [...owned];
  // DEV homologation access must never mutate real progression. Statistics can,
  // however, expose cars that the developer has selected or actually driven.
  return normalize([...owned,...devUsedCarIds()]);
}

export function devFullCarAccessEnabled(){
  try{return localStorage.getItem(DEV_FULL_ACCESS_KEY)==='1';}catch{return false;}
}

export function setDevFullCarAccess(enabled){
  try{localStorage.setItem(DEV_FULL_ACCESS_KEY,enabled?'1':'0');}catch{}
  return !!enabled;
}

export function toggleDevFullCarAccess(){return setDevFullCarAccess(!devFullCarAccessEnabled());}

export const STARTER_CAR_ID=STARTER_CAR;
export const CAR_UNLOCKS_KEY=KEY;
export const DEV_FULL_CAR_ACCESS_KEY=DEV_FULL_ACCESS_KEY;

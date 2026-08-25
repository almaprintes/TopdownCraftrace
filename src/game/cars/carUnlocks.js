const KEY='tdr2:carUnlocks:v1';
const STARTER_CAR='helix_spark';

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
export function unlockedCarIds(){return [...loadCarUnlocks().unlocked];}
export const STARTER_CAR_ID=STARTER_CAR;
export const CAR_UNLOCKS_KEY=KEY;

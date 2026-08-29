const KEY='tdr2:trackUnlocks:v1';
const DEV_KEY='tdr2:devFullTrackAccess:v1';
export const STARTER_TRACK_IDS=Object.freeze(['track01','karting-tenerife','karting-canarias']);

const normalize=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];

export function loadTrackUnlocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    const unlocked=normalize(raw?.unlocked);
    for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
    return {unlocked};
  }catch{return {unlocked:[...STARTER_TRACK_IDS]};}
}

export function saveTrackUnlocks(state){
  const unlocked=normalize(state?.unlocked);
  for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
  const next={unlocked};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

export function unlockTrack(trackId){
  const id=String(trackId||'').trim();if(!id)return false;
  const state=loadTrackUnlocks(),had=state.unlocked.includes(id);
  if(!had)state.unlocked.push(id);saveTrackUnlocks(state);return !had;
}
export function isTrackUnlocked(trackId){return loadTrackUnlocks().unlocked.includes(String(trackId||''));}
export function unlockedTrackIds(){return [...loadTrackUnlocks().unlocked];}
export function devFullTrackAccessEnabled(){try{return localStorage.getItem(DEV_KEY)==='1';}catch{return false;}}
export function setDevFullTrackAccess(enabled){try{localStorage.setItem(DEV_KEY,enabled?'1':'0');}catch{}return !!enabled;}
export const TRACK_UNLOCKS_KEY=KEY;
export const DEV_FULL_TRACK_ACCESS_KEY=DEV_KEY;

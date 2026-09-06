const KEY='tdr2:trackUnlocks:v1';
const DEV_KEY='tdr2:devFullTrackAccess:v1';

// Canonical publication gate for player-facing circuits.
// A track may exist in src/game/tracks/library for authoring/admin purposes without
// being considered released. Only IDs in this list are allowed into the normal
// player selector or normal player selection flow.
export const PUBLISHED_TRACK_IDS=Object.freeze(['track01','santa-cruz','karting-tenerife','karting-canarias']);
export const STARTER_TRACK_IDS=PUBLISHED_TRACK_IDS;
export const isPublishedTrackId=id=>PUBLISHED_TRACK_IDS.includes(String(id||'').trim());

const normalize=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];

export function loadTrackUnlocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    // Never preserve obsolete/prototype IDs in the player unlock state. Admin can
    // still access every library track through the explicit DEV/full-access path.
    const unlocked=normalize(raw?.unlocked).filter(isPublishedTrackId);
    for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
    return {unlocked};
  }catch{return {unlocked:[...STARTER_TRACK_IDS]};}
}

export function saveTrackUnlocks(state){
  const unlocked=normalize(state?.unlocked).filter(isPublishedTrackId);
  for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
  const next={unlocked};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

export function unlockTrack(trackId){
  const id=String(trackId||'').trim();if(!id||!isPublishedTrackId(id))return false;
  const state=loadTrackUnlocks(),had=state.unlocked.includes(id);
  if(!had)state.unlocked.push(id);saveTrackUnlocks(state);return !had;
}
export function isTrackUnlocked(trackId){const id=String(trackId||'');return isPublishedTrackId(id)&&loadTrackUnlocks().unlocked.includes(id);}
export function unlockedTrackIds(){return [...loadTrackUnlocks().unlocked];}
export function devFullTrackAccessEnabled(){try{return localStorage.getItem(DEV_KEY)==='1';}catch{return false;}}
export function setDevFullTrackAccess(enabled){try{localStorage.setItem(DEV_KEY,enabled?'1':'0');}catch{}return !!enabled;}
export const TRACK_UNLOCKS_KEY=KEY;
export const DEV_FULL_TRACK_ACCESS_KEY=DEV_KEY;

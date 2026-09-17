import { evaluationAccessEnabled } from '../shipaton/ShipatonJudgeMode.js';

const KEY='tdr2:trackUnlocks:v1';
const DEV_KEY='tdr2:devFullTrackAccess:v1';

export const PUBLISHED_TRACK_IDS=Object.freeze(['circuito-atlantico','santa-cruz','karting-tenerife','karting-canarias']);
export const STARTER_TRACK_IDS=PUBLISHED_TRACK_IDS;
const normalizedTrackId=id=>String(id||'').trim();
const isJudgeExcludedTrack=id=>normalizedTrackId(id)==='practice-area';
export const isPublishedTrackId=id=>{
  const key=normalizedTrackId(id);
  if(PUBLISHED_TRACK_IDS.includes(key))return true;
  return evaluationAccessEnabled()&&!!key&&!isJudgeExcludedTrack(key);
};
const normalize=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];

export function loadTrackUnlocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    // Persistent progression remains restricted to genuinely published tracks.
    const unlocked=normalize(raw?.unlocked).filter(id=>PUBLISHED_TRACK_IDS.includes(id));
    for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
    return {unlocked};
  }catch{return {unlocked:[...STARTER_TRACK_IDS]};}
}
export function saveTrackUnlocks(state){const unlocked=normalize(state?.unlocked).filter(id=>PUBLISHED_TRACK_IDS.includes(id));for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);const next={unlocked};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;}
export function unlockTrack(trackId){const id=normalizedTrackId(trackId);if(!id||!PUBLISHED_TRACK_IDS.includes(id))return false;const state=loadTrackUnlocks(),had=state.unlocked.includes(id);if(!had)state.unlocked.push(id);saveTrackUnlocks(state);return !had;}
export function isTrackUnlocked(trackId){const id=normalizedTrackId(trackId);if(evaluationAccessEnabled())return !!id&&!isJudgeExcludedTrack(id);return PUBLISHED_TRACK_IDS.includes(id)&&loadTrackUnlocks().unlocked.includes(id);}
export function unlockedTrackIds(){return [...loadTrackUnlocks().unlocked];}
export function devFullTrackAccessEnabled(){if(evaluationAccessEnabled())return true;try{return localStorage.getItem(DEV_KEY)==='1';}catch{return false;}}
export function setDevFullTrackAccess(enabled){try{localStorage.setItem(DEV_KEY,enabled?'1':'0');}catch{}return !!enabled;}
export const TRACK_UNLOCKS_KEY=KEY;
export const DEV_FULL_TRACK_ACCESS_KEY=DEV_KEY;

import { evaluationAccessEnabled } from '../shipaton/ShipatonJudgeMode.js';
import { IS_PROD_BUILD } from '../buildTarget.js';

const KEY='tdr2:trackUnlocks:v1';
const DEV_KEY='tdr2:devFullTrackAccess:v1';

export const PUBLISHED_TRACK_IDS=Object.freeze(['circuito-atlantico','santa-cruz','karting-tenerife','karting-canarias']);
export const STARTER_TRACK_IDS=PUBLISHED_TRACK_IDS;
const normalizedTrackId=id=>String(id||'').trim();
const isJudgeExcludedTrack=id=>normalizedTrackId(id)==='practice-area';

// Track identity is canonical and must never depend on Judge Mode.
// Judge Mode grants selection/access only; it does not make registry entries
// "published" because runtime/environment routing relies on this distinction.
export const isPublishedTrackId=id=>PUBLISHED_TRACK_IDS.includes(normalizedTrackId(id));
const normalize=ids=>[...new Set((Array.isArray(ids)?ids:[]).map(v=>String(v||'').trim()).filter(Boolean))];

export function loadTrackUnlocks(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    const unlocked=normalize(raw?.unlocked).filter(id=>PUBLISHED_TRACK_IDS.includes(id));
    for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);
    return {unlocked};
  }catch{return {unlocked:[...STARTER_TRACK_IDS]};}
}
export function saveTrackUnlocks(state){const unlocked=normalize(state?.unlocked).filter(id=>PUBLISHED_TRACK_IDS.includes(id));for(const id of STARTER_TRACK_IDS)if(!unlocked.includes(id))unlocked.push(id);const next={unlocked};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;}
export function unlockTrack(trackId){const id=normalizedTrackId(trackId);if(!id||!PUBLISHED_TRACK_IDS.includes(id))return false;if(evaluationAccessEnabled())return true;const state=loadTrackUnlocks(),had=state.unlocked.includes(id);if(!had)state.unlocked.push(id);saveTrackUnlocks(state);return !had;}

// Evaluation access is intentionally isolated here: it can open a registry
// circuit for judges without changing that circuit's canonical published status.
export function isTrackUnlocked(trackId){
  const id=normalizedTrackId(trackId);
  if(evaluationAccessEnabled())return !!id&&!isJudgeExcludedTrack(id);
  return PUBLISHED_TRACK_IDS.includes(id)&&loadTrackUnlocks().unlocked.includes(id);
}
export function unlockedTrackIds(){return [...loadTrackUnlocks().unlocked];}
export function devFullTrackAccessEnabled(){if(evaluationAccessEnabled())return true;if(IS_PROD_BUILD)return false;try{return localStorage.getItem(DEV_KEY)==='1';}catch{return false;}}
export function setDevFullTrackAccess(enabled){try{localStorage.setItem(DEV_KEY,enabled?'1':'0');}catch{}return !!enabled;}
export const TRACK_UNLOCKS_KEY=KEY;
export const DEV_FULL_TRACK_ACCESS_KEY=DEV_KEY;

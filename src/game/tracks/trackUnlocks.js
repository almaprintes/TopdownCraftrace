import { IS_PROD_BUILD } from '../buildTarget.js';

const KEY='tdr2:trackUnlocks:v1';
const DEV_KEY='tdr2:devFullTrackAccess:v1';

// Vite sees the generated rebuilt track ONLY after the verified owner binary
// has been installed during prebuild. Before upload, retain the old circuit.
// Android QA also selects the rebuilt track when its verified owner source is installed.
// Vite's import.meta.glob is compiled away: it does not exist as a
// runtime function. Call the macro directly so the built published IDs
// follow the generated 4096 circuit included during prebuild.
const REBUILT_CANARIAS_MODULES=import.meta.glob('./library/karting-canarias-4096/track.json');
const REBUILT_CANARIAS_PRESENT=Object.keys(REBUILT_CANARIAS_MODULES).length>0;
export const PUBLISHED_TRACK_IDS=Object.freeze(
  ['circuito-atlantico','santa-cruz','karting-tenerife','karting-tenerife-horario','karting-canarias','karting-canarias-inverso','karting-americas','karting-americas-inverso','santa-cruz-inverso','circuito-atlantico-inverso','rally-arafo-los-loros','siete-picos','siete-picos-inverso']
    .map(id=>REBUILT_CANARIAS_PRESENT?(id==='karting-canarias'?'karting-canarias-4096':id==='karting-canarias-inverso'?'karting-canarias-4096-inverso':id):id));
export const STARTER_TRACK_IDS=PUBLISHED_TRACK_IDS;
// Migrate only active selected track, never historical laps, times or ghosts.
if(REBUILT_CANARIAS_PRESENT){try{if(localStorage.getItem('tdr2:trackKey')==='karting-canarias')localStorage.setItem('tdr2:trackKey','karting-canarias-4096');}catch{}}
const normalizedTrackId=id=>String(id||'').trim();
// Official IDs are shared by race selection, local statistics and Race Control.
// A reversed direction gets a separate PB, ghost and online leaderboard key.
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
export function unlockTrack(trackId){const id=normalizedTrackId(trackId);if(!id||!PUBLISHED_TRACK_IDS.includes(id))return false;const state=loadTrackUnlocks(),had=state.unlocked.includes(id);if(!had)state.unlocked.push(id);saveTrackUnlocks(state);return !had;}

export function isTrackUnlocked(trackId){
  const id=normalizedTrackId(trackId);
  return PUBLISHED_TRACK_IDS.includes(id)&&loadTrackUnlocks().unlocked.includes(id);
}
export function unlockedTrackIds(){return [...loadTrackUnlocks().unlocked];}
export function devFullTrackAccessEnabled(){if(IS_PROD_BUILD)return false;try{return localStorage.getItem(DEV_KEY)==='1';}catch{return false;}}
export function setDevFullTrackAccess(enabled){try{localStorage.setItem(DEV_KEY,enabled?'1':'0');}catch{}return !!enabled;}
export const TRACK_UNLOCKS_KEY=KEY;
export const DEV_FULL_TRACK_ACCESS_KEY=DEV_KEY;

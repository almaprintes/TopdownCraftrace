// DEV-only, host-local pilot selection for 1 human vs AI in LIVE 4 G.
// The Supabase-authenticated room still owns seats, capacity, and membership.
// IDs here select only an existing roster identity/its ELO dice probabilities.
// No modification to ratings, physics, rewards, netcode or the 2P mode.
import {AI_ELO_PILOTS,eloDieProbabilities} from '../ai/craftraceAiEloLeague.js';
import {live4AiPilotForSeat} from './craftraceLive4AiIdentity.js';

export const LIVE4_AI_CHOICES=Object.freeze(
 [...AI_ELO_PILOTS].sort((a,b)=>b.elo-a.elo)
);
const BY_ID=new Map(LIVE4_AI_CHOICES.map(p=>[p.id,p]));
const STORAGE_PREFIX='tdr:dev:live4:g:opponents:v1:';
const ALLOWED_TRACKS=new Set(['santa-cruz','karting-canarias-4096']);
const SEATS=new Set([1,2,3]);

export function live4AiPilotById(id){
 return typeof id==='string'?BY_ID.get(id)||null:null;
}
export function live4PilotHighRollChance(pilot){
 if(!pilot)return 0;
 const p=eloDieProbabilities(pilot.elo);
 return Math.round((p[4]+p[5])*100);
}
export function cleanLive4AiSelections(selection){
 const clean={};
 if(!selection||typeof selection!=='object'||Array.isArray(selection))return clean;
 for(const seat of [1,2,3]){
  const id=selection[seat];
  if(live4AiPilotById(id))clean[seat]=id;
 }
 // Two explicit claims to the same pilot are never allowed.
 const used=new Set();
 for(const seat of [1,2,3]){
  if(!clean[seat])continue;
  if(used.has(clean[seat]))delete clean[seat];
  else used.add(clean[seat]);
 }
 return clean;
}
export function readLive4AiSelections(trackId,store=globalThis.localStorage){
 if(!ALLOWED_TRACKS.has(trackId))return {};
 try{
  const raw=store?.getItem(STORAGE_PREFIX+trackId);
  return cleanLive4AiSelections(raw?JSON.parse(raw):null);
 }catch{return {};}
}
// Preserve the other selections when changing one seat. A chosen pilot in a
// different explicitly configured seat is not silently replaced.
export function chooseLive4AiSeat(selection,seat,pilotId){
 if(!SEATS.has(Number(seat)))throw Error('Plaza IA no válida');
 if(pilotId!==''&&!live4AiPilotById(pilotId))
  throw Error('Solo pueden elegirse pilotos del catálogo oficial');
 const updated=cleanLive4AiSelections(selection);
 if(pilotId!==''&&Object.entries(updated).some(([other,id])=>
   Number(other)!==Number(seat)&&id===pilotId))
  throw Error('Este piloto ya está elegido en otra plaza');
 if(pilotId==='')delete updated[seat];
 else updated[seat]=pilotId;
 return updated;
}
export function saveLive4AiSelections(trackId,selection,store=globalThis.localStorage){
 const normalized=cleanLive4AiSelections(selection);
 if(!ALLOWED_TRACKS.has(trackId))return false;
 try{
  store?.setItem(STORAGE_PREFIX+trackId,JSON.stringify(normalized));
  return typeof store?.setItem==='function';
 }catch{return false;}
}

// Explicit choices are reserved first; automatic seats pick their original
// deterministic room-seed drivers unless those IDs are already taken.
// A replacement is from the SAME registered 16-pilot roster.
export function resolveLive4AiPilots(seed,aiSeats,selection={}){
 const active=[...new Set(Array.isArray(aiSeats)?aiSeats:[])]
  .filter(seat=>SEATS.has(seat)).sort((a,b)=>a-b);
 const preferences=cleanLive4AiSelections(selection);
 const result={};
 const reserved=new Set();
 for(const seat of active){
  const selected=live4AiPilotById(preferences[seat]);
  if(selected&&!reserved.has(selected.id)){
   result[seat]=selected;
   reserved.add(selected.id);
  }
 }
 for(const seat of active){
  if(result[seat])continue;
  const defaultPilot=live4AiPilotForSeat(seed,seat);
  const pilot=defaultPilot&&!reserved.has(defaultPilot.id)
   ?defaultPilot:LIVE4_AI_CHOICES.find(p=>!reserved.has(p.id));
  if(!pilot)throw Error('Catálogo IA insuficiente');
  result[seat]=pilot;reserved.add(pilot.id);
 }
 return result;
}

// The race handoff carries an immutable snapshot of already-resolved IDs, not
// mutable localStorage or an unverified, client-provided Supabase roster.
export function resolvedLive4AiPilotIds(pilots){
 const ids={};
 for(const seat of [1,2,3]){
  const pilot=pilots?.[seat];
  if(live4AiPilotById(pilot?.id))ids[seat]=pilot.id;
 }
 return ids;
}

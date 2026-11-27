import {AI_ELO_PILOTS} from './craftraceAiEloLeague.js';
// Local-only four-car race setup. No account, server ID, room, or network transport.
export const OFFLINE_FOUR_TRACKS=Object.freeze(['santa-cruz','karting-canarias-4096','karting-tenerife-horario']);
export const OFFLINE_FOUR_LAPS=Object.freeze([1,3,5,10,20]);
export const OFFLINE_RACE_CAPACITIES=Object.freeze([2,4,17]);
export const OFFLINE_CONTACT_MODES=Object.freeze(['ghost','soft','full']);
export function makeOfflineFourRace({trackKey,carId,laps=3,difficulty=2,capacity=4,contact='ghost',humanSeat=Math.floor(Math.random()*capacity),seed='local-'+Date.now()+'-'+Math.random()}={}){
  if(!OFFLINE_FOUR_TRACKS.includes(trackKey)||typeof carId!=='string'||!carId.trim()||
     !OFFLINE_FOUR_LAPS.includes(laps)||![1,2,3].includes(difficulty)||
     !OFFLINE_RACE_CAPACITIES.includes(capacity)||!OFFLINE_CONTACT_MODES.includes(contact)||(capacity===17&&trackKey!=='santa-cruz')||
     !Number.isInteger(humanSeat)||humanSeat<0||humanSeat>=capacity||typeof seed!=='string'||!seed||seed.length>100)
    throw Error('Invalid offline four-car configuration');
  return Object.freeze({trackKey,carId,laps,difficulty,capacity,contact,humanSeat,seed});
}
export function offlineFourRoster(difficulty,humanSeat=0,capacity=4){
  if(![1,2,3].includes(difficulty)||!OFFLINE_RACE_CAPACITIES.includes(capacity)||!Number.isInteger(humanSeat)||humanSeat<0||humanSeat>=capacity)throw Error('Invalid AI roster');
  const host='local-player';
  return Array.from({length:capacity},(_,seat)=>seat===humanSeat?{seat,kind:'human',player_id:host}:{seat,kind:'ai',owner_id:host,bot_id:'ai-seat-'+(seat+1),difficulty});
}
export function rankOfflineFour(rows){
  return [...rows].sort((a,b)=>(a.elapsedMs??Infinity)-(b.elapsedMs??Infinity)||a.seat-b.seat);
}

// Preflight must finish before leaving the selection screen.
export async function prepareOfflineFourLaunch(config,prepare){
  const valid=makeOfflineFourRace(config);
  if(typeof prepare!=='function'||await prepare()!==true)throw Error('Módulo de carrera no disponible. Vuelve a intentarlo.');
  return {trackKey:valid.trackKey,carId:valid.carId,gameMode:'offline-ai',offlineFourRace:valid};
}

// All 16 real identities exactly once; deterministic per race/rematch, never changes Elo.
export function offlineFullPilotIds(roster,seed){
  const seats=roster.filter(p=>p.kind==='ai').map(p=>p.seat);
  if(seats.length!==16||new Set(seats).size!==16)throw Error('Full grid needs 16 unique AI seats');
  let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
  const offset=h%16,step=[1,3,5,7,9,11,13,15][(h>>>12)%8];
  return Object.freeze(Object.fromEntries(seats.map((seat,i)=>[seat,AI_ELO_PILOTS[(offset+step*i)%16].id])));
}
export function offlineHudEntries(rows,capacity){
  if(capacity<=4)return rows.map((row,i)=>({row,rank:i+1}));
  const index=rows.findIndex(r=>r.human),indices=new Set([0,index-1,index,index+1]);
  return [...indices].filter(i=>i>=0&&i<rows.length).sort((a,b)=>a-b).map(i=>({row:rows[i],rank:i+1}));
}

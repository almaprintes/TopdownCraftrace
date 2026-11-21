// One deterministic identity from the existing 16-pilot RACE CONTROL roster.
// The stable per-room seed produces the same three names on host and guests;
// no AI identity is inferred from human nicks, mutable local settings or seat data.
import {AI_ELO_PILOTS} from '../ai/craftraceAiEloLeague.js';
const hash=str=>{let h=2166136261;for(const ch of String(str||'')){h=Math.imul(h^ch.charCodeAt(0),16777619);}return h>>>0;};
export function live4AiPilotForSeat(seed,seat){
 if(!Number.isInteger(seat)||seat<0||seat>3)return null;
 const n=AI_ELO_PILOTS.length;
 const base=hash(seed);
 // Choose four distinct identities via an odd step coprime to 16.
 const offset=base%n;
 const step=[1,3,5,7,9,11,13,15][((base>>>12)>>>0)%8];
 return AI_ELO_PILOTS[(offset+step*seat)%n];
}
export function live4AiRoster(seed,seats){
 const list=Array.isArray(seats)?seats:[];
 return list.filter(p=>p.kind==='ai').map(p=>({
   seat:p.seat,pilot:live4AiPilotForSeat(seed,p.seat)
 }));
}

// Separate handoff; never reuses or mutates the proven LIVE 2P transport.
import {live4AiPilotById} from './craftraceLive4AiSelection.js';
let pending=null;
export function stageLive4RaceSession(room,identity,aiPilotIds=null){
 if(!room?.id||!Array.isArray(room.locked_roster)||!identity?.id)
  throw Error('Invalid LIVE 4 race handoff');
 // Extra AI identities are used only by the HOST in DEV guided G with one
 // human. Never mutate server-authorized locked_roster or grant extra seats.
 const selected={};
 if(room.host_id===identity.id&&room.fill_ai===true&&
   room.ai_difficulty===3&&room.locked_roster.filter(r=>r.kind==='human').length===1){
  const used=new Set();
  for(const entry of room.locked_roster.filter(r=>r.kind==='ai')){
   const id=aiPilotIds?.[entry.seat];
   if(live4AiPilotById(id)&&!used.has(id)){
    selected[entry.seat]=id;used.add(id);
   }
  }
 }
 pending={room,identity,aiPilotIds:selected};
}
export function consumeLive4RaceSession(roomId){
 if(!pending||pending.room.id!==roomId)return null;
 const session=pending;pending=null;return session;
}
export function discardLive4RaceSession(){pending=null;}

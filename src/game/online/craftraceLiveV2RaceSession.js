// Separate handoff; never reuses or mutates the proven LIVE 2P transport.
let pending=null;
export function stageLive4RaceSession(room,identity){
 if(!room?.id||!Array.isArray(room.locked_roster)||!identity?.id)
  throw Error('Invalid LIVE 4 race handoff');
 pending={room,identity};
}
export function consumeLive4RaceSession(roomId){
 if(!pending||pending.room.id!==roomId)return null;
 const session=pending;pending=null;return session;
}
export function discardLive4RaceSession(){pending=null;}

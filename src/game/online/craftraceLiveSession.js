// One transport per pilot per room, retained across lobby -> race transition.
// Prevents client_seq reuse and dropped remote packets on scene changes.
let pending=null;
export function handoffLiveSession(room,transport,identity){
 if(!room?.id||!transport||!identity?.id)throw Error('Invalid LIVE handoff');
 if(pending?.transport!==transport)pending?.transport?.stop();
 pending={room,transport,identity};
}
export function takeLiveSession(roomId){
 if(!pending||pending.room.id!==roomId)return null;
 const session=pending;pending=null;return session;
}
export function discardLiveSession(){pending?.transport?.stop();pending=null;}

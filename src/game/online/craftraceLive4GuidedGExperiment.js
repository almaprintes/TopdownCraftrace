// DEV LIVE 4 host-only preference, scoped to the authenticated room ID.
// Does not modify a Supabase room, the 2P live mode or official track lines.
// Other connected players see authoritative AI positions streamed by the host.
const ROOM=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const PREFIX='tdr:dev:live4:santa-cruz-bezier-g:';
export function isLive4GuidedGSupported({trackId,dev,aiDifficulty}={}){
 return dev===true&&trackId==='santa-cruz'&&Number(aiDifficulty)===3;
}
export function setLive4GuidedGForRoom(roomId,on,store=globalThis.sessionStorage){
 if(!ROOM.test(String(roomId)))return false;
 try{
  if(on)store.setItem(PREFIX+roomId,'1');
  else store.removeItem(PREFIX+roomId);
  return true;
 }catch{return false;}
}
export function hasLive4GuidedGForRoom(roomId,store=globalThis.sessionStorage){
 if(!ROOM.test(String(roomId)))return false;
 try{return store.getItem(PREFIX+roomId)==='1';}catch{return false;}
}

// DEV LIVE 4 host-only opt-in, scoped to the authenticated room ID.
// Santa Cruz and the owner's verified Canarias 4096 forward variant only.
// Does not modify a Supabase room, the 2P live mode or official track lines.
// Other connected players see authoritative AI positions streamed by the host.
const ROOM=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
// Preserve the existing prefix so open Santa Cruz trial sessions remain compatible.
const PREFIX='tdr:dev:live4:santa-cruz-bezier-g:';
export function isLive4GuidedGSupported({trackId,dev,aiDifficulty}={}){
 return dev===true&&Number(aiDifficulty)===3&&
   (trackId==='santa-cruz'||trackId==='karting-canarias-4096');
}
export function guidedGTrackLabel(trackId){
 return trackId==='santa-cruz'?'SANTA CRUZ':
   trackId==='karting-canarias-4096'?'KARTING CANARIAS 4096':'';
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

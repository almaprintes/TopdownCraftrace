const KEY='tdr2:cleanLapTelemetry:v1';

function empty(){return {total:0,byTrack:{}};}
export function loadCleanLapTelemetry(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null');
    if(!raw||typeof raw!=='object')return empty();
    return {total:Math.max(0,Number(raw.total)||0),byTrack:{...(raw.byTrack||{})}};
  }catch{return empty();}
}
export function recordCompletedLapClean(trackId,clean){
  const id=String(trackId||'').trim();if(!id)return loadCleanLapTelemetry();
  const state=loadCleanLapTelemetry();
  if(clean){state.total+=1;state.byTrack[id]=Math.max(0,Number(state.byTrack[id])||0)+1;}
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
  return state;
}
export const CLEAN_LAP_TELEMETRY_KEY=KEY;

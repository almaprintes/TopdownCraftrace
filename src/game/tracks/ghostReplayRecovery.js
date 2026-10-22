// Race Control and Ghost mode share recordings, not storage keys.
// Recover an EXISTING local Race Control top-ten replay without touching
// official PB timestamps, ghost keys, online records or historical ghosts.
import {getCircuitRecord} from '../stats/localRaceRecords.js';
import {ghostReplayCompatibility} from './ghostTrackCompatibility.js';

export function findRaceControlGhost(trackKey,track,officialBestMs){
  const key=String(trackKey||'');
  if(!key)return null;
  let record;
  try{record=getCircuitRecord(key);}catch{return null;}
  const keys=[record?.ghostKey,...(record?.topLaps||[]).map(lap=>lap?.replayKey)];
  const seen=new Set(),found=[];
  for(const storageKey of keys){
    if(!storageKey||seen.has(storageKey))continue;
    seen.add(storageKey);
    try{
      const ghost=JSON.parse(localStorage.getItem(storageKey)||'null');
      if(!ghost||String(ghost.trackKey||ghost.trackId||'')!==key)continue;
      const lapMs=Number(ghost.lapMs);
      if(!Number.isFinite(lapMs)||lapMs<=1000||!Array.isArray(ghost.samples)||ghost.samples.length<5)continue;
      if(!ghostReplayCompatibility(ghost,key,track).compatible)continue;
      found.push(ghost);
    }catch{}
  }
  found.sort((a,b)=>Number(a.lapMs)-Number(b.lapMs));
  const bestMs=Number(officialBestMs);
  const pb=Number.isFinite(bestMs)&&bestMs>1000
    ?found.find(ghost=>Math.abs(Number(ghost.lapMs)-bestMs)<=2):null;
  return pb?{ghost:pb,isOfficialPb:true}:found.length?{ghost:found[0],isOfficialPb:false}:null;
}

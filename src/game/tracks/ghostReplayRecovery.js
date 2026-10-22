// Race Control and Ghost mode share recordings, not storage keys.
// Recover an EXISTING local Race Control top-ten replay without touching
// official PB timestamps, ghost keys, online records or historical ghosts.
import {getCircuitRecord} from '../stats/localRaceRecords.js';
import {ghostReplayCompatibility,ghostGeometryRevision} from './ghostTrackCompatibility.js';

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

export function persistOfficialPersonalBestReplay({trackKey,track,lapMs,replay,ttKey,ttBest}){
  // Persist from the very same recorded lap that Race Control just archived.
  // This also repairs older devices that have a local PB with no ghostPb.
  const id=String(trackKey||''),time=Number(lapMs);
  if(!id||!replay||!Number.isFinite(time)||time<=1000||
    Math.abs(Number(replay.lapMs)-time)>2||
    String(replay.trackKey||'')!==id||!Array.isArray(replay.samples)||
    replay.samples.length<5||!ghostReplayCompatibility(replay,id,track).compatible)return false;
  const revision=ghostGeometryRevision(id,track);
  if(!revision)return false;
  const pbKey='tdr2:ghostPb:'+id;
  try{
    const old=JSON.parse(localStorage.getItem(pbKey)||'null');
    if(old&&Math.abs(Number(old.lapMs)-time)<=2&&
      ghostReplayCompatibility(old,id,track).compatible)return false;
    const saved={...replay,version:8,kind:'circuit-personal-best',
      trackKey:id,geometryRevision:revision};
    localStorage.setItem(pbKey,JSON.stringify(saved));
    // Update only the playback pointer of the exact existing PB. Never
    // overwrite official time, lap history, nickname or online leaderboard.
    if(ttKey){
      const record=JSON.parse(localStorage.getItem(ttKey)||'null');
      if(record&&Math.abs(Number(record.lapMs)-time)<=2){
        const enriched={...record,ghostKey:pbKey,ghostVersion:8,carId:saved.carId,
          recordedAt:saved.recordedAt};
        localStorage.setItem(ttKey,JSON.stringify(enriched));
        if(ttBest&&Math.abs(Number(ttBest.lapMs)-time)<=2)
          Object.assign(ttBest,{ghostKey:pbKey,ghostVersion:8,carId:saved.carId,
            recordedAt:saved.recordedAt});
      }
    }
    return true;
  }catch{return false;}
}

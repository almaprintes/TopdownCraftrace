import { getCircuitRecord } from '../stats/localRaceRecords.js';

// A personal best only qualifies when this SESSION beats the PB that existed
// before the green light. The game updates ttBest immediately per lap, so
// comparing with ttBest at report time would silently miss real improvements.
export function sessionPersonalBest(report,previousMs){
  const lapMs=Math.round(Number(report?.bestMs));
  if(!Number.isFinite(lapMs)||lapMs<=1000)return null;
  if(!Array.isArray(report?.laps)||!report.laps.some(l=>l?.valid!==false&&l?.invalid!==true&&Math.abs(Number(l?.lapMs)-lapMs)<2))return null;
  const previous=Number(previousMs);
  const hasPrevious=Number.isFinite(previous)&&previous>1000;
  if(hasPrevious&&lapMs>=previous-0.5)return null;
  return {lapMs,previousMs:hasPrevious?Math.round(previous):null,
    improvementMs:hasPrevious?Math.round(previous-lapMs):null};
}
// The report and RACE Control must resolve the SAME exact PB recording.
// On some Android race paths the authoritative replay is persisted under
// tdr2:topReplay (via ttBest.ghostKey), not the older tdr2:ghost key.
// Never fall back to a different lap: the rewarded ad may only start after
// validating track, car, time and actual replay samples.
export function localRecordGhost(trackId,carId,bestMs){
  const track=String(trackId||'').trim(),car=String(carId||'').trim(),ms=Math.round(Number(bestMs));
  if(!track||!car||!Number.isFinite(ms)||ms<=1000)return null;
  const readMatching=key=>{
    if(!key||typeof key!=='string')return null;
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'null');
      if(!raw||String(raw.trackKey||raw.trackId||'')!==track||String(raw.carId||'')!==car)return null;
      if(!Number.isFinite(Number(raw.lapMs))||Math.abs(Number(raw.lapMs)-ms)>2)return null;
      if(!Array.isArray(raw.samples)||raw.samples.length<5)return null;
      return raw;
    }catch{return null;}
  };
  const legacy=readMatching(`tdr2:ghost:${track}:${car}`);
  if(legacy)return legacy;
  // Reuse the official local PB/replay identity shown by the Records screen.
  // Its ghostKey may point to a saved topReplay rather than to the ghost-mode
  // storage key. Both are local, no network calls or advertisement needed.
  let record=null;
  try{record=getCircuitRecord(track);}catch{return null;}
  if(!record||Math.abs(Number(record.bestLapMs)-ms)>2)return null;
  if(record.bestCarId&&String(record.bestCarId)!==car)return null;
  const keys=[record.ghostKey,...(record.topLaps||[])
    .filter(lap=>Math.abs(Number(lap?.lapMs)-ms)<=2
      &&(!lap?.carId||String(lap.carId)===car))
    .map(lap=>lap.replayKey)];
  for(const key of new Set(keys)){
    const replay=readMatching(key);
    if(replay)return replay;
  }
  return null;
}
export const RECORD_PUBLISH_DISCLOSURE=
  'Publicarlo requiere ver voluntariamente un anuncio recompensado (aprox. 30 segundos). No aparecerá automáticamente.';
export function fmtPersonalBest(ms){
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),f=Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(f).padStart(3,'0')}`;
}

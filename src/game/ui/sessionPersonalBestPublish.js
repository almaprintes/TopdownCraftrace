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
export function localRecordGhost(trackId,carId,bestMs){
  if(!trackId||!carId)return null;
  const key=`tdr2:ghost:${trackId}:${carId}`;
  try{
    const raw=JSON.parse(localStorage.getItem(key)||'null');
    if(!raw||raw.trackKey!==trackId||raw.carId!==carId)return null;
    if(Math.abs(Number(raw.lapMs)-Math.round(bestMs))>2)return null;
    if(!Array.isArray(raw.samples)||raw.samples.length<5)return null;
    return raw;
  }catch{return null;}
}
export const RECORD_PUBLISH_DISCLOSURE=
  'Publicarlo requiere ver voluntariamente un anuncio recompensado (aprox. 30 segundos). No aparecerá automáticamente.';
export function fmtPersonalBest(ms){
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),f=Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(f).padStart(3,'0')}`;
}

// Diagnostic-only local context. Save ONLY on deliberate COPIAR; never
// upload reports, poll sensors or collect information without user opt-in.
export const PREVIOUS_RACE_MEASUREMENT_KEY='tdr2:supportLastRaceMeasurement:v1';
export const THERMAL_TOUCH_LEVELS=Object.freeze(['SIN INDICAR','FRÍO','TEMPLADO','CALIENTE','MUY CALIENTE']);
const MAX_AGE_MS=90*24*60*60*1000;

export function loadPreviousRaceMeasurement(storage,now=Date.now()){
  try{
    const data=JSON.parse(storage?.getItem?.(PREVIOUS_RACE_MEASUREMENT_KEY)||'null');
    const finishedAt=Number(data?.finishedAt);
    if(!Number.isFinite(finishedAt)||finishedAt<=0||finishedAt>now+60000||now-finishedAt>MAX_AGE_MS)return null;
    const fps=Number(data?.fps),over50Percent=Number(data?.over50Percent),p95=Number(data?.p95);
    return {finishedAt,fps:Number.isFinite(fps)&&fps>=0?fps:null,over50Percent:Number.isFinite(over50Percent)&&over50Percent>=0&&over50Percent<=100?over50Percent:null,p95:Number.isFinite(p95)&&p95>=0?p95:null};
  }catch{return null;}
}
export function savePreviousRaceMeasurement(storage,data){
  try{
    if(!Number.isFinite(data?.finishedAt)||data.finishedAt<=0||!Number.isFinite(data?.fps)||data.fps<=0)return false;
    storage?.setItem?.(PREVIOUS_RACE_MEASUREMENT_KEY,JSON.stringify({
      finishedAt:data.finishedAt,
      fps:data.fps,
      over50Percent:data.over50Percent,
      p95:data.p95
    }));
    return true;
  }catch{return false;}
}
export function localMeasurementTime(epoch){
  try{
    if(!Number.isFinite(epoch))return 'NO DISPONIBLE';
    return new Intl.DateTimeFormat('es-ES',{
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',
      hour12:false,timeZoneName:'short'
    }).format(new Date(epoch));
  }catch{return 'NO DISPONIBLE';}
}
export function formatMeasurementDuration(milliseconds){
  if(!Number.isFinite(milliseconds)||milliseconds<0)return 'NO DISPONIBLE';
  let seconds=Math.floor(milliseconds/1000);
  const days=Math.floor(seconds/86400);seconds%=86400;
  const hours=Math.floor(seconds/3600);seconds%=3600;
  const minutes=Math.floor(seconds/60);seconds%=60;
  return [days?days+'d':null,hours?hours+'h':null,minutes?minutes+'min':null,
    (!days&&!hours?seconds+'s':null)].filter(Boolean).join(' ');
}
export function previousMeasurementContext(previous,startedAt){
  if(!previous)return 'ANTERIOR: SIN PRUEBA GUARDADA';
  const elapsed=startedAt-previous.finishedAt;
  return 'ANTERIOR: '+localMeasurementTime(previous.finishedAt)+' · desde su fin '+formatMeasurementDuration(elapsed);
}

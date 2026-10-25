// No network/export is triggered automatically. Admin Hub displays a local
// human-readable report from the existing runtime diagnostics and finish-lap log.
export const RUNTIME_LAST_ERROR_KEY='tdr2:runtimeLastJsError';
export const RUNTIME_LAST_EVENT_KEY='tdr2:runtimeLastEvent';
export const RUNTIME_FLIGHT_KEY='tdr2:runtimeFlightRecorder';
export const RACE_LAST_LAP_ERROR_KEY='tdr2:raceLastLapError';
const parse=(storage,key)=>{
  try{const s=storage?.getItem?.(key);return s?JSON.parse(s):null;}catch{return null;}
};
const clip=(value,max=1200)=>String(value??'').slice(0,max);
const crashKinds=new Set(['js_error','promise_rejection','webglcontextlost','unexpected_reload']);
export function summarizeStoredRuntimeErrors(storage){
  const last=parse(storage,RUNTIME_LAST_EVENT_KEY);
  const pinned=parse(storage,RUNTIME_LAST_ERROR_KEY);
  const history=parse(storage,RUNTIME_FLIGHT_KEY);
  const lap=parse(storage,RACE_LAST_LAP_ERROR_KEY);
  const events=Array.isArray(history)?history.filter(x=>crashKinds.has(x?.type)).slice(-8):[];
  const candidates=[pinned,last,...events]
    .filter(v=>v&&typeof v==='object'&&crashKinds.has(v.type))
    .map(e=>({at:clip(e.at,60),type:clip(e.type,60),scene:clip(e.scene,80),
      message:clip(e.message),source:clip(e.source,700),
      line:Number(e.line)||0,column:Number(e.column)||0,
      track:clip(e.track,80),textureCount:Number(e.textureCount)||0}));
  const seen=new Set();
  const errors=candidates.filter(e=>{
    const key=[e.at,e.type,e.message,e.scene].join('/');
    if(seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const lapError=lap&&typeof lap==='object'?{
    at:clip(lap.at,60),phase:clip(lap.phase,70),track:clip(lap.track,80),
    car:clip(lap.car,80),lapMs:Number(lap.lapMs)||0,
    message:clip(lap.message),stack:clip(lap.stack,1600)}:null;
  return {errors,lapError};
}
export function formatStoredRuntimeErrors(storage){
  const report=summarizeStoredRuntimeErrors(storage);
  if(!report.errors.length&&!report.lapError)return 'Todavía no hay ningún error JavaScript registrado en este dispositivo.';
  const lines=['TOP DOWN RACE · INFORME LOCAL DE ERRORES',
    'Hora del dispositivo: '+new Date().toISOString(),
    'Los registros proceden de ESTA PWA en ESTE dispositivo. No se envían automáticamente.',
    ''];
  report.errors.forEach((e,i)=>{
    lines.push('ERROR '+(i+1)+' · '+e.type+' · '+e.at,
      'Escena: '+e.scene+' · Circuito: '+e.track,
      'Mensaje: '+(e.message||'(sin mensaje)'),
      'Archivo: '+e.source+(e.line?' · línea '+e.line+':'+e.column:''),
      'Texturas: '+e.textureCount,'');
  });
  if(report.lapError){
    const e=report.lapError;
    lines.push('ERROR RECUPERABLE AL CRUZAR META · '+e.at,
      'Fase: '+e.phase+' · Circuito: '+e.track+' · Coche: '+e.car,
      'Vuelta: '+e.lapMs+' ms','Mensaje: '+e.message,
      'Stack: '+e.stack,'');
  }
  return lines.join('\n');
}

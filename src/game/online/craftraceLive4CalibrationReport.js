// LIVE 4 G calibration notebook, local to this browser. No Supabase upload,
// no invitation codes, room IDs or account IDs leave the device.
// One tap copies up to the last 10 completed races as structured JSON.
export const LIVE4_G_REPORT_KEY='tdr:dev:live4:g:reports:v1';
export const LIVE4_G_REPORT_LIMIT=10;
const num=value=>value===null||value===undefined||value===''?null:
 Number.isFinite(Number(value))?Number(value):null;
const integer=value=>num(value)===null?null:Math.max(0,Math.round(Number(value)));
const cleanName=value=>String(value||'Piloto').slice(0,70);
const arr=value=>Array.isArray(value)?value:[];
const round=(value,places=3)=>{
 const v=num(value);return v===null?null:Number(v.toFixed(places));
};
const safeTime=value=>{
 const v=num(value);return v!==null&&v>=0&&v<=7200000?Math.round(v):null;
};

export function buildLive4CalibrationReport({
 trackId,carId,laps,direction,physicsVersion,aiDifficulty,
 playerStartDelayMs,firstMotionThresholdPxS,generatedAt,entries,bots,diagnostics
}={}){
 const aiBySeat=new Map(arr(bots).map(bot=>[bot.seat,bot]));
 const records=arr(entries).map(entry=>{
  const bot=aiBySeat.get(entry.seat);
  const lapTimes=arr(entry.lapTimes).map(safeTime);
  const rolls=new Map(arr(bot?.bezierDieHistory).map(x=>[x.lap,x]));
  const telemetry=new Map(arr(bot?.bezierLapTelemetry).map(x=>[x.lap,x]));
  return{
   seat:integer(entry.seat),
   piloto:cleanName(entry.name),
   tipo:entry.kind==='ai'?'IA':'humano',
   totalMs:safeTime(entry.elapsedMs)??(
    lapTimes.length&&lapTimes.every(x=>x!==null)?lapTimes.reduce((a,b)=>a+b,0):null),
   ...(bot&&Number.isFinite(Number(bot.aiPilotElo))?{elo:integer(bot.aiPilotElo)}:{}),
   vueltas:lapTimes.map((t,index)=>{
    const lap=index+1,roll=rolls.get(lap),measure=telemetry.get(lap);
    return{
     n:lap,ms:t,
     ...(roll?{dado:integer(roll.face),desvioPrevistoPx:round(roll.plannedVariationPx,2)}:{}),
     ...(measure?{
       errorObjetivoMedioPx:round(measure.meanLineErrorPx,2),
       errorObjetivoMaxPx:round(measure.maxLineErrorPx,2),
       velocidadMediaPxS:round(measure.meanSpeedPxS,2),
       frenadaMediaPct:round(num(measure.meanBrake)===null?null:measure.meanBrake*100,2),
       ...(num(measure.brakeActivePct)!==null?{fotogramasFrenandoPct:round(measure.brakeActivePct,2)}:{}),
       ...(num(measure.peakBrake)!==null?{frenadaMaximaPct:round(measure.peakBrake*100,2)}:{}),
       giroMedio:round(measure.meanAbsSteer,3),
       muestras:integer(measure.samples)
     }:{})
    };
   })
  };
 });
 const timing=diagnostics?.timing||{};
 return{
  formato:'CRAFT_RACE_LIVE4_G_V1',
  fechaUTC:String(generatedAt||new Date().toISOString()),
  circuito:String(trackId||'desconocido').slice(0,65),
  coche:String(carId||'desconocido').slice(0,65),
  vueltasPrevistas:integer(laps),
  sentido:String(direction||'forward').slice(0,20),
  versionFisicas:integer(physicsVersion),
  nivelIA:integer(aiDifficulty),
  salidaHumano:{
   esperaPrimerMovimientoMs:safeTime(playerStartDelayMs),
   umbralMovimientoPxS:num(firstMotionThresholdPxS),
   reloj:'GO → primer desplazamiento físico',
   incluidoEnPrimeraVuelta:true
  },
  pilotoDatos:records,
  diagnostico:{
   iaHitches:integer(timing.hitches),
   segundosSinIntegrar:round(timing.droppedSeconds,3),
   pilotos:arr(diagnostics?.cornerDiagnostics).map(x=>({
     plaza:integer(x.seat),
     objetivoLateralPct:round(x.targetMeanPct,1),
     lateralRealPct:round(x.lateralMeanPct,1),
     errorSeguimientoPct:round(x.followMeanErrorPct,1)
   }))
  },
  notas:'El error de seguimiento es respecto a la trayectoria objetivo, no a la Bézier ideal. Los tiempos son observados en el dispositivo.'
 };
}

export function readLive4CalibrationHistory(store){
 try{
  const parsed=JSON.parse(store?.getItem(LIVE4_G_REPORT_KEY)||'[]');
  return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.key==='string'&&
   x.report?.formato==='CRAFT_RACE_LIVE4_G_V1').slice(-LIVE4_G_REPORT_LIMIT):[];
 }catch{return [];}
}

export function saveLive4CalibrationReport(store,key,report){
 const old=readLive4CalibrationHistory(store);
 const existing=old.filter(row=>row.key!==key);
 const recent=[...existing,{key:String(key),report}].slice(-LIVE4_G_REPORT_LIMIT);
 if(!store||typeof store.setItem!=='function')return{history:recent,persisted:false};
 try{
  store?.setItem(LIVE4_G_REPORT_KEY,JSON.stringify(recent));
  return{history:recent,persisted:true};
 }catch{return{history:recent,persisted:false};}
}

// Start a new comparison batch without losing the race just completed.
// Only rewrites this DEV G notebook key, never game progress or other data.
export function startNewLive4CalibrationBatch(store,key,report){
 if(!report||report.formato!=='CRAFT_RACE_LIVE4_G_V1')throw Error('Informe de carrera inválido');
 const history=[{key:String(key),report}];
 if(!store||typeof store.setItem!=='function')return {history,persisted:false};
 try{
  store.setItem(LIVE4_G_REPORT_KEY,JSON.stringify(history));
  return {history,persisted:true};
 }catch{return {history,persisted:false};}
}

export function formatLive4CalibrationHistory(history){
 const reports=arr(history).slice(-LIVE4_G_REPORT_LIMIT)
  .map(row=>row.report).filter(x=>x?.formato==='CRAFT_RACE_LIVE4_G_V1');
 return JSON.stringify({
  tipo:'CRAFT_RACE_CALIBRACION',
  version:1,
  totalCarreras:reports.length,
  carreras:reports
 },null,2);
}

// Clipboard fallback for standalone iPhone PWA or a non-secure browser.
// Must be invoked from the copy button's direct user gesture.
export async function copyLive4CalibrationText(text,{
 clipboard=globalThis.navigator?.clipboard,doc=globalThis.document
}={}){
 if(typeof clipboard?.writeText==='function'){
  try{await clipboard.writeText(text);return true;}catch{/* legacy fallback */}
 }
 if(!doc?.createElement||!doc?.body)return false;
 const area=doc.createElement('textarea');
 area.value=text;
 area.setAttribute('readonly','');
 area.style.cssText='position:fixed;left:-10000px;top:0;opacity:0;';
 doc.body.append(area);area.focus();area.select();
 let success=false;
 try{success=doc.execCommand?.('copy')===true;}catch{}
 area.remove();
 return success;
}

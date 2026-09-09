import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';

function fmtLap(ms){
  const value=Number(ms);
  if(!Number.isFinite(value)||value<=0)return'—';
  const m=Math.floor(value/60000),s=Math.floor((value%60000)/1000),x=Math.floor(value%1000);
  return`${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
}

function pct(value){
  return Number(value).toFixed(1).replace('.',',');
}

function validSectorSet(value){
  return Array.isArray(value)&&value.length>=3&&value.slice(0,3).every(v=>Number.isFinite(Number(v))&&Number(v)>0);
}

function mainSectorLoss(current,reference){
  if(!validSectorSet(current)||!validSectorSet(reference))return null;
  const delta=current.slice(0,3).map((v,i)=>Number(v)-Number(reference[i]));
  let index=0;
  for(let i=1;i<delta.length;i++)if(delta[i]>delta[index])index=i;
  return delta[index]>20?{sector:index+1,deltaMs:delta[index]}:null;
}

function sessionEngineerReading(report,scene){
  const laps=(Array.isArray(report?.laps)?report.laps:[])
    .filter(l=>Number.isFinite(Number(l?.lapMs))&&Number(l.lapMs)>0)
    .map((l,i)=>({...l,n:Number(l?.n)||i+1,lapMs:Number(l.lapMs)}));
  if(!laps.length)return'No hay suficientes vueltas válidas para analizar la tanda todavía.';

  const history=Array.isArray(scene?.ttHistory)?scene.ttHistory:[];
  const baseline=Math.max(0,Number(scene?._sessionLapBaseline)||0);
  const clean=laps.map((_,i)=>history[baseline+i]).map(r=>typeof r?.tdrCleanLap==='boolean'?r.tdrCleanLap:null);
  const dirtyCount=clean.filter(v=>v===false).length;
  const allKnownClean=clean.length===laps.length&&clean.every(v=>v===true);

  const times=laps.map(l=>l.lapMs);
  const bestMs=Math.min(...times),worstMs=Math.max(...times);
  const bestIndex=times.indexOf(bestMs);
  const first=laps[0],best=laps[bestIndex],last=laps[laps.length-1];
  const spreadPct=bestMs>0?(worstMs-bestMs)/bestMs:0;
  const improvementPct=first.lapMs>0?(first.lapMs-bestMs)/first.lapMs:0;
  const bestLabel=`V${best.n} (${fmtLap(bestMs)})`;

  if(laps.length===1){
    return allKnownClean
      ?`Primera referencia de la tanda: ${bestLabel}. Vuelta limpia; ahora toca construir ritmo sobre ella.`
      :`Primera referencia de la tanda: ${bestLabel}. Necesitamos más vueltas para leer la evolución del ritmo.`;
  }

  if(dirtyCount>0){
    const word=dirtyCount===1?'una vuelta quedó marcada como no limpia':`${dirtyCount} vueltas quedaron marcadas como no limpias`;
    return`Tu mejor referencia fue ${bestLabel}, pero ${word}. Antes de buscar más velocidad, conviene consolidar vueltas válidas y repetibles.`;
  }

  // Progress is measured from the first canonical lap in the report to the
  // actual best canonical lap. This is a reduction in lap time, not an
  // ambiguous "percent faster" calculation.
  if(bestIndex>0&&improvementPct>=0.025){
    let text=`Gran progresión: bajaste de ${fmtLap(first.lapMs)} en V${first.n} a ${fmtLap(bestMs)} en V${best.n}, reduciendo el tiempo un ${pct(improvementPct*100)} %.`;
    if(bestIndex<laps.length-1&&last.lapMs>bestMs+20){
      const loss=last.lapMs-bestMs;
      const sectorLoss=mainSectorLoss(last.sectors,best.sectors);
      text+=` En V${last.n} cediste ${(loss/1000).toFixed(3).replace('.',',')} s respecto a esa referencia`;
      if(sectorLoss)text+=`, principalmente en S${sectorLoss.sector}`;
      text+='.';
    }else if(bestIndex===laps.length-1){
      text+=' Cerraste la tanda con tu mejor vuelta.';
    }
    return text;
  }

  if(allKnownClean&&spreadPct<=0.025){
    const delta=((worstMs-bestMs)/1000).toFixed(3).replace('.',',');
    return`Tanda muy sólida y limpia. Solo ${delta} s separan tu mejor y tu peor vuelta; estás construyendo una base de ritmo muy consistente.`;
  }

  if(bestIndex===0&&last.lapMs>=first.lapMs*1.07&&laps.length>=3){
    return`Saliste muy fuerte: ${bestLabel} fue tu mejor vuelta. Después el ritmo cayó; intenta recuperar la precisión de esa primera referencia.`;
  }

  if(spreadPct<=0.045){
    return`Buen nivel de consistencia. Tu mejor referencia fue ${bestLabel} y las vueltas se mantuvieron en una ventana pequeña; ahora toca buscar décimas sin romper ese ritmo.`;
  }

  if(bestIndex===0&&laps.length>=3){
    return`La velocidad estaba desde el principio: ${bestLabel} fue la referencia. El reto está en sostener ese nivel durante toda la tanda.`;
  }

  if(bestIndex===laps.length-1){
    return`Terminaste encontrando tu mejor ritmo: ${bestLabel}. Buena señal; estabas entendiendo mejor el circuito conforme avanzaba la tanda.`;
  }

  return`Tu mejor vuelta fue ${bestLabel}. Hay rendimiento, pero todavía existe variación entre vueltas; el siguiente paso es convertir esa vuelta rápida en ritmo repetible.`;
}

// Final authority for the session report narrative. The legacy report exporter
// serializes the report object created by _buildReport(), so the engineer text
// must live in report.verdict BEFORE either the visible DOM or exported asset is
// rendered. Patching the DOM afterwards cannot change an already-captured r.
export class RaceScene extends CurrentRaceScene {
  _buildReport(...args){
    const report=super._buildReport?.(...args)||{};
    const reading=sessionEngineerReading(report,this);
    report.verdict=reading;
    this._tdrSessionEngineerReading=reading;
    return report;
  }

  _patchSessionReading(){
    const modal=this._sessionReportModal;
    const reading=String(this._tdrSessionEngineerReading||'').trim();
    if(!modal?.querySelector||!reading)return false;
    const target=modal.querySelector('.insight p');
    if(!target)return false;
    target.textContent=reading;
    target.dataset.tdrDynamicSessionReading='1';
    return true;
  }

  _openPauseMenu(...args){
    const alreadyPaused=this._tdrPauseMenuOpen===true||!!this._experiencePauseUi?.root?.isConnected;
    if(!alreadyPaused&&!Number.isFinite(this._tdrPauseTimingStartedAt)){
      this._tdrPauseTimingStartedAt=performance.now();
      this._tdrPauseTimingStartedTick=Number.isFinite(Number(this.simTick))?Number(this.simTick):null;
    }
    return super._openPauseMenu?.(...args);
  }

  _closePauseMenu(resume=true){
    const startedAt=Number(this._tdrPauseTimingStartedAt);
    const startedTick=Number(this._tdrPauseTimingStartedTick);
    const pausedMs=Number.isFinite(startedAt)?Math.max(0,performance.now()-startedAt):0;
    const currentTick=Number(this.simTick);
    const pausedTicks=Number.isFinite(startedTick)&&Number.isFinite(currentTick)?Math.max(0,currentTick-startedTick):0;

    // Physics pause stops the car but the base timing clocks keep advancing.
    // Advance BOTH timing origins before resuming so menu time never enters
    // lap/sector times, history, ghost timing or telemetry tick deltas.
    if(resume!==false){
      if(pausedMs>0&&this.timing?.started&&Number.isFinite(this.timing?.lapStart))this.timing.lapStart+=pausedMs;
      if(pausedTicks>0&&Number.isFinite(this.lapStartTick))this.lapStartTick+=pausedTicks;
      this._tdrPauseTimingStartedAt=NaN;
      this._tdrPauseTimingStartedTick=null;
    }

    return super._closePauseMenu?.(resume);
  }
}

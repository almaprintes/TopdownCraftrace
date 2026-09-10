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

function clamp01(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}

function formatDeltaValue(ms){
  const value=Number(ms);
  if(!Number.isFinite(value))return'—';
  const sign=value>15?'+':value<-15?'−':'±';
  return`${sign}${(Math.abs(value)/1000).toFixed(3)} s`;
}

function interpolateTrace(trace,progress){
  if(!Array.isArray(trace)||trace.length<2)return null;
  const p=clamp01(progress);
  let previous=trace[0];
  for(let i=1;i<trace.length;i++){
    const next=trace[i];
    if(p<=Number(next?.p)){
      const p0=Number(previous?.p),p1=Number(next?.p);
      const t0=Number(previous?.t),t1=Number(next?.t);
      if(![p0,p1,t0,t1].every(Number.isFinite)||p1<=p0)return Number.isFinite(t1)?t1:null;
      const f=Math.max(0,Math.min(1,(p-p0)/(p1-p0)));
      return t0+(t1-t0)*f;
    }
    previous=next;
  }
  const last=trace[trace.length-1];
  return Number.isFinite(Number(last?.t))?Number(last.t):null;
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

  _tdrDeltaStorageKey(){
    const track=String(this.trackKey||this.track?.key||this.track?.id||'track');
    return`tdr2:liveDeltaTrace:v1:${track}`;
  }

  _tdrEnsureLiveDeltaUi(){
    if(typeof document==='undefined')return null;
    if(this._tdrLiveDeltaUi?.root?.isConnected)return this._tdrLiveDeltaUi;

    const parent=this.game?.canvas?.parentElement||document.body;
    const root=document.createElement('div');
    root.id='tdr-live-delta-panel';
    root.setAttribute('aria-hidden','true');
    Object.assign(root.style,{
      position:'absolute',
      left:'50%',
      top:'calc(env(safe-area-inset-top, 0px) + 86px)',
      transform:'translateX(-50%)',
      width:'clamp(190px, 25vw, 292px)',
      minWidth:'190px',
      boxSizing:'border-box',
      padding:'7px 12px 8px',
      borderRadius:'12px',
      border:'1px solid rgba(255,255,255,.18)',
      background:'linear-gradient(180deg,rgba(6,10,18,.88),rgba(6,10,18,.72))',
      boxShadow:'0 6px 20px rgba(0,0,0,.30)',
      backdropFilter:'blur(7px)',
      WebkitBackdropFilter:'blur(7px)',
      pointerEvents:'none',
      zIndex:'2147483000',
      color:'#fff',
      fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      textAlign:'center',
      opacity:'0',
      transition:'opacity .12s ease',
      userSelect:'none'
    });

    const label=document.createElement('div');
    label.textContent='VS MEJOR VUELTA';
    Object.assign(label.style,{
      fontSize:'9px',fontWeight:'800',letterSpacing:'.18em',opacity:'.72',lineHeight:'1.15'
    });

    const value=document.createElement('div');
    value.textContent='±0.000 s';
    Object.assign(value.style,{
      marginTop:'2px',fontSize:'clamp(22px, 2.55vw, 31px)',fontWeight:'900',letterSpacing:'.035em',lineHeight:'1.05',
      fontVariantNumeric:'tabular-nums',textShadow:'0 2px 4px rgba(0,0,0,.55)'
    });

    const state=document.createElement('div');
    state.textContent='IGUALADO';
    Object.assign(state.style,{
      marginTop:'2px',fontSize:'9px',fontWeight:'850',letterSpacing:'.12em',lineHeight:'1.15'
    });

    const rail=document.createElement('div');
    Object.assign(rail.style,{
      position:'relative',height:'5px',marginTop:'6px',borderRadius:'999px',background:'rgba(255,255,255,.14)',overflow:'visible'
    });
    const center=document.createElement('div');
    Object.assign(center.style,{
      position:'absolute',left:'50%',top:'-2px',width:'1px',height:'9px',background:'rgba(255,255,255,.55)',transform:'translateX(-.5px)'
    });
    const marker=document.createElement('div');
    Object.assign(marker.style,{
      position:'absolute',left:'50%',top:'50%',width:'11px',height:'11px',borderRadius:'50%',transform:'translate(-50%,-50%)',
      background:'#fff',boxShadow:'0 0 0 2px rgba(0,0,0,.35),0 0 10px rgba(255,255,255,.25)',transition:'left .08s linear, background-color .08s linear'
    });
    rail.append(center,marker);

    root.append(label,value,state,rail);
    parent.appendChild(root);

    const destroy=()=>{
      try{root.remove();}catch{}
      if(this._tdrLiveDeltaUi?.root===root)this._tdrLiveDeltaUi=null;
    };
    try{this.events?.once?.('shutdown',destroy);this.events?.once?.('destroy',destroy);}catch{}

    this._tdrLiveDeltaUi={root,label,value,state,rail,marker};
    return this._tdrLiveDeltaUi;
  }

  _tdrLoadDeltaReference(bestMs){
    const lapMs=Number(bestMs);
    if(!Number.isFinite(lapMs)||lapMs<=0)return null;
    if(this._tdrDeltaReference&&Math.abs(Number(this._tdrDeltaReference.lapMs)-lapMs)<=5)return this._tdrDeltaReference;
    try{
      const stored=JSON.parse(localStorage.getItem(this._tdrDeltaStorageKey())||'null');
      if(stored&&Math.abs(Number(stored.lapMs)-lapMs)<=5&&Array.isArray(stored.trace)&&stored.trace.length>=2){
        this._tdrDeltaReference={lapMs:Number(stored.lapMs),trace:stored.trace};
        return this._tdrDeltaReference;
      }
    }catch{}
    this._tdrDeltaReference=null;
    return null;
  }

  _tdrSaveBestDeltaTrace(lapMs,trace){
    const total=Number(lapMs);
    if(!Number.isFinite(total)||total<=0||!Array.isArray(trace)||trace.length<2)return;
    const clean=[{p:0,t:0}];
    for(const sample of trace){
      const p=clamp01(sample?.p),t=Number(sample?.t);
      if(!Number.isFinite(t)||t<0||p<=clean[clean.length-1].p)continue;
      clean.push({p:Number(p.toFixed(5)),t:Math.round(t)});
    }
    if(clean[clean.length-1].p<0.999)clean.push({p:1,t:Math.round(total)});
    else clean[clean.length-1]={p:1,t:Math.round(total)};
    if(clean.length<3)return;
    const payload={lapMs:Math.round(total),trace:clean};
    try{localStorage.setItem(this._tdrDeltaStorageKey(),JSON.stringify(payload));}catch{}
    this._tdrDeltaReference=payload;
  }

  _tdrSampleDeltaLap(now){
    const lapStart=Number(this.timing?.lapStart);
    if(!this.timing?.started||!Number.isFinite(lapStart))return;
    if(this._tdrDeltaLapStart!==lapStart){
      this._tdrDeltaLapStart=lapStart;
      this._tdrDeltaCurrentTrace=[];
    }
    const progress=clamp01(this.ttHud?.progress01);
    const elapsed=Math.max(0,Number(now)-lapStart);
    if(!Number.isFinite(elapsed)||progress<=0)return;
    const trace=this._tdrDeltaCurrentTrace||(this._tdrDeltaCurrentTrace=[]);
    const last=trace[trace.length-1];
    if(!last||progress-last.p>=0.004){
      trace.push({p:progress,t:elapsed});
      if(trace.length>320)trace.splice(1,1);
    }
  }

  _tdrRenderLiveDelta(now){
    const ui=this._tdrEnsureLiveDeltaUi();
    if(!ui)return;
    const bestMs=Number(this.ttBest?.lapMs);
    const lapStart=Number(this.timing?.lapStart);
    const progress=clamp01(this.ttHud?.progress01);
    if(!this.timing?.started||!Number.isFinite(lapStart)||!Number.isFinite(bestMs)||bestMs<=0||progress<0.015){
      ui.root.style.opacity='0';
      return;
    }

    const elapsed=Math.max(0,Number(now)-lapStart);
    const reference=this._tdrLoadDeltaReference(bestMs);
    const referenceMs=reference?interpolateTrace(reference.trace,progress):bestMs*progress;
    if(!Number.isFinite(referenceMs)){
      ui.root.style.opacity='0';
      return;
    }

    const delta=elapsed-referenceMs;
    const faster=delta<-15;
    const slower=delta>15;
    const color=faster?'#43f58b':slower?'#ff5f73':'#ffffff';
    const state=faster?'GANANDO TIEMPO':slower?'PERDIENDO TIEMPO':'IGUALADO';

    ui.label.textContent=reference?'VS MEJOR VUELTA':'ESTIMACIÓN · VS MEJOR';
    ui.value.textContent=formatDeltaValue(delta);
    ui.value.style.color=color;
    ui.state.textContent=state;
    ui.state.style.color=color;
    ui.marker.style.background=color;

    // ±3 s fills the useful visual range. Negative (faster) moves left,
    // positive (slower) moves right; extreme values remain readable.
    const normalized=Math.max(-1,Math.min(1,delta/3000));
    ui.marker.style.left=`${50+normalized*46}%`;
    ui.root.style.opacity='1';
  }

  update(time,delta){
    const now=performance.now();
    const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._tdrSampleDeltaLap(now);
    const completedTrace=Array.isArray(this._tdrDeltaCurrentTrace)?this._tdrDeltaCurrentTrace.slice():[];
    const result=super.update?.(time,delta);

    const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    if(historyAfter>historyBefore){
      const row=this.ttHistory[historyAfter-1];
      const lapMs=Number(row?.lapMs);
      const bestMs=Number(this.ttBest?.lapMs);
      if(Number.isFinite(lapMs)&&lapMs>0&&Number.isFinite(bestMs)&&Math.abs(lapMs-bestMs)<=5){
        this._tdrSaveBestDeltaTrace(lapMs,completedTrace);
      }
      this._tdrDeltaLapStart=Number(this.timing?.lapStart);
      this._tdrDeltaCurrentTrace=[];
    }

    this._tdrRenderLiveDelta(performance.now());
    return result;
  }
}

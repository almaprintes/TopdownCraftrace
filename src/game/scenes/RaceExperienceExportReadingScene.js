import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';

// Session readings are selected once in RaceSessionReportScene._buildReport()
// from the JSON catalog. Do not regenerate or replace them in later layers.

function androidDeltaLite(){
  try{return /Android/i.test(String(navigator.userAgent||''));}catch{return false;}
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

// Preserve the JSON-catalog reading already present in report.verdict:
// the modal, post-race overlay and exported HTML must tell the same story.
export class RaceScene extends CurrentRaceScene {
  _buildReport(...args){
    const report=super._buildReport?.(...args)||{};
    const reading=String(report.verdict||'').trim();
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
      backdropFilter:androidDeltaLite()?'none':'blur(7px)',
      WebkitBackdropFilter:androidDeltaLite()?'none':'blur(7px)',
      pointerEvents:'none',
      zIndex:'2147483000',
      color:'#fff',
      fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      textAlign:'center',
      opacity:'0',
      transition:androidDeltaLite()?'none':'opacity .12s ease',
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
      background:'#fff',boxShadow:androidDeltaLite()?'none':'0 0 0 2px rgba(0,0,0,.35),0 0 10px rgba(255,255,255,.25)',transition:androidDeltaLite()?'none':'left .08s linear, background-color .08s linear'
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
    const android=androidDeltaLite();
    if(android&&Number.isFinite(this._tdrDeltaLastRenderAt)&&now-this._tdrDeltaLastRenderAt<100)return
    if(android)this._tdrDeltaLastRenderAt=now;
    const ui=this._tdrEnsureLiveDeltaUi();
    if(!ui)return
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

    const labelText=reference?'VS MEJOR VUELTA':'ESTIMACIÓN · VS MEJOR';
    const valueText=formatDeltaValue(delta);
    if(ui.label.textContent!==labelText)ui.label.textContent=labelText;
    if(ui.value.textContent!==valueText)ui.value.textContent=valueText;
    if(ui.value.style.color!==color)ui.value.style.color=color;
    if(ui.state.textContent!==state)ui.state.textContent=state;
    if(ui.state.style.color!==color)ui.state.style.color=color;
    if(ui.marker.style.background!==color)ui.marker.style.background=color;

    // ±3 s fills the useful visual range. Negative (faster) moves left,
    // positive (slower) moves right; extreme values remain readable.
    const normalized=Math.max(-1,Math.min(1,delta/3000));
    const markerLeft=`${50+normalized*46}%`;
    if(ui.marker.style.left!==markerLeft)ui.marker.style.left=markerLeft;
    if(ui.root.style.opacity!=='1')ui.root.style.opacity='1';
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

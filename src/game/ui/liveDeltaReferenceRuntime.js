function clamp01(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}

function buildReference(lapMs,trace){
  const total=Number(lapMs);
  if(!Number.isFinite(total)||total<=0||!Array.isArray(trace)||trace.length<2)return null;
  const clean=[{p:0,t:0}];
  for(const sample of trace){
    const p=clamp01(sample?.p),t=Number(sample?.t);
    if(!Number.isFinite(t)||t<0||p<=clean[clean.length-1].p)continue;
    clean.push({p:Number(p.toFixed(5)),t:Math.round(t)});
  }
  if(clean.length<2)return null;
  if(clean[clean.length-1].p<0.999)clean.push({p:1,t:Math.round(total)});
  else clean[clean.length-1]={p:1,t:Math.round(total)};
  return clean.length>=3?{lapMs:Math.round(total),trace:clean}:null;
}

function saveSessionReference(scene,lapMs,trace){
  const next=buildReference(lapMs,trace);
  if(!next)return false;
  const previous=scene._tdrSessionDeltaReference;
  if(previous&&Number(previous.lapMs)<=Number(next.lapMs)+5)return false;
  scene._tdrSessionDeltaReference=next;
  scene._tdrDeltaReference=next;
  return true;
}

function interpolateTrace(trace,progress){
  if(!Array.isArray(trace)||trace.length<2)return null;
  const p=clamp01(progress);
  let previous=trace[0];
  for(let i=1;i<trace.length;i++){
    const next=trace[i];
    if(p<=Number(next?.p)){
      const p0=Number(previous?.p),p1=Number(next?.p),t0=Number(previous?.t),t1=Number(next?.t);
      if(![p0,p1,t0,t1].every(Number.isFinite)||p1<=p0)return null;
      const f=Math.max(0,Math.min(1,(p-p0)/(p1-p0)));
      return t0+(t1-t0)*f;
    }
    previous=next;
  }
  return Number(trace[trace.length-1]?.t);
}

function formatDelta(ms){
  const value=Number(ms);
  if(!Number.isFinite(value))return'—';
  const sign=value>15?'+':value<-15?'−':'±';
  return`${sign}${(Math.abs(value)/1000).toFixed(3)} s`;
}

function sampleSessionTrace(scene,now){
  const lapStart=Number(scene.timing?.lapStart);
  if(!scene.timing?.started||!Number.isFinite(lapStart))return;
  if(scene._tdrSessionTraceLapStart!==lapStart){
    scene._tdrSessionTraceLapStart=lapStart;
    scene._tdrSessionCurrentTrace=[];
  }
  const progress=clamp01(scene.ttHud?.progress01);
  const elapsed=Math.max(0,Number(now)-lapStart);
  if(!Number.isFinite(elapsed)||progress<=0)return;
  const trace=scene._tdrSessionCurrentTrace||(scene._tdrSessionCurrentTrace=[]);
  const last=trace[trace.length-1];
  if(!last||progress-last.p>=0.0035){
    trace.push({p:progress,t:elapsed});
    if(trace.length>420)trace.splice(1,1);
  }
}

export function installLiveDeltaReferenceRuntime(RaceScene){
  const proto=RaceScene?.prototype;
  if(!proto||proto.__tdrLiveDeltaReferenceRuntimeInstalled)return;
  proto.__tdrLiveDeltaReferenceRuntimeInstalled=true;

  const originalCreate=proto.create;
  const originalUpdate=proto.update;

  proto.create=function(...args){
    this._tdrSessionDeltaReference=null;
    this._tdrDeltaReference=null;
    this._tdrSessionCurrentTrace=[];
    this._tdrSessionTraceLapStart=null;
    this._tdrSessionPendingTrace=null;
    const result=originalCreate?.apply(this,args);
    this._tdrSessionDeltaReference=null;
    this._tdrDeltaReference=null;
    this._tdrSessionCurrentTrace=[];
    this._tdrSessionPendingTrace=null;
    this._tdrSessionTraceLapStart=Number.isFinite(Number(this.timing?.lapStart))?Number(this.timing.lapStart):null;
    return result;
  };

  proto._tdrLoadDeltaReference=function(){
    const reference=this._tdrSessionDeltaReference;
    return reference&&Array.isArray(reference.trace)&&reference.trace.length>=2?reference:null;
  };

  // The base RaceExperience scene still calls this legacy hook when its
  // historical PB changes. It must NOT be allowed to create the live session
  // reference, otherwise its own trace can win the race against our session
  // trace and lap two ends up behaving like a stopwatch. Session reference
  // ownership lives exclusively in the wrapper below.
  proto._tdrSaveBestDeltaTrace=function(){
    return false;
  };

  proto._tdrRenderLiveDelta=function(now){
    const ui=this._tdrEnsureLiveDeltaUi?.();
    if(!ui)return;
    const reference=this._tdrSessionDeltaReference;
    const lapStart=Number(this.timing?.lapStart);
    const progress=clamp01(this.ttHud?.progress01);
    if(!this.timing?.started||!Number.isFinite(lapStart)||progress<0.01){
      ui.root.style.opacity='0';
      return;
    }

    if(!reference){
      ui.label.textContent='VS MEJOR DE SESIÓN';
      ui.value.textContent='SIN REFERENCIA';
      ui.value.style.color='#ffffff';
      ui.state.textContent='COMPLETA UNA VUELTA';
      ui.state.style.color='rgba(255,255,255,.72)';
      if(ui.rail)ui.rail.style.opacity='.45';
      if(ui.marker){ui.marker.style.left='50%';ui.marker.style.background='#ffffff';}
      ui.root.style.opacity='1';
      return;
    }

    const elapsed=Math.max(0,Number(now)-lapStart);
    const referenceMs=interpolateTrace(reference.trace,progress);
    if(!Number.isFinite(referenceMs)){ui.root.style.opacity='0';return;}
    const delta=elapsed-referenceMs;
    const faster=delta<-15,slower=delta>15;
    const color=faster?'#43f58b':slower?'#ff5f73':'#ffffff';
    ui.label.textContent='VS MEJOR DE SESIÓN';
    ui.value.textContent=formatDelta(delta);
    ui.value.style.color=color;
    ui.state.textContent=faster?'GANANDO TIEMPO':slower?'PERDIENDO TIEMPO':'IGUALADO';
    ui.state.style.color=color;
    if(ui.rail)ui.rail.style.opacity='1';
    if(ui.marker){
      ui.marker.style.background=color;
      const normalized=Math.max(-1,Math.min(1,delta/3000));
      ui.marker.style.left=`${50+normalized*46}%`;
    }
    ui.root.style.opacity='1';
  };

  if(typeof originalUpdate==='function'){
    proto.update=function(time,delta){
      const beforeStart=Number(this.timing?.lapStart);
      sampleSessionTrace(this,performance.now());
      const completedTrace=Array.isArray(this._tdrSessionCurrentTrace)?this._tdrSessionCurrentTrace.slice():[];
      const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;

      const result=originalUpdate.call(this,time,delta);

      const afterStart=Number(this.timing?.lapStart);
      const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      const lapChanged=Number.isFinite(beforeStart)&&Number.isFinite(afterStart)&&Math.abs(afterStart-beforeStart)>1;
      const historyChanged=historyAfter>historyBefore;
      const row=historyChanged?this.ttHistory[historyAfter-1]:null;

      if(lapChanged){
        // Keep the just-finished trace before resetting for the new lap. The
        // lap-start delta is available immediately at the line, so lap two can
        // have a reference on its very first frame even if history is written
        // one frame later on a short circuit such as Karting Tenerife.
        this._tdrSessionPendingTrace=completedTrace;
        const measuredLap=Number.isFinite(Number(row?.lapMs))?Number(row.lapMs):Math.max(0,afterStart-beforeStart);
        if(Number.isFinite(measuredLap)&&measuredLap>1000&&completedTrace.length>=2){
          if(saveSessionReference(this,measuredLap,completedTrace))this._tdrSessionPendingTrace=null;
        }
        this._tdrSessionTraceLapStart=afterStart;
        this._tdrSessionCurrentTrace=[];
      }else if(historyChanged&&Array.isArray(this._tdrSessionPendingTrace)){
        // Fallback only for modes that publish the completed lap to history
        // after the lap-start clock has already rolled over.
        const lapMs=Number(row?.lapMs);
        if(Number.isFinite(lapMs)&&lapMs>1000&&this._tdrSessionPendingTrace.length>=2){
          saveSessionReference(this,lapMs,this._tdrSessionPendingTrace);
          this._tdrSessionPendingTrace=null;
        }
      }

      sampleSessionTrace(this,performance.now());
      this._tdrRenderLiveDelta(performance.now());
      return result;
    };
  }
}

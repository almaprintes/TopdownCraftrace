function clamp01(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}

function buildReference(lapMs,trace,totalDistance){
  const total=Number(lapMs),distance=Number(totalDistance);
  if(!Number.isFinite(total)||total<=0||!Number.isFinite(distance)||distance<=0.15||!Array.isArray(trace)||trace.length<2)return null;
  const usable=trace.filter(s=>Number.isFinite(Number(s?.d))&&Number.isFinite(Number(s?.t))&&Number(s.d)>=0&&Number(s.t)>=0);
  if(usable.length<2)return null;
  const rawEnd=Math.max(1,Number(usable[usable.length-1]?.t)||total);
  const timeScale=total/rawEnd;
  const clean=[{p:0,t:0}];
  for(const sample of usable){
    const p=clamp01(Number(sample.d)/distance),t=Number(sample.t)*timeScale;
    if(p<=clean[clean.length-1].p)continue;
    clean.push({p:Number(p.toFixed(5)),t:Math.round(t)});
  }
  if(clean.length<2)return null;
  if(clean[clean.length-1].p<0.999)clean.push({p:1,t:Math.round(total)});
  else clean[clean.length-1]={p:1,t:Math.round(total)};
  return clean.length>=3?{lapMs:Math.round(total),distanceTotal:distance,trace:clean}:null;
}

function saveSessionReference(scene,lapMs,trace,totalDistance){
  const next=buildReference(lapMs,trace,totalDistance);
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

function beginLapClock(scene,now,rawProgress){
  scene._tdrSessionLapClockStart=Number(now);
  scene._tdrSessionCurrentTrace=[];
  scene._tdrSessionDistance=0;
  scene._tdrSessionLastRawProgress=clamp01(rawProgress);
}

function sampleCurrentLap(scene,now){
  if(!scene.timing?.started)return;
  const raw=clamp01(scene.ttHud?.progress01);
  if(!Number.isFinite(scene._tdrSessionLapClockStart))beginLapClock(scene,now,raw);

  const previous=Number(scene._tdrSessionLastRawProgress);
  if(Number.isFinite(previous)){
    let advance=raw-previous;
    if(advance<-0.5)advance+=1;
    else if(advance>0.5)advance-=1;
    // Small reverse movements must not make the lap progress run backwards.
    if(advance>0)scene._tdrSessionDistance=Math.max(0,Number(scene._tdrSessionDistance)||0)+advance;
  }
  scene._tdrSessionLastRawProgress=raw;

  const elapsed=Math.max(0,Number(now)-Number(scene._tdrSessionLapClockStart));
  const distance=Math.max(0,Number(scene._tdrSessionDistance)||0);
  const trace=scene._tdrSessionCurrentTrace||(scene._tdrSessionCurrentTrace=[]);
  const last=trace[trace.length-1];
  if(distance>0&&(!last||distance-last.d>=0.0035)){
    trace.push({d:distance,t:elapsed});
    if(trace.length>480)trace.splice(1,1);
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
    this._tdrSessionLapClockStart=NaN;
    this._tdrSessionDistance=0;
    this._tdrSessionLastRawProgress=NaN;
    const result=originalCreate?.apply(this,args);
    this._tdrSessionDeltaReference=null;
    this._tdrDeltaReference=null;
    this._tdrSessionCurrentTrace=[];
    this._tdrSessionLapClockStart=NaN;
    this._tdrSessionDistance=0;
    this._tdrSessionLastRawProgress=NaN;
    return result;
  };

  proto._tdrLoadDeltaReference=function(){
    const reference=this._tdrSessionDeltaReference;
    return reference&&Array.isArray(reference.trace)&&reference.trace.length>=2?reference:null;
  };

  // Historical PB persistence is deliberately disabled for live DELTA.
  proto._tdrSaveBestDeltaTrace=function(){return false;};

  proto._tdrRenderLiveDelta=function(now){
    const ui=this._tdrEnsureLiveDeltaUi?.();
    if(!ui)return;
    const reference=this._tdrSessionDeltaReference;
    if(!this.timing?.started||!Number.isFinite(this._tdrSessionLapClockStart)){
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

    const elapsed=Math.max(0,Number(now)-Number(this._tdrSessionLapClockStart));
    const distanceTotal=Math.max(0.001,Number(reference.distanceTotal)||1);
    const progress=clamp01((Number(this._tdrSessionDistance)||0)/distanceTotal);
    if(progress<0.005){ui.root.style.opacity='0';return;}
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
      const nowBefore=performance.now();
      sampleCurrentLap(this,nowBefore);
      const completedTrace=Array.isArray(this._tdrSessionCurrentTrace)?this._tdrSessionCurrentTrace.slice():[];
      const completedDistance=Math.max(0,Number(this._tdrSessionDistance)||0);
      const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;

      const result=originalUpdate.call(this,time,delta);

      const nowAfter=performance.now();
      const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      const historyChanged=historyAfter>historyBefore;

      // ttHistory is the authoritative lap boundary. progress01 can wrap at a
      // centerline seam that is not the finish line, so it must never decide
      // when a lap ends.
      if(historyChanged){
        const row=this.ttHistory[historyAfter-1];
        const rowLap=Number(row?.lapMs);
        const measured=Math.max(0,nowAfter-Number(this._tdrSessionLapClockStart));
        const lapMs=Number.isFinite(rowLap)&&rowLap>1000?rowLap:measured;
        if(Number.isFinite(lapMs)&&lapMs>1000&&completedTrace.length>=2&&completedDistance>0.15){
          saveSessionReference(this,lapMs,completedTrace,completedDistance);
        }
        beginLapClock(this,nowAfter,this.ttHud?.progress01);
      }

      sampleCurrentLap(this,nowAfter);
      this._tdrRenderLiveDelta(nowAfter);
      return result;
    };
  }
}

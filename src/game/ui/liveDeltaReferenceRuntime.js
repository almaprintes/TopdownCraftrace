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

export function installLiveDeltaReferenceRuntime(RaceScene){
  const proto=RaceScene?.prototype;
  if(!proto||proto.__tdrLiveDeltaReferenceRuntimeInstalled)return;
  proto.__tdrLiveDeltaReferenceRuntimeInstalled=true;

  const originalCreate=proto.create;
  const originalSample=proto._tdrSampleDeltaLap;
  const originalUpdate=proto.update;

  // DELTA is deliberately session-only: every race starts with no reference.
  // The first valid completed lap becomes an invisible temporal ghost. Any
  // faster valid lap in the same session replaces it. Nothing is loaded from
  // or written to historical PB/localStorage data.
  proto.create=function(...args){
    this._tdrSessionDeltaReference=null;
    this._tdrDeltaReference=null;
    this._tdrLastSampledDeltaTrace=null;
    return originalCreate?.apply(this,args);
  };

  if(typeof originalSample==='function'){
    proto._tdrSampleDeltaLap=function(now){
      const result=originalSample.call(this,now);
      const trace=this._tdrDeltaCurrentTrace;
      if(Array.isArray(trace)&&trace.length>=2)this._tdrLastSampledDeltaTrace=trace.slice();
      return result;
    };
  }

  // Ignore the historical best requested by the legacy renderer. The only
  // legal reference is the best completed lap of this current session.
  proto._tdrLoadDeltaReference=function(){
    const reference=this._tdrSessionDeltaReference;
    return reference&&Array.isArray(reference.trace)&&reference.trace.length>=2?reference:null;
  };

  // The legacy update calls this when a lap matches the historical PB. Keep
  // the method name for compatibility, but make it session-local and never
  // persist it. The wrapper below also calls it for every valid completed lap.
  proto._tdrSaveBestDeltaTrace=function(lapMs,trace){
    const next=buildReference(lapMs,trace);
    if(!next)return;
    const previous=this._tdrSessionDeltaReference;
    if(previous&&Number(previous.lapMs)<=Number(next.lapMs)+5)return;
    this._tdrSessionDeltaReference=next;
    this._tdrDeltaReference=next;
  };

  if(typeof originalUpdate==='function'){
    proto.update=function(time,delta){
      const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      const result=originalUpdate.call(this,time,delta);
      const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;

      if(historyAfter>historyBefore){
        const row=this.ttHistory[historyAfter-1];
        const lapMs=Number(row?.lapMs);
        const trace=Array.isArray(this._tdrLastSampledDeltaTrace)?this._tdrLastSampledDeltaTrace.slice():[];
        const valid=row?.valid!==false&&row?.invalid!==true&&Number.isFinite(lapMs)&&lapMs>0&&trace.length>=2;
        if(valid)this._tdrSaveBestDeltaTrace(lapMs,trace);
      }

      // The underlying renderer still calls the reference generically
      // "mejor vuelta". Make the contract explicit in the visible HUD.
      const ui=this._tdrLiveDeltaUi;
      if(ui?.label&&this._tdrSessionDeltaReference){
        ui.label.textContent='VS MEJOR DE SESIÓN';
      }
      return result;
    };
  }
}

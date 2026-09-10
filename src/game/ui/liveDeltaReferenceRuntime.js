export function installLiveDeltaReferenceRuntime(RaceScene){
  const proto=RaceScene?.prototype;
  if(!proto||proto.__tdrLiveDeltaReferenceRuntimeInstalled)return;
  proto.__tdrLiveDeltaReferenceRuntimeInstalled=true;

  const originalSample=proto._tdrSampleDeltaLap;
  const originalUpdate=proto.update;
  const originalLoad=proto._tdrLoadDeltaReference;
  const originalRender=proto._tdrRenderLiveDelta;

  if(typeof originalSample==='function'){
    proto._tdrSampleDeltaLap=function(now){
      const result=originalSample.call(this,now);
      const trace=this._tdrDeltaCurrentTrace;
      if(Array.isArray(trace)&&trace.length>=2)this._tdrLastSampledDeltaTrace=trace.slice();
      return result;
    };
  }

  if(typeof originalLoad==='function'){
    proto._tdrLoadDeltaReference=function(bestMs){
      const exact=originalLoad.call(this,bestMs);
      if(exact){
        this._tdrDeltaUsingSessionFallback=false;
        return exact;
      }
      const fallback=this._tdrSessionDeltaReference;
      if(fallback&&Number.isFinite(Number(fallback.lapMs))&&Array.isArray(fallback.trace)&&fallback.trace.length>=2){
        this._tdrDeltaUsingSessionFallback=true;
        return fallback;
      }
      this._tdrDeltaUsingSessionFallback=false;
      return null;
    };
  }

  if(typeof originalRender==='function'){
    proto._tdrRenderLiveDelta=function(now){
      const result=originalRender.call(this,now);
      if(this._tdrDeltaUsingSessionFallback&&this._tdrLiveDeltaUi?.label){
        this._tdrLiveDeltaUi.label.textContent='VS MEJOR DE SESIÓN';
      }
      return result;
    };
  }

  if(typeof originalUpdate==='function'){
    proto.update=function(time,delta){
      const historyBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      const result=originalUpdate.call(this,time,delta);
      const historyAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
      if(historyAfter<=historyBefore)return result;

      const row=this.ttHistory[historyAfter-1];
      const lapMs=Number(row?.lapMs);
      const trace=Array.isArray(this._tdrLastSampledDeltaTrace)?this._tdrLastSampledDeltaTrace.slice():[];
      const valid=row?.valid!==false&&row?.invalid!==true&&Number.isFinite(lapMs)&&lapMs>0&&trace.length>=2;
      if(!valid)return result;

      const bestMs=Number(this.ttBest?.lapMs);
      const exact=this._tdrDeltaReference;
      const hasExact=exact&&Number.isFinite(bestMs)&&Math.abs(Number(exact.lapMs)-bestMs)<=5;
      if(hasExact){
        this._tdrSessionDeltaReference=null;
        return result;
      }

      const previous=this._tdrSessionDeltaReference;
      if(previous&&Number.isFinite(Number(previous.lapMs))&&lapMs>=Number(previous.lapMs)-5)return result;

      this._tdrSaveBestDeltaTrace?.(lapMs,trace);
      const saved=this._tdrDeltaReference;
      if(saved&&Array.isArray(saved.trace)&&saved.trace.length>=2){
        this._tdrSessionDeltaReference={lapMs:Number(saved.lapMs),trace:saved.trace.map(sample=>({...sample}))};
      }
      return result;
    };
  }
}

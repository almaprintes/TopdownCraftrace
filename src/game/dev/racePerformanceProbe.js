const PROBE_ID='tdr-race-performance-probe';
function androidDevice(){try{return /Android/i.test(String(navigator.userAgent||''));}catch{return false;}}
function installAndroidDomIsolation(){if(!androidDevice()||document.getElementById('tdr-android-dom-isolation'))return;const s=document.createElement('style');s.id='tdr-android-dom-isolation';s.textContent='';document.head.appendChild(s);}
function platformLabel(){try{const ua=String(navigator.userAgent||'');if(/Android/i.test(ua))return'ANDROID';if(/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'IOS';return'WEB';}catch{return'WEB';}}
export function installRacePerformanceProbe(RaceScene){
  if(!RaceScene?.prototype||RaceScene.prototype.__tdrPerfProbeInstalled)return;
  const proto=RaceScene.prototype,originalCreate=proto.create,originalUpdate=proto.update;
  proto.create=function(...args){
    const result=originalCreate?.apply(this,args);installAndroidDomIsolation();
    try{
      let root=document.getElementById(PROBE_ID);root?.remove?.();root=document.createElement('div');root.id=PROBE_ID;
      Object.assign(root.style,{position:'fixed',left:'8px',top:'8px',zIndex:'2147483200',padding:'6px 8px',borderRadius:'7px',background:'rgba(0,0,0,.72)',color:'#fff',font:'700 10px/1.28 ui-monospace,SFMono-Regular,Menlo,monospace',whiteSpace:'pre',pointerEvents:'none',fontVariantNumeric:'tabular-nums'});
      (this.game?.canvas?.parentElement||document.body).appendChild(root);this._tdrPerfProbe=root;this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfSamples=[];this._tdrPerfLast=performance.now();this._tdrPerfOver33=0;this._tdrPerfOver50=0;this._tdrSpikeCount=0;this._tdrSpikeLast='—';this._tdrSpikeWorst=0;this._tdrPhase={update:0,post:0,other:0};this._tdrLastUpdateEnd=performance.now();this._tdrRafGap=0;this._tdrRafWorst=0;this._tdrRafLast=performance.now();this._tdrDriveArmed=false;
      this._tdrRafTick=(ts)=>{const gap=Math.max(0,ts-(this._tdrRafLast||ts));this._tdrRafLast=ts;this._tdrRafGap=gap;if(gap>this._tdrRafWorst)this._tdrRafWorst=gap;this._tdrRafId=requestAnimationFrame(this._tdrRafTick);};this._tdrRafId=requestAnimationFrame(this._tdrRafTick);
      this._tdrPostRender=()=>{const now=performance.now();this._tdrPhase.post=Math.max(0,now-(this._tdrUpdateEnd||now));this._tdrPostAt=now;};
      this.game?.events?.on?.('postrender',this._tdrPostRender);
      this.events?.once?.('shutdown',()=>{try{this.game?.events?.off?.('postrender',this._tdrPostRender);cancelAnimationFrame(this._tdrRafId);}catch{}});
      this.events?.once?.('shutdown',()=>{try{this._tdrPerfProbe?.remove?.();}catch{}this._tdrPerfProbe=null;});
    }catch{}
    return result;
  };
  proto.update=function(time,delta){
    const start=performance.now();this._tdrPhase.other=Math.max(0,start-(this._tdrPostAt||this._tdrLastUpdateEnd||start));const result=originalUpdate?.call(this,time,delta),end=performance.now();this._tdrPhase.update=Math.max(0,end-start);this._tdrUpdateEnd=end;this._tdrLastUpdateEnd=end;
    try{
      const frameMs=Math.max(0,end-(this._tdrPerfLast||end));this._tdrPerfLast=end;const driving=Number(this._tdrElapsedMs||this.elapsedMs||this.raceTime||this._raceTime||0)>0||Number(this.player?.body?.speed||this.player?.body?.velocity?.length?.()||0)>1;if(driving)this._tdrDriveArmed=true;if(!this._tdrDriveArmed){this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfSamples=[];this._tdrPerfOver33=0;this._tdrPerfOver50=0;this._tdrSpikeCount=0;this._tdrSpikeWorst=0;this._tdrRafWorst=this._tdrRafGap||0;return result;}if(frameMs>=32){this._tdrSpikeCount=(this._tdrSpikeCount||0)+1;if(frameMs>=(this._tdrSpikeWorst||0)){this._tdrSpikeWorst=frameMs;this._tdrSpikeLast=`${frameMs.toFixed(1)}ms U${(this._tdrPhase.update||0).toFixed(1)} P${(this._tdrPhase.post||0).toFixed(1)} O${(this._tdrPhase.other||0).toFixed(1)}`;}}this._tdrPerfFrames=(this._tdrPerfFrames||0)+1;this._tdrPerfElapsed=(this._tdrPerfElapsed||0)+frameMs;this._tdrPerfSamples?.push(frameMs);if(frameMs>33)this._tdrPerfOver33++;if(frameMs>50)this._tdrPerfOver50++;
      if(this._tdrPerfElapsed>=750&&this._tdrPerfProbe){
        const fps=this._tdrPerfFrames*1000/this._tdrPerfElapsed,canvas=this.game?.canvas,rect=canvas?.getBoundingClientRect?.(),cfg=Number(this.game?.config?.resolution)||Number(window.__tdrRenderResolution)||1,dpr=Number(window.devicePixelRatio)||1;
        const samples=(this._tdrPerfSamples||[]).slice().sort((a,b)=>a-b),pct=p=>samples.length?samples[Math.min(samples.length-1,Math.floor((samples.length-1)*p))]:0;
        this._tdrPerfProbe.textContent=`DEV 1.1.25 DRIVE RAF · ${platformLabel()}\nFPS ${fps.toFixed(1)} · P50 ${pct(.5).toFixed(1)} · P95 ${pct(.95).toFixed(1)} · P99 ${pct(.99).toFixed(1)}ms\n>33 ${this._tdrPerfOver33||0} · >50 ${this._tdrPerfOver50||0} · SPIKE ${this._tdrSpikeCount||0}\nLAST ${this._tdrSpikeLast||'—'}\nNOW U${(this._tdrPhase.update||0).toFixed(1)} P${(this._tdrPhase.post||0).toFixed(1)} O${(this._tdrPhase.other||0).toFixed(1)} · RAF ${(this._tdrRafGap||0).toFixed(1)}/${(this._tdrRafWorst||0).toFixed(1)}`;
        this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrSpikeWorst=0;this._tdrRafWorst=this._tdrRafGap||0;
      }
    }catch{}
    return result;
  };
  proto.__tdrPerfProbeInstalled=true;
}

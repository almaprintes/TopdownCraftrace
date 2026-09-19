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
      (this.game?.canvas?.parentElement||document.body).appendChild(root);this._tdrPerfProbe=root;this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfWorst=0;this._tdrPerfSamples=[];this._tdrPerfOver20=0;this._tdrPerfOver33=0;this._tdrPerfOver50=0;this._tdrInputMaxLatency=0;this._tdrPerfLast=performance.now();this._tdrPerfSamples=[];this._tdrPerfOver20=0;this._tdrPerfOver33=0;this._tdrPerfOver50=0;this._tdrInputPendingAt=0;this._tdrInputLastLatency=0;this._tdrInputMaxLatency=0;
      this._tdrPerfPointerHandler=()=>{this._tdrInputPendingAt=performance.now();};window.addEventListener('pointerdown',this._tdrPerfPointerHandler,{passive:true,capture:true});window.addEventListener('pointermove',this._tdrPerfPointerHandler,{passive:true,capture:true});
      this.events?.once?.('shutdown',()=>{try{window.removeEventListener('pointerdown',this._tdrPerfPointerHandler,true);window.removeEventListener('pointermove',this._tdrPerfPointerHandler,true);}catch{}});
      this.events?.once?.('shutdown',()=>{try{this._tdrPerfProbe?.remove?.();}catch{}this._tdrPerfProbe=null;});
    }catch{}
    return result;
  };
  proto.update=function(time,delta){
    const start=performance.now(),result=originalUpdate?.call(this,time,delta),end=performance.now();
    try{
      const frameMs=Math.max(0,end-(this._tdrPerfLast||end));this._tdrPerfLast=end;this._tdrPerfFrames=(this._tdrPerfFrames||0)+1;this._tdrPerfElapsed=(this._tdrPerfElapsed||0)+frameMs;this._tdrPerfWorst=Math.max(this._tdrPerfWorst||0,frameMs);this._tdrPerfSamples?.push(frameMs);if(frameMs>20)this._tdrPerfOver20++;if(frameMs>33)this._tdrPerfOver33++;if(frameMs>50)this._tdrPerfOver50++;if(this._tdrInputPendingAt){const lag=Math.max(0,start-this._tdrInputPendingAt);this._tdrInputLastLatency=lag;this._tdrInputMaxLatency=Math.max(this._tdrInputMaxLatency||0,lag);this._tdrInputPendingAt=0;}
      if(this._tdrPerfElapsed>=750&&this._tdrPerfProbe){
        const fps=this._tdrPerfFrames*1000/this._tdrPerfElapsed,canvas=this.game?.canvas,rect=canvas?.getBoundingClientRect?.(),cfg=Number(this.game?.config?.resolution)||Number(window.__tdrRenderResolution)||1,dpr=Number(window.devicePixelRatio)||1;
        const samples=(this._tdrPerfSamples||[]).slice().sort((a,b)=>a-b),pct=p=>samples.length?samples[Math.min(samples.length-1,Math.floor((samples.length-1)*p))]:0;
        this._tdrPerfProbe.textContent=`DEV 1.1.6 A/B DELTA-10HZ · ${platformLabel()}\nFPS ${fps.toFixed(1)} · P50 ${pct(.5).toFixed(1)} · P95 ${pct(.95).toFixed(1)} · P99 ${pct(.99).toFixed(1)}ms\n>20 ${this._tdrPerfOver20||0} · >33 ${this._tdrPerfOver33||0} · >50 ${this._tdrPerfOver50||0} · MAX ${this._tdrPerfWorst.toFixed(1)}\nINPUT ${(this._tdrInputLastLatency||0).toFixed(1)}ms · MAX ${(this._tdrInputMaxLatency||0).toFixed(1)}ms\nDPR ${dpr.toFixed(2)} · RES ${cfg.toFixed(2)} · ${String(window.__tdrVideoPreset||'?').toUpperCase()}\nCSS ${Math.round(rect?.width||0)}×${Math.round(rect?.height||0)} · BUF ${canvas?.width||0}×${canvas?.height||0}`;
        this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfWorst=0;
      }
    }catch{}
    return result;
  };
  proto.__tdrPerfProbeInstalled=true;
}

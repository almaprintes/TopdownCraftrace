const PROBE_ID='tdr-race-performance-probe';
function platformLabel(){try{const ua=String(navigator.userAgent||'');if(/Android/i.test(ua))return'ANDROID';if(/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'IOS';return'WEB';}catch{return'WEB';}}
export function installRacePerformanceProbe(RaceScene){
  if(!RaceScene?.prototype||RaceScene.prototype.__tdrPerfProbeInstalled)return;
  const proto=RaceScene.prototype,originalCreate=proto.create,originalUpdate=proto.update;
  proto.create=function(...args){
    const result=originalCreate?.apply(this,args);
    try{
      let root=document.getElementById(PROBE_ID);root?.remove?.();root=document.createElement('div');root.id=PROBE_ID;
      Object.assign(root.style,{position:'fixed',left:'8px',top:'8px',zIndex:'2147483200',padding:'6px 8px',borderRadius:'7px',background:'rgba(0,0,0,.72)',color:'#fff',font:'700 10px/1.28 ui-monospace,SFMono-Regular,Menlo,monospace',whiteSpace:'pre',pointerEvents:'none',fontVariantNumeric:'tabular-nums'});
      (this.game?.canvas?.parentElement||document.body).appendChild(root);this._tdrPerfProbe=root;this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfWorst=0;this._tdrPerfLast=performance.now();
      this.events?.once?.('shutdown',()=>{try{this._tdrPerfProbe?.remove?.();}catch{}this._tdrPerfProbe=null;});
    }catch{}
    return result;
  };
  proto.update=function(time,delta){
    const start=performance.now(),result=originalUpdate?.call(this,time,delta),end=performance.now();
    try{
      const frameMs=Math.max(0,end-(this._tdrPerfLast||end));this._tdrPerfLast=end;this._tdrPerfFrames=(this._tdrPerfFrames||0)+1;this._tdrPerfElapsed=(this._tdrPerfElapsed||0)+frameMs;this._tdrPerfWorst=Math.max(this._tdrPerfWorst||0,frameMs);
      if(this._tdrPerfElapsed>=750&&this._tdrPerfProbe){
        const fps=this._tdrPerfFrames*1000/this._tdrPerfElapsed,canvas=this.game?.canvas,rect=canvas?.getBoundingClientRect?.(),cfg=Number(this.game?.config?.resolution)||Number(window.__tdrRenderResolution)||1,dpr=Number(window.devicePixelRatio)||1;
        this._tdrPerfProbe.textContent=`DEV 1.1.0 PERF · ${platformLabel()}\nFPS ${fps.toFixed(1)} · WORST ${this._tdrPerfWorst.toFixed(1)}ms\nDPR ${dpr.toFixed(2)} · RES ${cfg.toFixed(2)} · PRESET ${String(window.__tdrVideoPreset||'?').toUpperCase()}\nCSS ${Math.round(rect?.width||0)}×${Math.round(rect?.height||0)} · BUF ${canvas?.width||0}×${canvas?.height||0}`;
        this._tdrPerfFrames=0;this._tdrPerfElapsed=0;this._tdrPerfWorst=0;
      }
    }catch{}
    return result;
  };
  proto.__tdrPerfProbeInstalled=true;
}

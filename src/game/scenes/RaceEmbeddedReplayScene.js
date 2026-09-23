import { RaceScene as CleanRaceScene } from './RaceReplayCleanScene.js';
import { pxpsToKmh } from '../cars/speedUnits.js';

function fmt(ms){ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;}
function samplePositionAt(samples,t){
  if(!Array.isArray(samples)||!samples.length)return null;
  let i=1;while(i<samples.length&&Number(samples[i]?.t)<t)i++;
  const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a;
  const ta=Number(a?.t)||0,tb=Number(b?.t)||ta,span=Math.max(1,tb-ta),q=Math.max(0,Math.min(1,(Number(t)-ta)/span));
  const ax=Number(a?.x),ay=Number(a?.y),bx=Number(b?.x),by=Number(b?.y);
  if(![ax,ay,bx,by].every(Number.isFinite))return null;
  return{x:ax+(bx-ax)*q,y:ay+(by-ay)*q};
}
function sampleSpeedAtTime(samples,t,windowMs=180){
  if(!Array.isArray(samples)||samples.length<2)return 0;
  const first=Number(samples[0]?.t)||0,last=Number(samples.at(-1)?.t)||first;
  const half=Math.max(60,Number(windowMs)||180)*.5;
  const ta=Math.max(first,Number(t)-half),tb=Math.min(last,Number(t)+half);
  const a=samplePositionAt(samples,ta),b=samplePositionAt(samples,tb);
  const dt=Math.max(1,tb-ta)/1000;
  return a&&b?Math.hypot(b.x-a.x,b.y-a.y)/dt:0;
}

export class RaceScene extends CleanRaceScene{
  _startStatsNativeReplay(payload){
    this._tdrEmbeddedReplay=payload?.embedded===true;
    this._tdrReplayAnalysisEnabled=true;
    this._tdrReplayMaxSpeed=0;
    if(Array.isArray(payload?.samples)){
      for(const sample of payload.samples)this._tdrReplayMaxSpeed=Math.max(this._tdrReplayMaxSpeed,sampleSpeedAtTime(payload.samples,Number(sample?.t)||0));
    }
    const result=super._startStatsNativeReplay(payload);
    if(this._tdrEmbeddedReplay){
      this._syncEmbeddedSourceCamera();
      this._applyStatsReplayFrame(0);
    }
    return result;
  }

  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();
    if(!this._tdrEmbeddedReplay)return;
    try{this._tdrReplayDomParent?.removeAttribute?.('data-tdr-native-replay');}catch{}
    this._tdrReplayDomParent=null;
  }

  _embeddedReplayTarget(){try{return document.querySelector('[data-br-native-replay-screen="1"]');}catch{return null;}}

  _syncEmbeddedSourceCamera(){
    if(!this._tdrEmbeddedReplay)return;
    const cam=this.cameras?.main;
    const w=Number(this.scale?.width)||Number(this.game?.canvas?.width)||1;
    const h=Number(this.scale?.height)||Number(this.game?.canvas?.height)||1;
    try{cam?.setVisible?.(true);cam?.setViewport?.(0,0,w,h);}catch{}
  }

  _ensureEmbeddedFeed(){
    const target=this._embeddedReplayTarget();
    if(!target)return null;
    let feed=target.querySelector('[data-tdr-embedded-feed="1"]');
    if(!feed){
      feed=document.createElement('canvas');
      feed.dataset.tdrEmbeddedFeed='1';
      feed.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;background:#020a11';
      target.prepend(feed);
    }
    this._tdrEmbeddedFeedCanvas=feed;
    return feed;
  }

  _sampleIndexAtTime(samples,t){
    if(!Array.isArray(samples)||!samples.length)return 0;
    let i=1;while(i<samples.length&&Number(samples[i]?.t)<t)i++;
    if(i<=0)return 0;if(i>=samples.length)return samples.length-1;
    const a=Math.max(0,i-1),b=i;
    return Math.abs(Number(samples[a]?.t)-t)<=Math.abs(Number(samples[b]?.t)-t)?a:b;
  }

  _drawReplayAnalysis(ctx,geom){
    if(!this._tdrReplayAnalysisEnabled)return;
    const state=this._tdrStatsReplay,samples=state?.payload?.samples,cam=this.cameras?.main;
    if(!state||!Array.isArray(samples)||samples.length<2||!cam)return;
    const view=cam.worldView,zoom=Number(cam.zoom)||1;
    const gameW=Number(this.scale?.width)||1,gameH=Number(this.scale?.height)||1;
    const src=this.game?.canvas;
    if(!view||!src)return;
    const srcScaleX=(Number(src.width)||1)/gameW,srcScaleY=(Number(src.height)||1)/gameH;
    const map=p=>{
      const screenX=(Number(p?.x)-Number(view.x))*zoom*srcScaleX;
      const screenY=(Number(p?.y)-Number(view.y))*zoom*srcScaleY;
      return{x:(Number(geom.dx)||0)+(screenX-geom.sx)/geom.cw*geom.dw,y:(Number(geom.dy)||0)+(screenY-geom.sy)/geom.ch*geom.dh};
    };
    const elapsed=Number(state.elapsed)||0,current=this._sampleIndexAtTime(samples,elapsed);
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(230,245,248,.30)';ctx.lineWidth=Math.max(1.5,geom.dpr*1.2);
    ctx.beginPath();
    for(let i=0;i<samples.length;i++){const p=map(samples[i]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
    ctx.strokeStyle='rgba(79,235,255,.95)';ctx.lineWidth=Math.max(2.5,geom.dpr*2);
    ctx.shadowColor='rgba(79,235,255,.55)';ctx.shadowBlur=5*geom.dpr;
    ctx.beginPath();
    for(let i=0;i<=current;i++){const p=map(samples[i]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();
    ctx.shadowBlur=0;
    const livePos=samplePositionAt(samples,elapsed)||samples[current],pos=map(livePos);
    ctx.fillStyle='#ffd85c';ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1,geom.dpr);
    ctx.beginPath();ctx.arc(pos.x,pos.y,Math.max(4,geom.dpr*3.5),0,Math.PI*2);ctx.fill();ctx.stroke();
    const speed=sampleSpeedAtTime(samples,elapsed),speedKmh=pxpsToKmh(speed),ratio=this._tdrReplayMaxSpeed>0?Math.min(100,Math.round(speed/this._tdrReplayMaxSpeed*100)):0;
    const boxW=112*geom.dpr,boxH=42*geom.dpr,x=(Number(geom.dx)||0)+geom.dw-boxW-9*geom.dpr,y=(Number(geom.dy)||0)+9*geom.dpr;
    ctx.fillStyle='rgba(3,14,22,.82)';ctx.strokeStyle='rgba(79,235,255,.45)';ctx.lineWidth=geom.dpr;
    ctx.fillRect(x,y,boxW,boxH);ctx.strokeRect(x,y,boxW,boxH);
    ctx.fillStyle='#63edff';ctx.font=`${6*geom.dpr}px system-ui`;ctx.textAlign='left';ctx.fillText('ANÁLISIS TRAZADA',x+7*geom.dpr,y+10*geom.dpr);
    ctx.fillStyle='#ffffff';ctx.font=`700 ${12*geom.dpr}px system-ui`;ctx.fillText(`${Math.round(speedKmh)} km/h`,x+7*geom.dpr,y+25*geom.dpr);
    ctx.fillStyle='#8fa9b7';ctx.font=`700 ${7*geom.dpr}px system-ui`;ctx.fillText(`RITMO ${ratio}%`,x+7*geom.dpr,y+36*geom.dpr);
    ctx.restore();
  }

  _copyEmbeddedReplayFrame(){
    if(!this._tdrEmbeddedReplay)return;
    const src=this.game?.canvas,feed=this._ensureEmbeddedFeed(),target=this._embeddedReplayTarget();
    if(!src||!feed||!target)return;
    const rect=target.getBoundingClientRect?.();
    if(!rect||rect.width<=1||rect.height<=1)return;
    const dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1));
    const dw=Math.max(1,Math.round(rect.width*dpr)),dh=Math.max(1,Math.round(rect.height*dpr));
    if(feed.width!==dw)feed.width=dw;
    if(feed.height!==dh)feed.height=dh;
    const sw=Number(src.width)||1,sh=Number(src.height)||1;
    const srcAspect=sw/sh,dstAspect=dw/dh;
    let sx=0,sy=0,cw=sw,ch=sh;
    // Embedded Race Control replay: use a centered cover crop. The modal now reserves
    // real side/bottom telemetry space, so the feed itself must stay optically centered.
    if(srcAspect>dstAspect){cw=sh*dstAspect;sx=Math.max(0,(sw-cw)*.5);}
    else{ch=sw/dstAspect;sy=Math.max(0,(sh-ch)*.5);}
    sx=Math.round(sx);sy=Math.round(sy);cw=Math.round(cw);ch=Math.round(ch);
    try{
      const ctx=feed.getContext('2d',{alpha:false});
      if(!ctx)return;
      ctx.drawImage(src,sx,sy,cw,ch,0,0,dw,dh);
      this._drawReplayAnalysis(ctx,{sx,sy,cw,ch,dw,dh,dpr});
    }catch{}
  }

  _startEmbeddedFeedLoop(){
    if(!this._tdrEmbeddedReplay)return;
    this._stopEmbeddedFeedLoop();
    const copy=()=>this._copyEmbeddedReplayFrame();
    this._tdrEmbeddedPostRenderHandler=copy;
    try{this.game?.events?.on?.('postrender',copy);}catch{}
    requestAnimationFrame(copy);
  }

  _stopEmbeddedFeedLoop(){
    const copy=this._tdrEmbeddedPostRenderHandler;
    if(copy){try{this.game?.events?.off?.('postrender',copy);}catch{}}
    this._tdrEmbeddedPostRenderHandler=null;
  }

  _createStatsReplayOverlay(payload){
    if(!this._tdrEmbeddedReplay)return super._createStatsReplayOverlay(payload);
    // Single-owner replay UI: Race Control owns all telemetry and controls.
    // The race scene only supplies the rendered world feed.
    this._destroyStatsReplayOverlay(false);
    const target=this._embeddedReplayTarget();
    if(!target){this._tdrEmbeddedReplay=false;return super._createStatsReplayOverlay(payload);}
    try{target.style.position='relative';target.style.overflow='hidden';target.style.background='#020a11';}catch{}
    this._ensureEmbeddedFeed();
    this._tdrStatsReplayOverlay=null;
    this._startEmbeddedFeedLoop();
  }

  _applyStatsReplayFrame(t){
    super._applyStatsReplayFrame(t);
    if(!this._tdrEmbeddedReplay)return;
    this._syncEmbeddedSourceCamera();
    const cameraSamples=this._tdrStatsReplay?.payload?.cameraSamples;
    const hasRecordedCamera=Array.isArray(cameraSamples)&&cameraSamples.length>1;
    if(hasRecordedCamera)return;
    const x=Number(this.carBody?.x),y=Number(this.carBody?.y);
    if(Number.isFinite(x)&&Number.isFinite(y)){try{this.cameras?.main?.stopFollow?.();this.cameras?.main?.centerOn?.(x,y);}catch{}}
  }

  _destroyStatsReplayOverlay(restore=true){
    this._stopEmbeddedFeedLoop();
    try{this._tdrEmbeddedFeedCanvas?.remove?.();}catch{}
    this._tdrEmbeddedFeedCanvas=null;
    return super._destroyStatsReplayOverlay?.(restore);
  }

  _exitStatsNativeReplay(){
    if(!this._tdrEmbeddedReplay)return super._exitStatsNativeReplay?.();
    try{sessionStorage.removeItem('tdr2:statsNativeReplay');}catch{}
    this._destroyStatsReplayOverlay(false);
    try{this.scene.stop();}catch{}
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(this._tdrEmbeddedReplay)this._syncEmbeddedSourceCamera();
    return result;
  }
}

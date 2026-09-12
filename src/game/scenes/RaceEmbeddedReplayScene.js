import { RaceScene as CleanRaceScene } from './RaceReplayCleanScene.js';

function fmt(ms){ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;}

export class RaceScene extends CleanRaceScene{
  _startStatsNativeReplay(payload){
    this._tdrEmbeddedReplay=payload?.embedded===true;
    const result=super._startStatsNativeReplay(payload);
    if(this._tdrEmbeddedReplay){
      this._syncEmbeddedSourceCamera();
      this._applyStatsReplayFrame(0);
      this._copyEmbeddedReplayFrame();
    }
    return result;
  }

  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();
    if(!this._tdrEmbeddedReplay)return;
    // Embedded replay keeps Race Control visible. Only the exact race HUD/control
    // roots hidden by RaceReplayCleanScene remain gated.
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
    if(srcAspect>dstAspect){cw=sh*dstAspect;sx=(sw-cw)*.5;}
    else{ch=sw/dstAspect;sy=(sh-ch)*.5;}
    try{
      const ctx=feed.getContext('2d',{alpha:false});
      if(!ctx)return;
      ctx.clearRect(0,0,dw,dh);
      ctx.drawImage(src,sx,sy,cw,ch,0,0,dw,dh);
    }catch{}
  }

  _startEmbeddedFeedLoop(){
    if(!this._tdrEmbeddedReplay)return;
    if(this._tdrEmbeddedFeedRaf)cancelAnimationFrame(this._tdrEmbeddedFeedRaf);
    const tick=()=>{
      if(!this._tdrEmbeddedReplay||!this._tdrEmbeddedFeedCanvas?.isConnected){this._tdrEmbeddedFeedRaf=0;return;}
      this._syncEmbeddedSourceCamera();
      this._copyEmbeddedReplayFrame();
      this._tdrEmbeddedFeedRaf=requestAnimationFrame(tick);
    };
    this._tdrEmbeddedFeedRaf=requestAnimationFrame(tick);
  }

  _createStatsReplayOverlay(payload){
    if(!this._tdrEmbeddedReplay)return super._createStatsReplayOverlay(payload);
    this._destroyStatsReplayOverlay(false);
    const target=this._embeddedReplayTarget();
    if(!target){this._tdrEmbeddedReplay=false;return super._createStatsReplayOverlay(payload);}
    const state=this._tdrStatsReplay;
    try{target.style.position='relative';target.style.overflow='hidden';target.style.background='#020a11';}catch{}
    this._ensureEmbeddedFeed();
    const root=document.createElement('div');
    root.dataset.tdrStatsNativeReplay='1';root.dataset.tdrEmbeddedReplay='1';
    root.style.cssText='position:absolute;inset:0;z-index:2;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
    const button='height:32px;min-width:38px;border:1px solid rgba(79,234,255,.72);background:rgba(5,29,40,.90);color:#fff;font-weight:1000;font-size:12px;padding:0 8px;touch-action:manipulation';
    root.innerHTML=`<div style="position:absolute;left:8px;top:8px;padding:5px 7px;background:rgba(3,14,22,.78);border:1px solid rgba(82,232,255,.28)"><div style="font-size:6px;font-weight:1000;letter-spacing:.16em;color:#63edff">REPLAY REAL</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:1px"><strong data-time style="font-size:15px;font-variant-numeric:tabular-nums">0:00.000</strong><span style="font-size:7px;color:#8fa9b7">/ ${fmt(state?.duration||payload?.lapMs)}</span></div></div><div style="position:absolute;left:8px;right:8px;bottom:7px;padding:5px 7px 6px;background:rgba(3,14,22,.86);border:1px solid rgba(82,232,255,.25);pointer-events:auto"><input data-seek aria-label="Posición del replay" type="range" min="0" max="${Math.max(1,Math.round(state?.duration||payload?.lapMs||1))}" step="1" value="0" style="display:block;width:100%;height:18px;margin:0 0 3px;accent-color:#58efff;touch-action:none"><div style="display:flex;align-items:center;justify-content:center;gap:5px"><button data-start style="${button}">↶ 0</button><button data-prev style="${button}">◀│</button><button data-pause style="${button};min-width:46px;font-size:15px">Ⅱ</button><button data-next style="${button}">│▶</button><button data-speed style="${button};min-width:48px">1×</button></div></div>`;
    target.appendChild(root);this._tdrStatsReplayOverlay=root;
    root.querySelector('[data-start]')?.addEventListener('click',()=>this._seekStatsReplay(0,true));
    root.querySelector('[data-prev]')?.addEventListener('click',()=>this._stepStatsReplaySample(-1));
    root.querySelector('[data-next]')?.addEventListener('click',()=>this._stepStatsReplaySample(1));
    root.querySelector('[data-pause]')?.addEventListener('click',()=>{const s=this._tdrStatsReplay;if(!s)return;if(s.finished){s.elapsed=0;s.finished=false;s.playing=true;this._applyStatsReplayFrame(0);}else s.playing=!s.playing;this._syncStatsReplayControls();});
    root.querySelector('[data-speed]')?.addEventListener('click',()=>{const s=this._tdrStatsReplay;if(!s)return;const speeds=[.25,.5,1,2],idx=Math.max(0,speeds.indexOf(Number(s.speed)||1));s.speed=speeds[(idx+1)%speeds.length];this._syncStatsReplayControls();});
    root.querySelector('[data-seek]')?.addEventListener('input',e=>this._seekStatsReplay(Number(e.currentTarget?.value)||0,true));
    this._startEmbeddedFeedLoop();
  }

  _applyStatsReplayFrame(t){
    super._applyStatsReplayFrame(t);
    if(this._tdrEmbeddedReplay){this._syncEmbeddedSourceCamera();this._copyEmbeddedReplayFrame();}
  }

  _destroyStatsReplayOverlay(restore=true){
    if(this._tdrEmbeddedFeedRaf){cancelAnimationFrame(this._tdrEmbeddedFeedRaf);this._tdrEmbeddedFeedRaf=0;}
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

import { RaceScene as CleanRaceScene } from './RaceReplayCleanScene.js';

function camAt(samples,t){
  if(!Array.isArray(samples)||!samples.length)return null;
  let i=1;
  while(i<samples.length&&Number(samples[i]?.t)<t)i++;
  const a=samples[Math.max(0,i-1)]||samples[0];
  const b=samples[Math.min(samples.length-1,i)]||a;
  const span=Math.max(1,Number(b?.t)-Number(a?.t));
  const q=Math.max(0,Math.min(1,(t-Number(a?.t))/span));
  const mix=k=>Number(a?.[k])+(Number(b?.[k])-Number(a?.[k]))*q;
  return{x:mix('x'),y:mix('y'),w:mix('w'),h:mix('h'),zoom:mix('zoom')};
}
function fmt(ms){ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;}
function intersectRect(a,b){
  if(!a||!b)return null;
  const left=Math.max(a.left,b.left,0),top=Math.max(a.top,b.top,0);
  const right=Math.min(a.right,b.right,window.innerWidth||Infinity),bottom=Math.min(a.bottom,b.bottom,window.innerHeight||Infinity);
  if(right-left<=1||bottom-top<=1)return null;
  return{left,top,right,bottom,width:right-left,height:bottom-top};
}

export class RaceScene extends CleanRaceScene{
  _startStatsNativeReplay(payload){
    this._tdrEmbeddedReplay=payload?.embedded===true;
    const result=super._startStatsNativeReplay(payload);
    if(this._tdrEmbeddedReplay){this._prepareEmbeddedBackdrop();this._syncEmbeddedReplayViewport();this._applyStatsReplayFrame(0);}
    return result;
  }
  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();
    if(!this._tdrEmbeddedReplay)return;
    try{this._tdrReplayDomParent?.removeAttribute?.('data-tdr-native-replay');}catch{}
    this._tdrReplayDomParent=null;
  }
  _embeddedReplayTarget(){try{return document.querySelector('[data-br-native-replay-screen="1"]');}catch{return null;}}
  _visibleEmbeddedRect(){
    const target=this._embeddedReplayTarget();
    const body=target?.closest?.('.sh-body');
    if(!target||!body)return null;
    return intersectRect(target.getBoundingClientRect(),body.getBoundingClientRect());
  }
  _prepareEmbeddedBackdrop(){
    const target=this._embeddedReplayTarget(),hub=target?.closest?.('.tdr-stats-hub');
    if(!target||!hub)return;
    this._tdrEmbeddedHub=hub;
    this._tdrEmbeddedHubBackground=hub.style.background||'';
    hub.style.background='transparent';
    let cover=hub.querySelector('[data-tdr-embedded-cover="1"]');
    if(!cover){
      cover=document.createElement('div');cover.dataset.tdrEmbeddedCover='1';
      cover.style.cssText='position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden';
      cover.innerHTML='<i data-c="top"></i><i data-c="left"></i><i data-c="right"></i><i data-c="bottom"></i>';
      for(const el of cover.children)el.style.cssText='position:absolute;background:#020a11;display:block';
      hub.prepend(cover);
    }
    this._tdrEmbeddedCover=cover;
    const head=hub.querySelector('.sh-head'),body=hub.querySelector('.sh-body');
    if(head){this._tdrEmbeddedHeadPos=head.style.position||'';this._tdrEmbeddedHeadZ=head.style.zIndex||'';head.style.position='relative';head.style.zIndex='1';}
    if(body){this._tdrEmbeddedBodyPos=body.style.position||'';this._tdrEmbeddedBodyZ=body.style.zIndex||'';body.style.position='relative';body.style.zIndex='1';}
    target.style.zIndex='2';
    this._syncEmbeddedCover();
  }
  _syncEmbeddedCover(){
    const hub=this._tdrEmbeddedHub,cover=this._tdrEmbeddedCover;
    if(!hub||!cover)return;
    const hr=hub.getBoundingClientRect(),vr=this._visibleEmbeddedRect();
    const top=cover.querySelector('[data-c="top"]'),left=cover.querySelector('[data-c="left"]'),right=cover.querySelector('[data-c="right"]'),bottom=cover.querySelector('[data-c="bottom"]');
    const paint=(el,css)=>{if(el)el.style.cssText=`position:absolute;background:#020a11;display:block;${css}`;};
    if(!vr){paint(top,'left:0;top:0;width:100%;height:100%');paint(left,'display:none');paint(right,'display:none');paint(bottom,'display:none');return;}
    const x=Math.max(0,vr.left-hr.left),y=Math.max(0,vr.top-hr.top),r=Math.max(0,hr.right-vr.right),b=Math.max(0,hr.bottom-vr.bottom);
    paint(top,`left:0;top:0;width:100%;height:${y}px`);
    paint(left,`left:0;top:${y}px;width:${x}px;height:${vr.height}px`);
    paint(right,`right:0;top:${y}px;width:${r}px;height:${vr.height}px`);
    paint(bottom,`left:0;bottom:0;width:100%;height:${b}px`);
  }
  _cleanupEmbeddedBackdrop(){
    try{this._tdrEmbeddedCover?.remove?.();}catch{}
    const hub=this._tdrEmbeddedHub;
    if(hub)hub.style.background=this._tdrEmbeddedHubBackground||'';
    const head=hub?.querySelector?.('.sh-head'),body=hub?.querySelector?.('.sh-body');
    if(head){head.style.position=this._tdrEmbeddedHeadPos||'';head.style.zIndex=this._tdrEmbeddedHeadZ||'';}
    if(body){body.style.position=this._tdrEmbeddedBodyPos||'';body.style.zIndex=this._tdrEmbeddedBodyZ||'';}
    this._tdrEmbeddedCover=null;this._tdrEmbeddedHub=null;
  }
  _syncEmbeddedReplayViewport(){
    if(!this._tdrEmbeddedReplay)return null;
    const target=this._embeddedReplayTarget(),canvas=this.game?.canvas,cam=this.cameras?.main;
    if(!target||!canvas||!cam)return null;
    const tr=target.getBoundingClientRect?.(),vr=this._visibleEmbeddedRect(),cr=canvas.getBoundingClientRect?.();
    const gw=Number(this.scale?.width)||Number(canvas.width)||0,gh=Number(this.scale?.height)||Number(canvas.height)||0;
    if(!tr||!cr||cr.width<=0||cr.height<=0||gw<=0||gh<=0)return null;
    if(!vr){try{cam.setVisible(false);}catch{}this._syncEmbeddedCover();return null;}
    try{cam.setVisible(true);}catch{}
    const sx=gw/cr.width,sy=gh/cr.height;
    const x=Math.max(0,(vr.left-cr.left)*sx),y=Math.max(0,(vr.top-cr.top)*sy);
    const w=Math.max(1,Math.min(gw-x,vr.width*sx)),h=Math.max(1,Math.min(gh-y,vr.height*sy));
    const fullW=Math.max(1,tr.width*sx),fullH=Math.max(1,tr.height*sy);
    const clipX=(vr.left-tr.left)*sx,clipY=(vr.top-tr.top)*sy;
    try{cam.setViewport(x,y,w,h);}catch{}
    this._syncEmbeddedCover();
    return{x,y,w,h,fullW,fullH,clipX,clipY};
  }
  _syncEmbeddedReplayCamera(t){
    if(!this._tdrEmbeddedReplay)return;
    const viewport=this._syncEmbeddedReplayViewport(),state=this._tdrStatsReplay;
    if(!viewport||!state)return;
    const recorded=camAt(state.payload?.cameraSamples,Number(t)||0);
    if(!recorded||!Number.isFinite(recorded.w)||!Number.isFinite(recorded.h)||recorded.w<=0||recorded.h<=0)return;
    const zoom=Math.max(.01,Math.min(viewport.fullW/recorded.w,viewport.fullH/recorded.h));
    const baseCx=recorded.x+recorded.w*.5,baseCy=recorded.y+recorded.h*.5;
    const dxPx=viewport.clipX+viewport.w*.5-viewport.fullW*.5;
    const dyPx=viewport.clipY+viewport.h*.5-viewport.fullH*.5;
    try{
      this.cameras.main.stopFollow();
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(baseCx+dxPx/zoom,baseCy+dyPx/zoom);
    }catch{}
  }
  _createStatsReplayOverlay(payload){
    if(!this._tdrEmbeddedReplay)return super._createStatsReplayOverlay(payload);
    this._destroyStatsReplayOverlay(false);
    const target=this._embeddedReplayTarget();if(!target){this._tdrEmbeddedReplay=false;return super._createStatsReplayOverlay(payload);}
    const state=this._tdrStatsReplay;try{target.style.position='relative';target.style.overflow='hidden';target.style.background='transparent';}catch{}
    const root=document.createElement('div');root.dataset.tdrStatsNativeReplay='1';root.dataset.tdrEmbeddedReplay='1';root.style.cssText='position:absolute;inset:0;z-index:6;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
    const button='height:32px;min-width:38px;border:1px solid rgba(79,234,255,.72);background:rgba(5,29,40,.90);color:#fff;font-weight:1000;font-size:12px;padding:0 8px;touch-action:manipulation';
    root.innerHTML=`<div style="position:absolute;left:8px;top:8px;padding:5px 7px;background:rgba(3,14,22,.78);border:1px solid rgba(82,232,255,.28)"><div style="font-size:6px;font-weight:1000;letter-spacing:.16em;color:#63edff">REPLAY REAL</div><div style="display:flex;align-items:baseline;gap:6px;margin-top:1px"><strong data-time style="font-size:15px;font-variant-numeric:tabular-nums">0:00.000</strong><span style="font-size:7px;color:#8fa9b7">/ ${fmt(state?.duration||payload?.lapMs)}</span></div></div><div style="position:absolute;left:8px;right:8px;bottom:7px;padding:5px 7px 6px;background:rgba(3,14,22,.86);border:1px solid rgba(82,232,255,.25);pointer-events:auto"><input data-seek aria-label="Posición del replay" type="range" min="0" max="${Math.max(1,Math.round(state?.duration||payload?.lapMs||1))}" step="1" value="0" style="display:block;width:100%;height:18px;margin:0 0 3px;accent-color:#58efff;touch-action:none"><div style="display:flex;align-items:center;justify-content:center;gap:5px"><button data-start style="${button}">↶ 0</button><button data-prev style="${button}">◀│</button><button data-pause style="${button};min-width:46px;font-size:15px">Ⅱ</button><button data-next style="${button}">│▶</button><button data-speed style="${button};min-width:48px">1×</button></div></div>`;
    target.appendChild(root);this._tdrStatsReplayOverlay=root;
    root.querySelector('[data-start]')?.addEventListener('click',()=>this._seekStatsReplay(0,true));root.querySelector('[data-prev]')?.addEventListener('click',()=>this._stepStatsReplaySample(-1));root.querySelector('[data-next]')?.addEventListener('click',()=>this._stepStatsReplaySample(1));
    root.querySelector('[data-pause]')?.addEventListener('click',()=>{const s=this._tdrStatsReplay;if(!s)return;if(s.finished){s.elapsed=0;s.finished=false;s.playing=true;this._applyStatsReplayFrame(0);}else s.playing=!s.playing;this._syncStatsReplayControls();});
    root.querySelector('[data-speed]')?.addEventListener('click',()=>{const s=this._tdrStatsReplay;if(!s)return;const speeds=[.25,.5,1,2],idx=Math.max(0,speeds.indexOf(Number(s.speed)||1));s.speed=speeds[(idx+1)%speeds.length];this._syncStatsReplayControls();});
    root.querySelector('[data-seek]')?.addEventListener('input',e=>this._seekStatsReplay(Number(e.currentTarget?.value)||0,true));requestAnimationFrame(()=>this._syncEmbeddedReplayViewport());
  }
  _applyStatsReplayFrame(t){
    super._applyStatsReplayFrame(t);
    if(this._tdrEmbeddedReplay)this._syncEmbeddedReplayCamera(t);
  }
  _destroyStatsReplayOverlay(restore=true){const result=super._destroyStatsReplayOverlay?.(restore);if(this._tdrEmbeddedReplay)this._cleanupEmbeddedBackdrop();return result;}
  _exitStatsNativeReplay(){if(!this._tdrEmbeddedReplay)return super._exitStatsNativeReplay?.();try{sessionStorage.removeItem('tdr2:statsNativeReplay');}catch{}this._destroyStatsReplayOverlay(false);try{this.scene.stop();}catch{}}
  update(time,delta){
    const result=super.update(time,delta);
    if(this._tdrEmbeddedReplay)this._syncEmbeddedReplayCamera(this._tdrStatsReplay?.elapsed||0);
    return result;
  }
}

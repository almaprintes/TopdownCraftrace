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

function fmt(ms){
  ms=Math.max(0,Number(ms)||0);
  const m=Math.floor(ms/60000),s=(ms%60000)/1000;
  return`${m}:${s.toFixed(3).padStart(6,'0')}`;
}

export class RaceScene extends CleanRaceScene{
  _startStatsNativeReplay(payload){
    this._tdrEmbeddedReplay=payload?.embedded===true;
    const result=super._startStatsNativeReplay(payload);
    if(this._tdrEmbeddedReplay){
      this._syncEmbeddedReplayViewport();
      this._applyStatsReplayFrame(0);
    }
    return result;
  }

  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();
    if(!this._tdrEmbeddedReplay)return;
    // Full-screen replay intentionally hides siblings of the canvas. Embedded
    // replay must leave Race Control alive, so only the exact driving/HUD roots
    // hidden by RaceReplayCleanScene remain gated.
    try{this._tdrReplayDomParent?.removeAttribute?.('data-tdr-native-replay');}catch{}
    this._tdrReplayDomParent=null;
  }

  _embeddedReplayTarget(){
    try{return document.querySelector('[data-br-native-replay-screen="1"]');}catch{return null;}
  }

  _syncEmbeddedReplayViewport(){
    if(!this._tdrEmbeddedReplay)return null;
    const target=this._embeddedReplayTarget();
    const canvas=this.game?.canvas;
    const cam=this.cameras?.main;
    if(!target||!canvas||!cam)return null;
    const tr=target.getBoundingClientRect?.();
    const cr=canvas.getBoundingClientRect?.();
    const gw=Number(this.scale?.width)||Number(canvas.width)||0;
    const gh=Number(this.scale?.height)||Number(canvas.height)||0;
    if(!tr||!cr||cr.width<=0||cr.height<=0||gw<=0||gh<=0)return null;
    const sx=gw/cr.width,sy=gh/cr.height;
    const x=Math.max(0,(tr.left-cr.left)*sx);
    const y=Math.max(0,(tr.top-cr.top)*sy);
    const w=Math.max(1,Math.min(gw-x,tr.width*sx));
    const h=Math.max(1,Math.min(gh-y,tr.height*sy));
    try{cam.setViewport(x,y,w,h);}catch{}
    return{x,y,w,h};
  }

  _createStatsReplayOverlay(payload){
    if(!this._tdrEmbeddedReplay)return super._createStatsReplayOverlay(payload);
    this._destroyStatsReplayOverlay(false);
    const target=this._embeddedReplayTarget();
    if(!target){
      this._tdrEmbeddedReplay=false;
      return super._createStatsReplayOverlay(payload);
    }
    const state=this._tdrStatsReplay;
    try{target.style.position='relative';target.style.overflow='hidden';}catch{}
    const root=document.createElement('div');
    root.dataset.tdrStatsNativeReplay='1';
    root.dataset.tdrEmbeddedReplay='1';
    root.style.cssText='position:absolute;inset:0;z-index:6;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
    const button='height:32px;min-width:38px;border:1px solid rgba(79,234,255,.72);background:rgba(5,29,40,.90);color:#fff;font-weight:1000;font-size:12px;padding:0 8px;touch-action:manipulation';
    root.innerHTML=`
      <div style="position:absolute;left:8px;top:8px;padding:5px 7px;background:rgba(3,14,22,.78);border:1px solid rgba(82,232,255,.28);pointer-events:none">
        <div style="font-size:6px;font-weight:1000;letter-spacing:.16em;color:#63edff">REPLAY REAL</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:1px"><strong data-time style="font-size:15px;font-variant-numeric:tabular-nums">0:00.000</strong><span style="font-size:7px;color:#8fa9b7">/ ${fmt(state?.duration||payload?.lapMs)}</span></div>
      </div>
      <div style="position:absolute;left:8px;right:8px;bottom:7px;padding:5px 7px 6px;background:rgba(3,14,22,.86);border:1px solid rgba(82,232,255,.25);pointer-events:auto">
        <input data-seek aria-label="Posición del replay" type="range" min="0" max="${Math.max(1,Math.round(state?.duration||payload?.lapMs||1))}" step="1" value="0" style="display:block;width:100%;height:18px;margin:0 0 3px;accent-color:#58efff;touch-action:none">
        <div style="display:flex;align-items:center;justify-content:center;gap:5px">
          <button data-start title="Volver al inicio" aria-label="Volver al inicio" style="${button}">↶ 0</button>
          <button data-prev title="Muestra anterior" aria-label="Muestra anterior" style="${button}">◀│</button>
          <button data-pause title="Reproducir o pausar" aria-label="Reproducir o pausar" style="${button};min-width:46px;font-size:15px">Ⅱ</button>
          <button data-next title="Muestra siguiente" aria-label="Muestra siguiente" style="${button}">│▶</button>
          <button data-speed title="Velocidad de reproducción" aria-label="Velocidad de reproducción" style="${button};min-width:48px">1×</button>
        </div>
      </div>`;
    target.appendChild(root);
    this._tdrStatsReplayOverlay=root;
    root.querySelector('[data-start]')?.addEventListener('click',()=>this._seekStatsReplay(0,true));
    root.querySelector('[data-prev]')?.addEventListener('click',()=>this._stepStatsReplaySample(-1));
    root.querySelector('[data-next]')?.addEventListener('click',()=>this._stepStatsReplaySample(1));
    root.querySelector('[data-pause]')?.addEventListener('click',()=>{
      const s=this._tdrStatsReplay;if(!s)return;
      if(s.finished){s.elapsed=0;s.finished=false;s.playing=true;this._applyStatsReplayFrame(0);}else s.playing=!s.playing;
      this._syncStatsReplayControls();
    });
    root.querySelector('[data-speed]')?.addEventListener('click',()=>{
      const s=this._tdrStatsReplay;if(!s)return;
      const speeds=[0.25,0.5,1,2];
      const current=Number(s.speed)||1;
      const idx=Math.max(0,speeds.indexOf(current));
      s.speed=speeds[(idx+1)%speeds.length];
      this._syncStatsReplayControls();
    });
    root.querySelector('[data-seek]')?.addEventListener('input',e=>this._seekStatsReplay(Number(e.currentTarget?.value)||0,true));
    requestAnimationFrame(()=>this._syncEmbeddedReplayViewport());
  }

  _applyStatsReplayFrame(t){
    super._applyStatsReplayFrame(t);
    if(!this._tdrEmbeddedReplay)return;
    const viewport=this._syncEmbeddedReplayViewport();
    const state=this._tdrStatsReplay;
    if(!viewport||!state)return;
    const recorded=camAt(state.payload?.cameraSamples,t);
    if(recorded&&Number.isFinite(recorded.w)&&Number.isFinite(recorded.h)&&recorded.w>0&&recorded.h>0){
      const zoom=Math.max(.01,Math.min(viewport.w/recorded.w,viewport.h/recorded.h));
      try{
        this.cameras.main.stopFollow();
        this.cameras.main.setZoom(zoom);
        this.cameras.main.centerOn(recorded.x+recorded.w*.5,recorded.y+recorded.h*.5);
      }catch{}
    }
  }

  _exitStatsNativeReplay(){
    if(!this._tdrEmbeddedReplay)return super._exitStatsNativeReplay?.();
    try{sessionStorage.removeItem('tdr2:statsNativeReplay');}catch{}
    this._destroyStatsReplayOverlay(false);
    try{this.scene.stop();}catch{}
  }

  update(time,delta){
    if(this._tdrEmbeddedReplay)this._syncEmbeddedReplayViewport();
    return super.update(time,delta);
  }
}

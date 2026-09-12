import { RaceScene as CurrentRaceScene } from './RaceStaticGhostStatusScene.js';

const TOP_REPLAY_PREFIX='tdr2:topReplay:';
const SESSION_KEY='tdr2:statsNativeReplay';
const REPLAY_SPEEDS=[0.25,0.5,1,2];
const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
const text=v=>String(v??'').trim();
function lapId(trackId,row,index=0){const t=Number(row?.t||row?.timestamp||0);const car=text(row?.carId)||'car';const ms=Math.round(positive(row?.lapMs??row?.ms??row?.time)||0);return`${trackId}:${car}:${t||index}:${ms}`;}
function replayKey(trackId,row,index=0){return`${TOP_REPLAY_PREFIX}${encodeURIComponent(String(trackId||''))}:${encodeURIComponent(lapId(trackId,row,index))}`;}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function remove(key){try{localStorage.removeItem(key);}catch{}}
function validLap(row){const ms=positive(row?.lapMs??row?.ms??row?.time);return row?.valid!==false&&row?.invalid!==true&&ms!=null;}
function cameraSample(scene,t){const cam=scene?.cameras?.main,view=cam?.worldView;if(!cam||!view)return null;const x=Number(view.x),y=Number(view.y),w=Number(view.width),h=Number(view.height),zoom=Number(cam.zoom);if(![x,y,w,h,zoom].every(Number.isFinite)||w<=0||h<=0||zoom<=0)return null;return{t:Number(t)||0,x,y,w,h,zoom};}
function angleMix(a,b,q){let d=Number(b)-Number(a);while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return Number(a)+d*q;}
function sampleAt(samples,t){if(!Array.isArray(samples)||!samples.length)return null;let i=1;while(i<samples.length&&Number(samples[i].t)<t)i++;const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a;const span=Math.max(1,Number(b.t)-Number(a.t)),q=Math.max(0,Math.min(1,(t-Number(a.t))/span));return{x:Number(a.x)+(Number(b.x)-Number(a.x))*q,y:Number(a.y)+(Number(b.y)-Number(a.y))*q,r:angleMix(a.r,b.r,q)};}
function camAt(samples,t){if(!Array.isArray(samples)||!samples.length)return null;let i=1;while(i<samples.length&&Number(samples[i].t)<t)i++;const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a;const span=Math.max(1,Number(b.t)-Number(a.t)),q=Math.max(0,Math.min(1,(t-Number(a.t))/span));const mix=k=>Number(a[k])+(Number(b[k])-Number(a[k]))*q;return{x:mix('x'),y:mix('y'),w:mix('w'),h:mix('h'),zoom:mix('zoom')};}
function fmt(ms){ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;}
function readNativeReplay(){try{const raw=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return raw&&Array.isArray(raw.samples)&&raw.samples.length>4?raw:null;}catch{return null;}}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const pending=data?.statsNativeReplay?readNativeReplay():null;
    const result=super.create(data);
    this._tdrReplayCameraSamples=[];
    this._tdrReplayCameraLastT=-Infinity;
    this._tdrStatsReplay=null;
    this._tdrStatsReplayHiddenObjects=[];
    if(pending)this.time?.delayedCall?.(0,()=>this._startStatsNativeReplay(pending));
    this.events?.once?.('shutdown',()=>{this._tdrReplayCameraSamples=[];this._destroyStatsReplayOverlay();});
    return result;
  }

  _startStatsNativeReplay(payload){
    if(!payload?.samples?.length||!this.carBody||!this.carRig)return;
    const duration=positive(payload.lapMs)||positive(payload.samples.at(-1)?.t)||1;
    this._tdrStatsReplay={payload,duration,elapsed:0,playing:true,finished:false,speed:1};
    try{this.physics?.world?.pause?.();}catch{}
    try{this.input.enabled=false;}catch{}
    try{this.carBody.setVelocity?.(0,0);}catch{}
    try{this.carBody.setAcceleration?.(0,0);}catch{}
    try{this.cameras.main.stopFollow();}catch{}
    this._hideStatsReplayGameplayUi();
    this._createStatsReplayOverlay(payload);
    this._applyStatsReplayFrame(0);
    this._syncStatsReplayControls();
  }

  _hideStatsReplayGameplayUi(){
    this._tdrStatsReplayHiddenObjects=[];
    const keep=new Set([this.car,this.carBody,this.carRig]);
    const hide=o=>{if(!o||keep.has(o)||o.visible===false)return;try{this._tdrStatsReplayHiddenObjects.push(o);o.setVisible?.(false);}catch{}};
    for(const obj of this.children?.list||[]){const sx=Number(obj?.scrollFactorX),sy=Number(obj?.scrollFactorY);if(sx===0&&sy===0)hide(obj);}
    hide(this.touchUI);hide(this.hud);hide(this.ttPanel);hide(this._startModal);hide(this._startModalBg);hide(this._ghostSprite);hide(this.cpGfx);hide(this.gridDebug);hide(this.finishLineDebug);hide(this._touchDbg);
    for(const value of Object.values(this.ttHud||{}))hide(value);
    for(const value of Object.values(this.minimap||{}))hide(value);
    try{document.querySelectorAll('[data-tdr-static-minimap],[data-tdr-static-ghost-status],[data-tdr-touch-controls],[data-tdr-race-controls],[data-tdr-race-hud]').forEach(el=>{el.dataset.tdrReplayWasDisplay=el.style.display||'';el.style.display='none';});}catch{}
  }

  _createStatsReplayOverlay(payload){
    this._destroyStatsReplayOverlay(false);
    const state=this._tdrStatsReplay;
    const root=document.createElement('div');root.dataset.tdrStatsNativeReplay='1';
    root.style.cssText='position:fixed;inset:0;z-index:2147483300;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
    const button='height:38px;min-width:44px;border:1px solid #4feaff;background:rgba(5,29,40,.94);color:#fff;font-weight:1000;font-size:14px;padding:0 10px;touch-action:manipulation';
    root.innerHTML=`
      <div style="position:absolute;left:max(12px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));padding:8px 11px;background:rgba(3,14,22,.86);border:1px solid rgba(82,232,255,.45);box-shadow:0 8px 24px rgba(0,0,0,.25)">
        <div style="font-size:8px;font-weight:1000;letter-spacing:.18em;color:#63edff">RACE CONTROL // REPLAY REAL</div>
        <div style="margin-top:2px;font-size:17px;font-weight:1000;letter-spacing:.03em">${String(payload.trackId||this.trackKey||'CIRCUITO').toUpperCase()}</div>
        <div style="font-size:9px;font-weight:850;color:#90a9b7">${String(payload.carId||this.carId||'COCHE').toUpperCase()} · ${fmt(payload.lapMs)}</div>
      </div>
      <div style="position:absolute;right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;gap:7px;pointer-events:auto">
        <button data-back style="${button};padding:0 14px;letter-spacing:.06em">← RACE CONTROL</button>
      </div>
      <div style="position:absolute;left:50%;bottom:max(13px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(590px,calc(100vw - 24px));box-sizing:border-box;padding:8px 12px 9px;background:rgba(3,14,22,.88);border:1px solid rgba(82,232,255,.32);text-align:center;pointer-events:auto">
        <div style="display:flex;align-items:baseline;justify-content:center;gap:9px"><div data-time style="font-size:22px;font-weight:1000;font-variant-numeric:tabular-nums">0:00.000</div><div data-total style="font-size:10px;font-weight:850;color:#8fa9b7">/ ${fmt(state?.duration||payload.lapMs)}</div></div>
        <input data-seek aria-label="Posición del replay" type="range" min="0" max="${Math.max(1,Math.round(state?.duration||payload.lapMs||1))}" step="1" value="0" style="display:block;width:100%;height:22px;margin:1px 0 3px;accent-color:#58efff;touch-action:none">
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap">
          <button data-start title="Volver al inicio" aria-label="Volver al inicio" style="${button}">↶ 0</button>
          <button data-prev title="Muestra anterior" aria-label="Muestra anterior" style="${button}">◀│</button>
          <button data-pause title="Reproducir o pausar" aria-label="Reproducir o pausar" style="${button};min-width:54px;font-size:17px">Ⅱ</button>
          <button data-next title="Muestra siguiente" aria-label="Muestra siguiente" style="${button}">│▶</button>
          <button data-speed title="Velocidad de reproducción" aria-label="Velocidad de reproducción" style="${button};min-width:58px">1×</button>
        </div>
      </div>`;
    document.body.appendChild(root);this._tdrStatsReplayOverlay=root;
    root.querySelector('[data-back]')?.addEventListener('click',()=>this._exitStatsNativeReplay());
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
      const idx=Math.max(0,REPLAY_SPEEDS.indexOf(Number(s.speed)||1));
      s.speed=REPLAY_SPEEDS[(idx+1)%REPLAY_SPEEDS.length];
      this._syncStatsReplayControls();
    });
    root.querySelector('[data-seek]')?.addEventListener('input',e=>this._seekStatsReplay(Number(e.currentTarget?.value)||0,true));
  }

  _seekStatsReplay(t,pause=false){
    const s=this._tdrStatsReplay;if(!s)return;
    s.elapsed=Math.max(0,Math.min(s.duration,Number(t)||0));
    if(pause)s.playing=false;
    s.finished=s.elapsed>=s.duration;
    this._applyStatsReplayFrame(s.elapsed);
    this._syncStatsReplayControls();
  }

  _stepStatsReplaySample(direction){
    const s=this._tdrStatsReplay;if(!s)return;
    const samples=Array.isArray(s.payload?.samples)?s.payload.samples:[];
    if(!samples.length)return;
    const now=Number(s.elapsed)||0;
    let target=now;
    if(direction<0){
      for(let i=samples.length-1;i>=0;i--){const t=Number(samples[i]?.t);if(Number.isFinite(t)&&t<now-.5){target=t;break;}}
      if(target===now)target=0;
    }else{
      for(let i=0;i<samples.length;i++){const t=Number(samples[i]?.t);if(Number.isFinite(t)&&t>now+.5){target=t;break;}}
      if(target===now)target=s.duration;
    }
    this._seekStatsReplay(target,true);
  }

  _syncStatsReplayControls(){
    const s=this._tdrStatsReplay,root=this._tdrStatsReplayOverlay;if(!s||!root)return;
    const pause=root.querySelector('[data-pause]'),speed=root.querySelector('[data-speed]'),seek=root.querySelector('[data-seek]');
    if(pause)pause.textContent=s.finished?'↻':(s.playing?'Ⅱ':'▶');
    if(speed)speed.textContent=`${Number(s.speed)||1}×`;
    if(seek)seek.value=String(Math.round(Math.max(0,Math.min(s.duration,s.elapsed))));
  }

  _restoreStatsReplayGameplayUi(){
    for(const obj of this._tdrStatsReplayHiddenObjects||[]){try{obj?.setVisible?.(true);}catch{}}
    this._tdrStatsReplayHiddenObjects=[];
    try{document.querySelectorAll('[data-tdr-static-minimap],[data-tdr-static-ghost-status],[data-tdr-touch-controls],[data-tdr-race-controls],[data-tdr-race-hud]').forEach(el=>{if(el.dataset.tdrReplayWasDisplay!=null){el.style.display=el.dataset.tdrReplayWasDisplay;delete el.dataset.tdrReplayWasDisplay;}});}catch{}
  }

  _destroyStatsReplayOverlay(restore=true){try{this._tdrStatsReplayOverlay?.remove?.();}catch{}this._tdrStatsReplayOverlay=null;if(restore)this._restoreStatsReplayGameplayUi();}

  _exitStatsNativeReplay(){
    const trackId=String(this._tdrStatsReplay?.payload?.returnTrackId||this.trackKey||'track01');
    try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.setItem('tdr2:statsReturnTrack',trackId);}catch{}
    this._destroyStatsReplayOverlay(false);
    this.scene.start('StatsScene',{raceControlTrackId:trackId});
  }

  _applyStatsReplayFrame(t){
    const state=this._tdrStatsReplay;if(!state)return;
    const p=sampleAt(state.payload.samples,t);if(!p)return;
    try{this.carBody.setPosition(p.x,p.y);this.carBody.rotation=p.r;}catch{}
    try{this.carRig.setPosition(p.x,p.y);this.carRig.rotation=p.r+(this._carVisualRotOffset||0);}catch{}
    const cam=camAt(state.payload.cameraSamples,t);
    if(cam){try{this.cameras.main.stopFollow();this.cameras.main.setZoom(cam.zoom);this.cameras.main.setScroll(cam.x,cam.y);}catch{}}else{try{this.cameras.main.centerOn(p.x,p.y);}catch{}}
    const root=this._tdrStatsReplayOverlay;if(root){const time=root.querySelector('[data-time]'),seek=root.querySelector('[data-seek]');if(time)time.textContent=fmt(t);if(seek&&!seek.matches(':active'))seek.value=String(Math.round(Math.max(0,Math.min(state.duration,t))));}
  }

  update(time,delta){
    if(this._tdrStatsReplay){
      const s=this._tdrStatsReplay;
      if(s.playing&&!s.finished){
        s.elapsed=Math.min(s.duration,s.elapsed+Math.max(0,Number(delta)||0)*(Number(s.speed)||1));
        this._applyStatsReplayFrame(s.elapsed);
        if(s.elapsed>=s.duration){s.playing=false;s.finished=true;}
        this._syncStatsReplayControls();
      }
      return;
    }
    const result=super.update?.(time,delta);
    if(this._replayActive)return result;
    const latest=Array.isArray(this._ghostSamples)&&this._ghostSamples.length?this._ghostSamples[this._ghostSamples.length-1]:null;
    const t=Number(latest?.t);
    if(Number.isFinite(t)&&t>=0&&t>this._tdrReplayCameraLastT+20){const sample=cameraSample(this,t);if(sample){this._tdrReplayCameraSamples.push(sample);this._tdrReplayCameraLastT=t;}}
    return result;
  }

  _completedLapCheck(now){
    if(this._tdrStatsReplay)return;
    if(this._replayActive)return super._completedLapCheck(now);
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(hist.length>this._ghostHistoryLen){
      const last=hist[hist.length-1]||{};const lapMs=positive(last.lapMs??this.timing?.lastLap);const trackId=String(this._ghostTrackKey||this.trackKey||'track01');const ranked=hist.filter(validLap).map((row,index)=>({row,index,ms:positive(row?.lapMs??row?.ms??row?.time)})).sort((a,b)=>a.ms-b.ms);const rankedIndex=ranked.findIndex(item=>item.row===last);const qualifies=lapMs&&rankedIndex>=0&&rankedIndex<10&&Array.isArray(this._ghostSamples)&&this._ghostSamples.length>4;
      if(qualifies){const samples=this._ghostSamples.filter(s=>Number.isFinite(Number(s?.t))&&Number(s.t)>=0&&Number(s.t)<lapMs).map(s=>({t:Number(s.t),x:Number(s.x),y:Number(s.y),r:Number(s.r||0)}));if(this.carBody)samples.push({t:Math.round(lapMs),x:Number(this.carBody.x||0),y:Number(this.carBody.y||0),r:Number(this.carBody.rotation||0)});const cameraSamples=(this._tdrReplayCameraSamples||[]).filter(s=>Number.isFinite(Number(s?.t))&&Number(s.t)>=0&&Number(s.t)<=lapMs).map(s=>({t:Number(s.t),x:Number(s.x),y:Number(s.y),w:Number(s.w),h:Number(s.h),zoom:Number(s.zoom)}));const finalCam=cameraSample(this,lapMs);if(finalCam)cameraSamples.push(finalCam);const key=replayKey(trackId,last,hist.length-1);if(samples.length>4)write(key,{version:5,kind:'local-top10-lap',trackKey:trackId,carId:text(last.carId)||this._tdrCurrentGhostCarId||this.carId||null,lapMs:Math.round(lapMs),recordedAt:Number(last.t||last.timestamp)||Date.now(),historyIndex:hist.length-1,samples,cameraSamples,viewport:{w:Number(this.scale?.width)||0,h:Number(this.scale?.height)||0}});}
      const keep=new Set(ranked.slice(0,10).map(item=>replayKey(trackId,item.row,item.index)));try{const prefix=`${TOP_REPLAY_PREFIX}${encodeURIComponent(trackId)}:`;for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)||'';if(key.startsWith(prefix)&&!keep.has(key))remove(key);}}catch{}
    }
    const result=super._completedLapCheck(now);this._tdrReplayCameraSamples=[];this._tdrReplayCameraLastT=-Infinity;return result;
  }
}

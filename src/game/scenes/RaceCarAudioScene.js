import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SETTINGS_KEY='tdr2:settings';
const ENGINE_FILES=Array.from({length:6},(_,i)=>`${BASE}assets/audio/cars/veloce_flash/engine/loop_${i}.wav`);
const SHIFT_FILE=`${BASE}assets/audio/cars/veloce_flash/transmission/freesound_community-shifting-car-42962.mp3`;
const TURBO_FILE=`${BASE}assets/audio/cars/veloce_flash/turbo/audley_fergine-car-turbo-loop-288859.mp3`;
const FLUTTER_FILE=`${BASE}assets/audio/cars/veloce_flash/turbo/spinopel-turbo-flutter-336362.mp3`;

function audioPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    const a=s?.audio||{};
    return {
      master:clamp(Number(a.master??1),0,1),
      engine:clamp(Number(a.engine??1),0,1),
      effects:clamp(Number(a.effects??.7),0,1),
      mute:!!a.mute
    };
  }catch{return{master:1,engine:1,effects:.7,mute:false};}
}

async function decodeUrl(ctx,url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error(`audio ${res.status}: ${url}`);
  return ctx.decodeAudioData(await res.arrayBuffer());
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._carAudioReady=false;
    this._carAudioLoading=false;
    this._carAudioDestroyed=false;
    this._carAudioPrevThrottle=0;
    this._carAudioGear=1;
    this._carAudioAccum=0;
    this._carAudioSpeed01=0;
    this._carAudioUnlock=()=>this._ensureCarAudio();
    window.addEventListener('pointerdown',this._carAudioUnlock,{passive:true});
    window.addEventListener('touchstart',this._carAudioUnlock,{passive:true});
    window.addEventListener('keydown',this._carAudioUnlock,{passive:true});
    this.events.once('shutdown',()=>this._destroyCarAudio());
    this.events.once('destroy',()=>this._destroyCarAudio());
    return result;
  }

  async _ensureCarAudio(){
    if(this._carAudioReady){
      try{if(this._carAudioCtx?.state==='suspended')await this._carAudioCtx.resume();}catch{}
      return;
    }
    if(this._carAudioLoading)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    this._carAudioLoading=true;
    try{
      const ctx=this._carAudioCtx||new AC();
      this._carAudioCtx=ctx;
      try{await ctx.resume();}catch{}
      const [engineBuffers,shiftBuffer,turboBuffer,flutterBuffer]=await Promise.all([
        Promise.all(ENGINE_FILES.map(url=>decodeUrl(ctx,url))),
        decodeUrl(ctx,SHIFT_FILE),decodeUrl(ctx,TURBO_FILE),decodeUrl(ctx,FLUTTER_FILE)
      ]);
      if(this._carAudioDestroyed)return;
      const master=ctx.createGain();
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-8;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.22;
      master.connect(limiter).connect(ctx.destination);
      const engineBus=ctx.createGain();
      const engineFilter=ctx.createBiquadFilter();
      engineFilter.type='lowpass';engineFilter.frequency.value=2400;engineFilter.Q.value=.4;
      engineBus.connect(engineFilter).connect(master);
      const layers=engineBuffers.map((buffer,i)=>{
        const src=ctx.createBufferSource(),gain=ctx.createGain();
        src.buffer=buffer;src.loop=true;gain.gain.value=0;
        src.connect(gain).connect(engineBus);src.start();
        return{src,gain,i};
      });
      const turboSrc=ctx.createBufferSource(),turboGain=ctx.createGain(),turboFilter=ctx.createBiquadFilter();
      turboSrc.buffer=turboBuffer;turboSrc.loop=true;turboGain.gain.value=0;
      turboFilter.type='highpass';turboFilter.frequency.value=900;
      turboSrc.connect(turboFilter).connect(turboGain).connect(master);turboSrc.start();
      this._carAudio={master,engineBus,engineFilter,layers,shiftBuffer,flutterBuffer,turboSrc,turboGain};
      this._carAudioReady=true;this._carAudioLoading=false;
      this._updateCarAudio(16.7,true);
    }catch(err){
      this._carAudioLoading=false;
      console.warn('[TDR2 car audio] sample engine init failed',err);
    }
  }

  _playCarOneShot(buffer,volume=.3,rate=1){
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a||!buffer||ctx.state!=='running')return;
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();
      src.buffer=buffer;src.playbackRate.value=rate;gain.gain.value=volume;
      src.connect(gain).connect(a.master);src.start();
    }catch{}
  }

  _updateCarAudio(delta,force=false){
    if(!this._carAudioReady){if(force)this._ensureCarAudio();return;}
    const ctx=this._carAudioCtx,a=this._carAudio;if(!ctx||!a)return;
    const now=ctx.currentTime,p=audioPrefs();
    const vel=this.carBody?.body?.velocity;
    const speed=Math.hypot(Number(vel?.x||0),Number(vel?.y||0));
    const maxFwd=Math.max(160,Number(this.carParams?.maxFwd||this.maxFwd||520));
    const rawSpeed01=clamp(speed/maxFwd,0,1);
    const dt=Math.max(.001,Number(delta||33.3)/1000);
    const speedAlpha=1-Math.exp(-dt/.16);
    this._carAudioSpeed01+=(rawSpeed01-this._carAudioSpeed01)*speedAlpha;
    const speed01=clamp(this._carAudioSpeed01,0,1);
    const throttle=clamp(Number(this.touch?.throttle??this._throttle??0),0,1);
    const band=speed01*5;
    const lower=Math.floor(band),upper=Math.min(5,lower+1),mix=band-lower;
    for(const layer of a.layers){
      let weight=0;
      if(layer.i===lower)weight=Math.cos(mix*Math.PI*.5);
      if(layer.i===upper)weight=Math.max(weight,Math.sin(mix*Math.PI*.5));
      const idleBoost=layer.i===0?clamp(1-speed01*4,0,1)*.32:0;
      const target=clamp(weight+idleBoost,0,1.12)*(.48+.52*throttle)*p.engine;
      layer.gain.gain.setTargetAtTime(target,now,.11);
      layer.src.playbackRate.setTargetAtTime(1,now,.10);
    }
    a.engineFilter.frequency.setTargetAtTime(1650+speed01*3000+throttle*550,now,.12);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.88:.42,now,.08);
    a.master.gain.setTargetAtTime(p.mute?0:p.master*.88,now,.04);
    const gear=clamp(Math.floor(rawSpeed01*6)+1,1,6);
    if(gear!==this._carAudioGear&&speed>45){
      this._carAudioGear=gear;
      this._playCarOneShot(a.shiftBuffer,.28*p.effects,.96+gear*.015);
    }
    const turboTarget=Math.pow(rawSpeed01,1.35)*throttle*.24*p.effects;
    a.turboGain.gain.setTargetAtTime(turboTarget,now,.07);
    a.turboSrc.playbackRate.setTargetAtTime(.92+rawSpeed01*.30,now,.09);
    if(this._carAudioPrevThrottle>.70&&throttle<.20&&rawSpeed01>.32){
      this._playCarOneShot(a.flutterBuffer,.38*p.effects,.94+rawSpeed01*.10);
    }
    this._carAudioPrevThrottle=throttle;
  }

  _destroyCarAudio(){
    if(this._carAudioDestroyed)return;
    this._carAudioDestroyed=true;
    if(this._carAudioUnlock){
      window.removeEventListener('pointerdown',this._carAudioUnlock);
      window.removeEventListener('touchstart',this._carAudioUnlock);
      window.removeEventListener('keydown',this._carAudioUnlock);
    }
    try{for(const l of this._carAudio?.layers||[])l.src?.stop?.();}catch{}
    try{this._carAudio?.turboSrc?.stop?.();}catch{}
    try{this._carAudioCtx?.close?.();}catch{}
    this._carAudio=null;this._carAudioCtx=null;this._carAudioReady=false;this._carAudioLoading=false;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._carAudioAccum+=Number(delta||0);
    if(this._carAudioAccum>=33){const dt=this._carAudioAccum;this._carAudioAccum=0;this._updateCarAudio(dt);}
    return result;
  }
}

import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SETTINGS_KEY='tdr2:settings';
const DYNO_FILE=`${BASE}assets/audio/cars/veloce_flash/engine/freesound_community-import-car-revs-on-chassis-dyno-with-turbo-66272.mp3`;
const SHIFT_FILE=`${BASE}assets/audio/cars/veloce_flash/transmission/freesound_community-shifting-car-42962.mp3`;
const TURBO_FILE=`${BASE}assets/audio/cars/veloce_flash/turbo/audley_fergine-car-turbo-loop-288859.mp3`;
const DYNO_START=.18;
const DYNO_LIMIT=24.0;

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
    this._carAudioGear=1;
    this._carAudioLastShiftAt=-99;
    this._carAudioAccum=0;
    this._carAudioSpeed01=0;
    this._carAudioRev01=0;
    this._carAudioDynoPos=DYNO_START;
    this._carAudioLastGrainAt=-99;
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
      const [dynoBuffer,shiftBuffer,turboBuffer]=await Promise.all([
        decodeUrl(ctx,DYNO_FILE),decodeUrl(ctx,SHIFT_FILE),decodeUrl(ctx,TURBO_FILE)
      ]);
      if(this._carAudioDestroyed)return;
      const master=ctx.createGain();
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-8;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.22;
      master.connect(limiter).connect(ctx.destination);

      const engineBus=ctx.createGain();
      const engineFilter=ctx.createBiquadFilter();
      engineFilter.type='lowpass';engineFilter.frequency.value=3000;engineFilter.Q.value=.35;
      engineBus.connect(engineFilter).connect(master);

      const turboSrc=ctx.createBufferSource(),turboGain=ctx.createGain(),turboFilter=ctx.createBiquadFilter();
      turboSrc.buffer=turboBuffer;turboSrc.loop=true;turboGain.gain.value=0;
      turboFilter.type='highpass';turboFilter.frequency.value=1000;
      turboSrc.connect(turboFilter).connect(turboGain).connect(master);turboSrc.start();

      this._carAudio={master,engineBus,engineFilter,dynoBuffer,shiftBuffer,turboSrc,turboGain,grains:new Set()};
      this._carAudioReady=true;this._carAudioLoading=false;
      this._updateCarAudio(16.7,true);
    }catch(err){
      this._carAudioLoading=false;
      console.warn('[TDR2 car audio] dyno engine init failed',err);
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

  _spawnDynoGrain(offset,rate,volume){
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a?.dynoBuffer||ctx.state!=='running')return;
    const now=ctx.currentTime;
    const safeOffset=clamp(offset,DYNO_START,Math.min(DYNO_LIMIT,a.dynoBuffer.duration-.4));
    try{
      const src=ctx.createBufferSource(),gain=ctx.createGain();
      src.buffer=a.dynoBuffer;
      src.playbackRate.value=clamp(rate,.92,1.35);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(volume,now+.055);
      gain.gain.setValueAtTime(volume,now+.19);
      gain.gain.linearRampToValueAtTime(0,now+.31);
      src.connect(gain).connect(a.engineBus);
      src.start(now,safeOffset);
      src.stop(now+.34);
      a.grains.add(src);
      src.onended=()=>a.grains.delete(src);
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

    // RPM audible: la velocidad manda, pero el pedal anticipa la subida.
    const targetRev=clamp(speed01*.88+throttle*.20,0,1);
    const tau=targetRev>this._carAudioRev01?.20:.48;
    const revAlpha=1-Math.exp(-dt/tau);
    this._carAudioRev01+=(targetRev-this._carAudioRev01)*revAlpha;
    const rev01=clamp(this._carAudioRev01,0,1);

    // La grabación completa funciona como una cinta de régimen entre 0.18 y 24 s.
    // Al levantar gas la posición objetivo retrocede; los granos siempre se reproducen
    // hacia delante, evitando el efecto artificial de audio literalmente invertido.
    const targetPos=DYNO_START+(DYNO_LIMIT-DYNO_START)*rev01;
    const posTau=targetPos>this._carAudioDynoPos?.16:.34;
    const posAlpha=1-Math.exp(-dt/posTau);
    this._carAudioDynoPos+=(targetPos-this._carAudioDynoPos)*posAlpha;
    this._carAudioDynoPos=clamp(this._carAudioDynoPos,DYNO_START,DYNO_LIMIT);

    if(now-this._carAudioLastGrainAt>=.105){
      this._carAudioLastGrainAt=now;
      const rate=.98+rev01*.37;
      const volume=(.46+.26*throttle+.10*rev01)*p.engine;
      this._spawnDynoGrain(this._carAudioDynoPos,rate,volume);
    }

    a.engineFilter.frequency.setTargetAtTime(2100+rev01*3600+throttle*450,now,.10);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.92:.48,now,.08);
    a.master.gain.setTargetAtTime(p.mute?0:p.master*.88,now,.04);

    // Cambio solo al subir de marcha y con cooldown para evitar repetición en umbrales.
    const gear=clamp(Math.floor(rawSpeed01*6)+1,1,6);
    if(gear>this._carAudioGear&&speed>45&&now-this._carAudioLastShiftAt>.50){
      this._carAudioGear=gear;
      this._carAudioLastShiftAt=now;
      this._playCarOneShot(a.shiftBuffer,.34*p.effects,.97+gear*.012);
    }else if(gear<this._carAudioGear-1){
      this._carAudioGear=gear;
    }

    const turboTarget=Math.pow(rawSpeed01,1.45)*throttle*.16*p.effects;
    a.turboGain.gain.setTargetAtTime(turboTarget,now,.09);
    a.turboSrc.playbackRate.setTargetAtTime(.94+rawSpeed01*.24,now,.10);
  }

  _destroyCarAudio(){
    if(this._carAudioDestroyed)return;
    this._carAudioDestroyed=true;
    if(this._carAudioUnlock){
      window.removeEventListener('pointerdown',this._carAudioUnlock);
      window.removeEventListener('touchstart',this._carAudioUnlock);
      window.removeEventListener('keydown',this._carAudioUnlock);
    }
    try{for(const src of this._carAudio?.grains||[])src?.stop?.();}catch{}
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

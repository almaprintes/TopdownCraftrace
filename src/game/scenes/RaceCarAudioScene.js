import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SETTINGS_KEY='tdr2:settings';
const DYNO_FILE=`${BASE}assets/audio/cars/veloce_flash/engine/freesound_community-import-car-revs-on-chassis-dyno-with-turbo-66272.mp3`;
const DYNO_START=.18;
const DYNO_LIMIT=24.0;

function audioPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    const a=s?.audio||{};
    return {
      master:clamp(Number(a.master??1),0,1),
      engine:clamp(Number(a.engine??1),0,1),
      mute:!!a.mute
    };
  }catch{return{master:1,engine:1,mute:false};}
}

async function decodeUrl(ctx,url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error(`audio ${res.status}: ${url}`);
  const ab=await res.arrayBuffer();
  return ctx.decodeAudioData(ab.slice(0));
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._carAudioReady=false;
    this._carAudioLoading=false;
    this._carAudioDestroyed=false;
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
      try{if(this._carAudioCtx?.state!=='running')await this._carAudioCtx.resume();}catch{}
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

      // Cargar SOLO el motor. Ningún efecto secundario puede impedir que arranque.
      const dynoBuffer=await decodeUrl(ctx,DYNO_FILE);
      if(this._carAudioDestroyed)return;

      // En iOS el contexto puede volver a suspendirse durante fetch/decode.
      // Reanudamos otra vez después de decodificar, igual que en el Dyno Lab validado.
      try{if(ctx.state!=='running')await ctx.resume();}catch{}

      const master=ctx.createGain();
      master.gain.value=.88;
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-8;
      limiter.knee.value=18;
      limiter.ratio.value=5;
      limiter.attack.value=.008;
      limiter.release.value=.22;
      master.connect(limiter).connect(ctx.destination);

      const engineBus=ctx.createGain();
      engineBus.gain.value=.9;
      const engineFilter=ctx.createBiquadFilter();
      engineFilter.type='lowpass';
      engineFilter.frequency.value=3400;
      engineFilter.Q.value=.30;
      engineBus.connect(engineFilter).connect(master);

      this._carAudio={master,engineBus,engineFilter,dynoBuffer,grains:new Set()};
      this._carAudioReady=true;
      this._carAudioLoading=false;
      this._updateCarAudio(16.7,true);
      console.info('[TDR2 car audio] Veloce dyno ready',dynoBuffer.duration,ctx.state);
    }catch(err){
      this._carAudioLoading=false;
      console.warn('[TDR2 car audio] dyno engine init failed',err);
    }
  }

  _spawnDynoGrain(offset,rate,volume){
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a?.dynoBuffer)return;
    const now=ctx.currentTime;
    const safeOffset=clamp(offset,DYNO_START,Math.min(DYNO_LIMIT,a.dynoBuffer.duration-.5));
    try{
      const src=ctx.createBufferSource();
      const gain=ctx.createGain();
      src.buffer=a.dynoBuffer;
      src.playbackRate.value=clamp(rate,.94,1.35);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(volume,now+.045);
      gain.gain.setValueAtTime(volume,now+.20);
      gain.gain.linearRampToValueAtTime(0,now+.32);
      src.connect(gain).connect(a.engineBus);
      src.start(now,safeOffset);
      src.stop(now+.35);
      a.grains.add(src);
      src.onended=()=>a.grains.delete(src);
    }catch{}
  }

  _updateCarAudio(delta,force=false){
    if(!this._carAudioReady){if(force)this._ensureCarAudio();return;}
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a)return;

    // No bloqueamos el motor por state=suspended: pedimos resume y dejamos
    // los granos programados. El siguiente toque de acelerador también reanuda.
    if(ctx.state!=='running'){
      try{ctx.resume();}catch{}
    }

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

    // Pedal anticipa; velocidad mantiene las RPM. Al soltar, rev01 cae suavemente.
    const targetRev=clamp(speed01*.86+throttle*.24,0,1);
    const revTau=targetRev>this._carAudioRev01?.18:.52;
    const revAlpha=1-Math.exp(-dt/revTau);
    this._carAudioRev01+=(targetRev-this._carAudioRev01)*revAlpha;
    const rev01=clamp(this._carAudioRev01,0,1);

    // Avanza al acelerar y retrocede al levantar, usando siempre microfragmentos
    // reproducidos hacia delante para evitar el efecto de audio invertido literal.
    const targetPos=DYNO_START+(DYNO_LIMIT-DYNO_START)*rev01;
    const posTau=targetPos>this._carAudioDynoPos?.15:.40;
    const posAlpha=1-Math.exp(-dt/posTau);
    this._carAudioDynoPos+=(targetPos-this._carAudioDynoPos)*posAlpha;
    this._carAudioDynoPos=clamp(this._carAudioDynoPos,DYNO_START,DYNO_LIMIT);

    if(now-this._carAudioLastGrainAt>=.095){
      this._carAudioLastGrainAt=now;
      const rate=.98+rev01*.37;
      const volume=(.54+.24*throttle+.08*rev01)*p.engine;
      this._spawnDynoGrain(this._carAudioDynoPos,rate,volume);
    }

    a.engineFilter.frequency.setTargetAtTime(2400+rev01*3300+throttle*400,now,.10);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.95:.58,now,.08);
    a.master.gain.setTargetAtTime(p.mute?0:p.master*.92,now,.04);
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
    try{this._carAudioCtx?.close?.();}catch{}
    this._carAudio=null;
    this._carAudioCtx=null;
    this._carAudioReady=false;
    this._carAudioLoading=false;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._carAudioAccum+=Number(delta||0);
    if(this._carAudioAccum>=33){
      const dt=this._carAudioAccum;
      this._carAudioAccum=0;
      this._updateCarAudio(dt);
    }
    return result;
  }
}

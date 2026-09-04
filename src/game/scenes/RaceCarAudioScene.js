import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SETTINGS_KEY='tdr2:settings';
const DYNO_FILE=`${BASE}assets/audio/cars/veloce_flash/engine/freesound_community-import-car-revs-on-chassis-dyno-with-turbo-66272.mp3`;
const DYNO_START=.18;
const DYNO_LIMIT=24.0;
const MAX_AUDIO_GEAR=5;

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

async function fetchAudioBytes(url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error(`audio ${res.status}: ${url}`);
  return res.arrayBuffer();
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._carAudioReady=false;
    this._carAudioLoading=false;
    this._carAudioDestroyed=false;
    this._carAudioAccum=0;
    this._carAudioSpeed01=0;
    this._carAudioRev01=.10;
    this._carAudioDynoPos=DYNO_START;
    this._carAudioLastGrainAt=-99;
    this._carAudioCtx=null;
    this._carAudioRawPromise=null;
    this._carAudioKeeper=null;
    this._carAudioGear=1;
    this._carAudioShiftHold=0;

    // Descarga anticipada; el AudioContext se crea sólo dentro de un gesto real.
    this._preloadCarAudioRaw();
    this._carAudioUnlock=()=>this._unlockCarAudioFromGesture();
    const opts={passive:true,capture:true};
    window.addEventListener('pointerdown',this._carAudioUnlock,opts);
    window.addEventListener('pointerup',this._carAudioUnlock,opts);
    window.addEventListener('touchstart',this._carAudioUnlock,opts);
    window.addEventListener('touchend',this._carAudioUnlock,opts);
    window.addEventListener('click',this._carAudioUnlock,opts);
    window.addEventListener('keydown',this._carAudioUnlock,opts);

    this.events.once('shutdown',()=>this._destroyCarAudio());
    this.events.once('destroy',()=>this._destroyCarAudio());
    return result;
  }

  _preloadCarAudioRaw(){
    if(this._carAudioRawPromise)return this._carAudioRawPromise;
    this._carAudioRawPromise=fetchAudioBytes(DYNO_FILE).catch(err=>{
      this._carAudioRawPromise=null;
      console.warn('[TDR2 car audio] dyno preload failed',err);
      throw err;
    });
    return this._carAudioRawPromise;
  }

  _startSilentKeeper(ctx){
    if(this._carAudioKeeper||!ctx)return;
    try{
      // iOS puede volver a suspender un contexto creado al tocar si no queda
      // ninguna fuente viva mientras decodeAudioData termina. Este source
      // silencioso permanece activo y mantiene abierta la sesión de audio.
      const b=ctx.createBuffer(1,2205,22050);
      const s=ctx.createBufferSource();
      const g=ctx.createGain();
      g.gain.value=0;
      s.buffer=b;s.loop=true;s.connect(g).connect(ctx.destination);s.start(0);
      this._carAudioKeeper={source:s,gain:g};
    }catch{}
  }

  _unlockCarAudioFromGesture(){
    if(this._carAudioDestroyed)return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try{
      if(!this._carAudioCtx)this._carAudioCtx=new AC();
      const ctx=this._carAudioCtx;
      try{if(ctx.state!=='running')ctx.resume();}catch{}
      this._startSilentKeeper(ctx);
      this._ensureCarAudio();
    }catch(err){
      console.warn('[TDR2 car audio] gesture unlock failed',err);
    }
  }

  _makeSkidNoise(ctx,master){
    try{
      const sr=Math.max(22050,Number(ctx.sampleRate)||44100);
      const buf=ctx.createBuffer(1,Math.floor(sr*1.25),sr);
      const d=buf.getChannelData(0);
      let prev=0;
      for(let i=0;i<d.length;i++){
        const white=Math.random()*2-1;
        prev=prev*.58+white*.42;
        d[i]=prev;
      }
      const src=ctx.createBufferSource();
      const hp=ctx.createBiquadFilter();
      const bp=ctx.createBiquadFilter();
      const gain=ctx.createGain();
      src.buffer=buf;src.loop=true;
      hp.type='highpass';hp.frequency.value=480;
      bp.type='bandpass';bp.frequency.value=1650;bp.Q.value=.72;
      gain.gain.value=0;
      src.connect(hp).connect(bp).connect(gain).connect(master);
      src.start(0);
      return {source:src,gain,band:bp};
    }catch{return null;}
  }

  async _ensureCarAudio(){
    if(this._carAudioReady){
      try{if(this._carAudioCtx?.state!=='running')await this._carAudioCtx.resume();}catch{}
      return;
    }
    if(this._carAudioLoading)return;
    const ctx=this._carAudioCtx;
    if(!ctx)return;
    this._carAudioLoading=true;
    try{
      const raw=await this._preloadCarAudioRaw();
      const dynoBuffer=await ctx.decodeAudioData(raw.slice(0));
      if(this._carAudioDestroyed)return;
      try{if(ctx.state!=='running')await ctx.resume();}catch{}
      this._startSilentKeeper(ctx);

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

      const skid=this._makeSkidNoise(ctx,master);
      this._carAudio={master,engineBus,engineFilter,dynoBuffer,grains:new Set(),skid};
      this._carAudioReady=true;
      this._carAudioLoading=false;
      this._updateCarAudio(16.7,true);
      console.info('[TDR2 car audio] Veloce dyno ready',dynoBuffer.duration,ctx.state,'gesture-context');
    }catch(err){
      this._carAudioLoading=false;
      console.warn('[TDR2 car audio] dyno engine init failed',err);
    }
  }

  _spawnDynoGrain(offset,rate,volume){
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a?.dynoBuffer||ctx.state!=='running')return;
    const now=ctx.currentTime;
    const safeOffset=clamp(offset,DYNO_START,Math.min(DYNO_LIMIT,a.dynoBuffer.duration-.5));
    try{
      const src=ctx.createBufferSource();
      const gain=ctx.createGain();
      src.buffer=a.dynoBuffer;
      src.playbackRate.value=clamp(rate,.82,1.35);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(volume,now+.055);
      gain.gain.setValueAtTime(volume,now+.235);
      gain.gain.linearRampToValueAtTime(0,now+.37);
      src.connect(gain).connect(a.engineBus);
      src.start(now,safeOffset);
      src.stop(now+.40);
      a.grains.add(src);
      src.onended=()=>a.grains.delete(src);
    }catch{}
  }

  _updateVirtualGearbox(dt,throttle,speed01){
    let rev=this._carAudioRev01;
    let gear=Math.max(1,Math.min(MAX_AUDIO_GEAR,Number(this._carAudioGear)||1));
    let hold=Math.max(0,Number(this._carAudioShiftHold)||0);

    if(hold>0){
      hold=Math.max(0,hold-dt);
      rev+=(0.34-rev)*Math.min(1,dt*12);
    }else if(throttle>.08){
      if(gear<MAX_AUDIO_GEAR){
        const rise=(.70-.055*(gear-1))*(.55+.45*throttle);
        rev+=rise*dt;
        if(rev>=.91){
          gear+=1;
          rev=.34+.025*gear;
          hold=.075;
        }
      }else{
        const target=.84+.10*throttle;
        rev+=(target-rev)*(1-Math.exp(-dt/.32));
      }
      rev=Math.max(rev,.12+speed01*.12);
    }else{
      const idleTarget=.055+speed01*.13;
      // Caída más pausada: el pitch baja antes que el punto de lectura y evita
      // la sensación de reproducir una aceleración "hacia atrás".
      rev+=(idleTarget-rev)*(1-Math.exp(-dt/.55));
      if(speed01<.035&&rev<.11)gear=1;
    }

    this._carAudioGear=gear;
    this._carAudioShiftHold=hold;
    this._carAudioRev01=clamp(rev,.025,1);
    return this._carAudioRev01;
  }

  _updateCarAudio(delta,force=false){
    if(!this._carAudioReady){if(force)this._ensureCarAudio();return;}
    const ctx=this._carAudioCtx,a=this._carAudio;
    if(!ctx||!a)return;
    if(ctx.state!=='running'){
      try{ctx.resume();}catch{}
      return;
    }

    const now=ctx.currentTime,p=audioPrefs();
    const vel=this.carBody?.body?.velocity;
    const speed=Math.hypot(Number(vel?.x||0),Number(vel?.y||0));
    const maxFwd=Math.max(160,Number(this.carParams?.maxFwd||this.maxFwd||520));
    const rawSpeed01=clamp(speed/maxFwd,0,1);
    const dt=Math.max(.001,Number(delta||33.3)/1000);

    const speedAlpha=1-Math.exp(-dt/.18);
    this._carAudioSpeed01+=(rawSpeed01-this._carAudioSpeed01)*speedAlpha;
    const speed01=clamp(this._carAudioSpeed01,0,1);
    const throttle=clamp(Number(this.touch?.throttle??this._throttle??0),0,1);
    const brake=clamp(Number(this.touch?.brake??this._brake??0),0,1);
    const handbrake=!!this._tdrHandbrake;
    const rev01=this._updateVirtualGearbox(dt,throttle,speed01);

    let targetPos=DYNO_START+(DYNO_LIMIT-DYNO_START)*rev01;
    const rising=targetPos>this._carAudioDynoPos;
    // En desaceleración movemos la ventana mucho más despacio y dejamos que el
    // playbackRate haga la mayor parte de la bajada de tono.
    const posTau=rising?.16:.82;
    const posAlpha=1-Math.exp(-dt/posTau);
    this._carAudioDynoPos+=(targetPos-this._carAudioDynoPos)*posAlpha;
    this._carAudioDynoPos=clamp(this._carAudioDynoPos,DYNO_START,DYNO_LIMIT);

    if(now-this._carAudioLastGrainAt>=.088){
      this._carAudioLastGrainAt=now;
      const lift=throttle<=.08;
      const rate=lift ? (.83+rev01*.34) : (.96+rev01*.39);
      const volume=(.50+.25*throttle+.09*rev01)*p.engine;
      this._spawnDynoGrain(this._carAudioDynoPos,rate,volume);
    }

    a.engineFilter.frequency.setTargetAtTime(2200+rev01*3500+throttle*450,now,.10);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.95:.58,now,.08);

    // Chirrido de neumático ligado a frenada fuerte/handbrake y velocidad.
    // No suena parado ni con una pulsación ligera.
    if(a.skid?.gain){
      const brakeDemand=Math.max(brake,handbrake?1:0);
      const speedGate=clamp((speed01-.10)/.34,0,1);
      const skidLevel=clamp((brakeDemand-.28)/.72,0,1)*speedGate*p.engine*.38;
      a.skid.gain.gain.setTargetAtTime(skidLevel,now,skidLevel>0?.035:.12);
      a.skid.band?.frequency?.setTargetAtTime?.(1250+speed01*1450,now,.07);
    }

    a.master.gain.setTargetAtTime(p.mute?0:p.master*.92,now,.04);
  }

  _destroyCarAudio(){
    if(this._carAudioDestroyed)return;
    this._carAudioDestroyed=true;
    if(this._carAudioUnlock){
      window.removeEventListener('pointerdown',this._carAudioUnlock,true);
      window.removeEventListener('pointerup',this._carAudioUnlock,true);
      window.removeEventListener('touchstart',this._carAudioUnlock,true);
      window.removeEventListener('touchend',this._carAudioUnlock,true);
      window.removeEventListener('click',this._carAudioUnlock,true);
      window.removeEventListener('keydown',this._carAudioUnlock,true);
    }
    try{for(const src of this._carAudio?.grains||[])src?.stop?.();}catch{}
    try{this._carAudio?.skid?.source?.stop?.();}catch{}
    try{this._carAudioKeeper?.source?.stop?.();}catch{}
    try{this._carAudioCtx?.close?.();}catch{}
    this._carAudio=null;
    this._carAudioKeeper=null;
    this._carAudioCtx=null;
    this._carAudioReady=false;
    this._carAudioLoading=false;
    this._carAudioRawPromise=null;
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

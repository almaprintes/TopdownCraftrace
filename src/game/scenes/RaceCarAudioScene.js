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
      effects:clamp(Number(a.effects??.55),0,1),
      mute:!!a.mute
    };
  }catch{return{master:1,engine:1,effects:.55,mute:false};}
}

async function decodeUrl(ctx,url){
  const res=await fetch(url,{cache:'force-cache'});
  if(!res.ok)throw new Error(`audio ${res.status}: ${url}`);
  return ctx.decodeAudioData(await res.arrayBuffer());
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._carAudioReady=false;
    this._carAudioLoading=false;
    this._carAudioPrevThrottle=0;
    this._carAudioGear=1;
    this._carAudioPrefs=audioPrefs();
    this._carAudioAccum=0;
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
        decodeUrl(ctx,SHIFT_FILE),
        decodeUrl(ctx,TURBO_FILE),
        decodeUrl(ctx,FLUTTER_FILE)
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
        const src=ctx.createBufferSource();
        const gain=ctx.createGain();
        src.buffer=buffer;src.loop=true;gain.gain.value=0;
        src.connect(gain).connect(engineBus);src.start();
        return{src,gain,i};
      });

      const turboSrc=ctx.createBufferSource();
      const turboGain=ctx.createGain();
      const turboFilter=ctx.createBiquadFilter();
      turboSrc.buffer=turboBuffer;turboSrc.loop=true;turboGain.gain.value=0;
      turboFilter.type='highpass';turboFilter.frequency.value=900;
      turboSrc.connect(turboFilter).connect(turboGain).connect(master);turboSrc.start();

      this._carAudio={master,engineBus,engineFilter,layers,shiftBuffer,flutterBuffer,turboSrc,turboGain};
      this._carAudioReady=true;
      this._carAudioLoading=false;
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
    const now=ctx.currentTime,p=this._carAudioPrefs||audioPrefs();
    const vel=this.carBody?.body?.velocity;
    const speed=Math.hypot(Number(vel?.x||0),Number(vel?.y||0));
    const maxFwd=Math.max(160,Number(this.carParams?.maxFwd||this.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);
    const throttle=clamp(Number(this.touch?.throttle??this._throttle??0),0,1);

    // Six recorded engine bands. Adjacent loops crossfade rather than jumping.
    const band=speed01*5;
    for(const layer of a.layers){
      const weight=clamp(1-Math.abs(layer.i-band),0,1);
      const idleBoost=layer.i===0?clamp(1-speed01*3,0,1)*.38:0;
      const target=(weight+idleBoost)*(.36+.64*throttle)*p.engine;
      layer.gain.gain.setTargetAtTime(target,now,.055);
      const local=clamp(band-layer.i,-.9,.9);
      layer.src.playbackRate.setTargetAtTime(1+local*.07+throttle*.015,now,.08);
    }

    a.engineFilter.frequency.setTargetAtTime(1500+speed01*3000+throttle*900,now,.08);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.88:.35,now,.06);
    a.master.gain.setTargetAtTime(p.mute?0:p.master*.78,now,.05);

    // Simple six-speed gearbox for audible RPM drops and a mechanical shift cue.
    const gear=clamp(Math.floor(speed01*6)+1,1,6);
    if(gear!==this._carAudioGear&&speed>45){
      this._carAudioGear=gear;
      this._playCarOneShot(a.shiftBuffer,.24*p.effects,.96+gear*.015);
      for(const layer of a.layers){
        const current=layer.gain.gain.value;
        layer.gain.gain.cancelScheduledValues(now);
        layer.gain.gain.setValueAtTime(Math.max(.0001,current),now);
        layer.gain.gain.linearRampToValueAtTime(Math.max(.0001,current*.52),now+.035);
      }
    }

    const turboTarget=Math.pow(speed01,1.45)*throttle*.20*p.effects;
    a.turboGain.gain.setTargetAtTime(turboTarget,now,.08);
    a.turboSrc.playbackRate.setTargetAtTime(.92+speed01*.28,now,.1);

    // Flutter when the driver lifts after meaningful boost.
    if(this._carAudioPrevThrottle>.72&&throttle<.22&&speed01>.36){
      this._playCarOneShot(a.flutterBuffer,.30*p.effects,.94+speed01*.10);
    }
    this._carAudioPrevThrottle=throttle;
  }

  _destroyCarAudio(){
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
    if(this._carAudioAccum>=33){
      const dt=this._carAudioAccum;this._carAudioAccum=0;this._updateCarAudio(dt);
    }
    return result;
  }
}

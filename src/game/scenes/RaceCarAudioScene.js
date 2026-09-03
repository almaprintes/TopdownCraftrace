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
    this._carAudioThrottle=0;
    this._carAudioRpm01=.02;
    this._carAudioLastShiftAt=-Infinity;
    this._carAudioLastFlutterAt=-Infinity;
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

      // All engine loops run continuously. We never restart a loop while driving;
      // RPM is represented only by smooth crossfades between neighbouring samples.
      const layers=engineBuffers.map((buffer,i)=>{
        const src=ctx.createBufferSource(),gain=ctx.createGain();
        src.buffer=buffer;src.loop=true;src.playbackRate.value=1;gain.gain.value=0;
        src.connect(gain).connect(engineBus);src.start(0);
        return{src,gain,i};
      });

      const turboSrc=ctx.createBufferSource(),turboGain=ctx.createGain(),turboFilter=ctx.createBiquadFilter();
      turboSrc.buffer=turboBuffer;turboSrc.loop=true;turboSrc.playbackRate.value=1;turboGain.gain.value=0;
      turboFilter.type='highpass';turboFilter.frequency.value=900;
      turboSrc.connect(turboFilter).connect(turboGain).connect(master);turboSrc.start(0);

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

  _resolveGear(speed01,nowMs){
    // Hysteresis prevents a gear from flickering back and forth at a boundary.
    // Ratios are deliberately broad: sound should follow driving, not speed jitter.
    const up=[0,.18,.34,.51,.69,.86,1.01];
    const down=[0,.12,.27,.43,.60,.77,.93];
    let gear=this._carAudioGear||1;
    if(gear<6&&speed01>up[gear])gear++;
    else if(gear>1&&speed01<down[gear-1])gear--;

    if(gear!==this._carAudioGear&&nowMs-this._carAudioLastShiftAt>320){
      this._carAudioGear=gear;
      this._carAudioLastShiftAt=nowMs;
      return true;
    }
    return false;
  }

  _rpmForGear(speed01,gear,throttle){
    const lows=[0,.00,.14,.30,.47,.65,.82];
    const highs=[0,.22,.39,.56,.73,.90,1.02];
    const lo=lows[gear],hi=highs[gear];
    const inGear=clamp((speed01-lo)/Math.max(.001,hi-lo),0,1);
    // Idle remains clearly audible; throttle adds only a small believable flare.
    return clamp(.055+inGear*.82+throttle*.07,0,1);
  }

  _updateCarAudio(delta,force=false){
    if(!this._carAudioReady){if(force)this._ensureCarAudio();return;}
    const ctx=this._carAudioCtx,a=this._carAudio;if(!ctx||!a)return;
    const now=ctx.currentTime,nowMs=performance.now(),p=audioPrefs();
    const vel=this.carBody?.body?.velocity;
    const speed=Math.hypot(Number(vel?.x||0),Number(vel?.y||0));
    const maxFwd=Math.max(160,Number(this.carParams?.maxFwd||this.maxFwd||520));
    const rawSpeed01=clamp(speed/maxFwd,0,1.03);
    const rawThrottle=clamp(Number(this.touch?.throttle??this._throttle??0),0,1);

    // Smooth the noisy physics/input values before they are allowed to touch sound.
    const dt=Math.max(.001,Number(delta||33.3)/1000);
    const speedAlpha=1-Math.exp(-dt/0.11);
    const throttleAlpha=1-Math.exp(-dt/0.075);
    this._carAudioSpeed01+=(rawSpeed01-this._carAudioSpeed01)*speedAlpha;
    this._carAudioThrottle+=(rawThrottle-this._carAudioThrottle)*throttleAlpha;
    const speed01=this._carAudioSpeed01;
    const throttle=this._carAudioThrottle;

    const shifted=this._resolveGear(speed01,nowMs);
    const targetRpm=this._rpmForGear(speed01,this._carAudioGear,throttle);
    const rpmAlpha=1-Math.exp(-dt/0.095);
    this._carAudioRpm01+=(targetRpm-this._carAudioRpm01)*rpmAlpha;
    const rpm01=clamp(this._carAudioRpm01,0,1);

    // Six fixed-RPM recordings. Only two adjacent layers can be audible at once.
    const band=rpm01*5;
    const lower=Math.floor(band);
    const upper=Math.min(5,lower+1);
    const mix=band-lower;
    for(const layer of a.layers){
      let weight=0;
      if(layer.i===lower)weight=1-mix;
      if(layer.i===upper)weight+=mix;
      // Equal-power-ish crossfade and a stable idle floor.
      weight=Math.sqrt(clamp(weight,0,1));
      if(layer.i===0&&speed01<.025)weight=Math.max(weight,.88);
      const target=weight*(.60+.18*throttle)*p.engine;
      layer.gain.gain.setTargetAtTime(target,now,.085);
      layer.src.playbackRate.setTargetAtTime(1,now,.08);
    }

    // Tone follows RPM smoothly, never individual physics frames.
    a.engineFilter.frequency.setTargetAtTime(1750+rpm01*2700+throttle*350,now,.11);
    a.engineBus.gain.setTargetAtTime(this._raceStarted?.78:.38,now,.08);
    a.master.gain.setTargetAtTime(p.mute?0:p.master*.82,now,.06);

    if(shifted&&speed>45){
      this._playCarOneShot(a.shiftBuffer,.18*p.effects,1);
      // One short, global torque cut. Do not mutilate individual sample gains.
      a.engineBus.gain.cancelScheduledValues(now);
      a.engineBus.gain.setValueAtTime(Math.max(.05,a.engineBus.gain.value),now);
      a.engineBus.gain.linearRampToValueAtTime(.50,now+.045);
      a.engineBus.gain.linearRampToValueAtTime(.78,now+.15);
    }

    // Turbo is a subtle continuous layer only while genuinely on boost.
    const boost=clamp((rpm01-.42)/.58,0,1)*clamp((throttle-.38)/.62,0,1);
    a.turboGain.gain.setTargetAtTime(boost*.13*p.effects,now,.13);
    a.turboSrc.playbackRate.setTargetAtTime(1,now,.12);

    // Flutter requires a real lift after boost and has a hard cooldown.
    const hardLift=this._carAudioPrevThrottle>.72&&rawThrottle<.16;
    if(hardLift&&rpm01>.48&&nowMs-this._carAudioLastFlutterAt>700){
      this._carAudioLastFlutterAt=nowMs;
      this._playCarOneShot(a.flutterBuffer,.24*p.effects,1);
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

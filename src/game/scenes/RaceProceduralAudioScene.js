import { RaceScene as CurrentRaceScene } from './RaceGamepadScene.js';

const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function isIOSDevice(){try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||((navigator.platform==='MacIntel')&&navigator.maxTouchPoints>1);}catch{return false;}}

function audioPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    const a=s?.audio||{};
    return {
      master:clamp(Number(a.master ?? 1),0,1),
      engine:clamp(Number(a.engine ?? 1),0,1),
      effects:clamp(Number(a.effects ?? .45),0,1),
      impacts:clamp(Number(a.impacts ?? .8),0,1),
      profile:String(a.profile||'per_car'),
      mute:!!a.mute
    };
  }catch{return {master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false};}
}

function hash01(text='car'){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
}

const APPROVED_PROFILES=['forge_hammer','avenir_apex','crown_axis'];
function profileSeed(carId,profile){
  const forced={forge:'forge_hammer',avenir:'avenir_apex',crown:'crown_axis'}[profile];
  if(forced)return hash01(forced);
  if(APPROVED_PROFILES.includes(carId))return hash01(carId);
  const idx=Math.min(2,Math.floor(hash01(carId)*3));
  return hash01(APPROVED_PROFILES[idx]);
}

function makeNoiseBuffer(ctx,seconds=2){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let last=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    last=last*.72+white*.28;
    d[i]=last;
  }
  return b;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._audioPrevSpeed=0;
    this._audioGear=1;
    this._audioShiftUntil=0;
    this._audioLastImpactAt=0;
    this._audioReady=false;
    this._audioPrefs=audioPrefs();
    this._audioUpdateAccum=0;
    this._iosAudioDisabled=isIOSDevice();
    if(this._iosAudioDisabled)return result;
    this._audioUnlock=()=>this._ensureProceduralAudio();
    window.addEventListener('pointerdown',this._audioUnlock,{passive:true});
    window.addEventListener('touchstart',this._audioUnlock,{passive:true});
    window.addEventListener('keydown',this._audioUnlock,{passive:true});
    this._ensureProceduralAudio();
    this.events.once('shutdown',()=>this._destroyProceduralAudio());
    return result;
  }

  _ensureProceduralAudio(){
    if(this._iosAudioDisabled)return;
    if(this._audioReady){
      try{if(this._audioCtx?.state==='suspended')this._audioCtx.resume();}catch{}
      return;
    }
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try{
      const ctx=new AC();
      const master=ctx.createGain();
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-10;limiter.knee.value=16;limiter.ratio.value=4;limiter.attack.value=.009;limiter.release.value=.24;
      master.connect(limiter).connect(ctx.destination);

      const engineBus=ctx.createGain();engineBus.gain.value=0;
      const engineFilter=ctx.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=1050;engineFilter.Q.value=.45;
      engineBus.connect(engineFilter).connect(master);

      const id=String(this.carId||'car');
      const prefs=this._audioPrefs||audioPrefs();
      const seed=profileSeed(id,prefs.profile);
      const osc1=ctx.createOscillator(),osc2=ctx.createOscillator(),osc3=ctx.createOscillator();
      osc1.type=seed>.66?'sawtooth':seed>.33?'square':'triangle';
      osc2.type='triangle';osc3.type='sine';
      const g1=ctx.createGain(),g2=ctx.createGain(),g3=ctx.createGain();
      g1.gain.value=.46;g2.gain.value=.15;g3.gain.value=.065;
      osc1.connect(g1).connect(engineBus);osc2.connect(g2).connect(engineBus);osc3.connect(g3).connect(engineBus);
      osc1.start();osc2.start();osc3.start();

      const noiseBuffer=makeNoiseBuffer(ctx);
      const wind=ctx.createBufferSource();wind.buffer=noiseBuffer;wind.loop=true;
      const windFilter=ctx.createBiquadFilter();windFilter.type='highpass';windFilter.frequency.value=900;
      const windGain=ctx.createGain();windGain.gain.value=0;
      wind.connect(windFilter).connect(windGain).connect(master);wind.start();

      this._audio={master,engineBus,engineFilter,osc1,osc2,osc3,windFilter,windGain,wind,seed};
      this._audioCtx=ctx;this._audioReady=true;
      try{ctx.resume();}catch{}
    }catch(e){console.warn('[TDR2 audio] init failed',e);}
  }

  _impactSound(strength,impactVolume=1){
    if(this._iosAudioDisabled)return;
    const ctx=this._audioCtx,a=this._audio;
    if(!ctx||!a||ctx.state!=='running'||impactVolume<=.001)return;
    const now=ctx.currentTime;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    osc.type='triangle';osc.frequency.setValueAtTime(90+strength*80,now);osc.frequency.exponentialRampToValueAtTime(42,now+.12);
    filter.type='lowpass';filter.frequency.value=520;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime((.10*strength+.015)*impactVolume,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
    osc.connect(filter).connect(gain).connect(a.master);osc.start(now);osc.stop(now+.2);
  }

  _updateProceduralAudio(delta){
    if(this._iosAudioDisabled)return;
    if(!this._audioReady){this._ensureProceduralAudio();return;}
    const ctx=this._audioCtx,a=this._audio;if(!ctx||!a)return;
    const prefs=this._audioPrefs||{master:1,engine:1,effects:.45,impacts:.8,mute:false};
    const now=ctx.currentTime;
    const perfNow=performance.now();
    const body=this.carBody?.body;
    const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
    const speed=Math.hypot(vx,vy);
    const maxFwd=Math.max(120,Number(this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1.15);
    const throttle=clamp(Number(this.touch?.throttle||0),0,1);

    const shiftPoint=.52;
    const gear=speed01<shiftPoint?1:2;
    if(gear!==this._audioGear&&speed>35){this._audioGear=gear;this._audioShiftUntil=perfNow+175;}
    const inGear=gear===1?clamp(speed01/shiftPoint,0,1):clamp((speed01-shiftPoint)/(1-shiftPoint),0,1);
    let rpm01=.20+inGear*.66+throttle*.09;
    if(perfNow<this._audioShiftUntil)rpm01*=.64;

    const seed=a.seed;
    const baseHz=42+seed*18;
    const hz=baseHz+rpm01*(101+seed*38);
    a.osc1.frequency.setTargetAtTime(hz,now,.055);
    a.osc2.frequency.setTargetAtTime(hz*2.005,now,.060);
    a.osc3.frequency.setTargetAtTime(hz*(3+seed*.06),now,.065);

    const cruise=clamp(speed01*(1-throttle),0,1);
    const cutoff=500+rpm01*1250+throttle*620-cruise*260;
    a.engineFilter.frequency.setTargetAtTime(clamp(cutoff,480,2050),now,.10);
    const engineLevel=(.018+rpm01*.039+throttle*.034)*(1-cruise*.18)*(this._raceStarted?1:.42)*prefs.engine;
    a.engineBus.gain.setTargetAtTime(engineLevel,now,.075);

    const windLevel=Math.pow(clamp(speed01,0,1),1.65)*.021*prefs.effects;
    a.windFilter.frequency.setTargetAtTime(820+speed01*1450,now,.14);
    a.windGain.gain.setTargetAtTime(windLevel,now,.12);
    a.master.gain.setTargetAtTime(prefs.mute?0:prefs.master*.74,now,.06);

    const dt=Math.max(.001,Number(delta||33.3)/1000);
    const decel=(this._audioPrevSpeed-speed)/dt;
    if(speed>80&&decel>520&&perfNow-this._audioLastImpactAt>180){
      this._audioLastImpactAt=perfNow;
      this._impactSound(clamp((decel-520)/1200,.18,1),prefs.impacts);
    }
    this._audioPrevSpeed=speed;
  }

  _destroyProceduralAudio(){
    if(this._audioUnlock){
      window.removeEventListener('pointerdown',this._audioUnlock);
      window.removeEventListener('touchstart',this._audioUnlock);
      window.removeEventListener('keydown',this._audioUnlock);
    }
    try{this._audio?.wind?.stop?.();}catch{}
    try{this._audio?.osc1?.stop?.();}catch{}
    try{this._audio?.osc2?.stop?.();}catch{}
    try{this._audio?.osc3?.stop?.();}catch{}
    try{this._audioCtx?.close?.();}catch{}
    this._audio=null;this._audioCtx=null;this._audioReady=false;this._audioPrefs=null;
  }

  update(time,delta){
    super.update(time,delta);
    if(this._iosAudioDisabled)return;
    this._audioUpdateAccum+=Number(delta||0);
    if(this._audioUpdateAccum>=33){
      const dt=this._audioUpdateAccum;
      this._audioUpdateAccum=0;
      this._updateProceduralAudio(dt);
    }
  }
}

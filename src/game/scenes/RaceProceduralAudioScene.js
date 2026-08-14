import { RaceScene as CurrentRaceScene } from './RaceGamepadScene.js';

const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function audioPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return {master:clamp(Number(s?.audio?.master ?? 1),0,1),mute:!!s?.audio?.mute};
  }catch{return {master:1,mute:false};}
}

function hash01(text='car'){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
}

function makeNoiseBuffer(ctx,seconds=2){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let last=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    last=last*0.72+white*0.28;
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
    this._audioUnlock=()=>this._ensureProceduralAudio();
    window.addEventListener('pointerdown',this._audioUnlock,{passive:true});
    window.addEventListener('touchstart',this._audioUnlock,{passive:true});
    window.addEventListener('keydown',this._audioUnlock,{passive:true});
    this._ensureProceduralAudio();
    this.events.once('shutdown',()=>this._destroyProceduralAudio());
    return result;
  }

  _ensureProceduralAudio(){
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
      limiter.threshold.value=-9; limiter.knee.value=12; limiter.ratio.value=5; limiter.attack.value=.006; limiter.release.value=.18;
      master.connect(limiter).connect(ctx.destination);

      const engineBus=ctx.createGain(); engineBus.gain.value=0;
      const engineFilter=ctx.createBiquadFilter(); engineFilter.type='lowpass'; engineFilter.frequency.value=1200; engineFilter.Q.value=.55;
      engineBus.connect(engineFilter).connect(master);

      const id=String(this.carId||'car');
      const seed=hash01(id);
      const osc1=ctx.createOscillator();
      const osc2=ctx.createOscillator();
      const osc3=ctx.createOscillator();
      osc1.type=seed>.66?'sawtooth':seed>.33?'square':'triangle';
      osc2.type='triangle'; osc3.type='sine';
      const g1=ctx.createGain(),g2=ctx.createGain(),g3=ctx.createGain();
      g1.gain.value=.52;g2.gain.value=.22;g3.gain.value=.12;
      osc1.connect(g1).connect(engineBus);osc2.connect(g2).connect(engineBus);osc3.connect(g3).connect(engineBus);
      osc1.start();osc2.start();osc3.start();

      // Tyres: a small amount of filtered scrub noise plus two narrow tonal
      // resonances. The resonances are what make lateral slip read as rubber
      // squeal instead of wind/air noise.
      const noise=ctx.createBufferSource();noise.buffer=makeNoiseBuffer(ctx);noise.loop=true;
      const tireScrubFilter=ctx.createBiquadFilter();tireScrubFilter.type='bandpass';tireScrubFilter.frequency.value=1650;tireScrubFilter.Q.value=3.2;
      const tireScrubGain=ctx.createGain();tireScrubGain.gain.value=0;
      noise.connect(tireScrubFilter).connect(tireScrubGain).connect(master);noise.start();

      const tireSqueal1=ctx.createOscillator();
      const tireSqueal2=ctx.createOscillator();
      tireSqueal1.type='sine';
      tireSqueal2.type='triangle';
      const tireToneFilter=ctx.createBiquadFilter();tireToneFilter.type='bandpass';tireToneFilter.frequency.value=2100;tireToneFilter.Q.value=8.5;
      const tireToneGain=ctx.createGain();tireToneGain.gain.value=0;
      const tireTone1Gain=ctx.createGain();tireTone1Gain.gain.value=.72;
      const tireTone2Gain=ctx.createGain();tireTone2Gain.gain.value=.28;
      tireSqueal1.connect(tireTone1Gain).connect(tireToneFilter);
      tireSqueal2.connect(tireTone2Gain).connect(tireToneFilter);
      tireToneFilter.connect(tireToneGain).connect(master);
      tireSqueal1.start();tireSqueal2.start();

      const wind=ctx.createBufferSource();wind.buffer=noise.buffer;wind.loop=true;
      const windFilter=ctx.createBiquadFilter();windFilter.type='highpass';windFilter.frequency.value=900;
      const windGain=ctx.createGain();windGain.gain.value=0;
      wind.connect(windFilter).connect(windGain).connect(master);wind.start();

      this._audio={master,engineBus,engineFilter,osc1,osc2,osc3,
        tireScrubFilter,tireScrubGain,tireSqueal1,tireSqueal2,tireToneFilter,tireToneGain,
        windFilter,windGain,noise,wind,seed};
      this._audioCtx=ctx;this._audioReady=true;
      try{ctx.resume();}catch{}
    }catch(e){console.warn('[TDR2 audio] init failed',e);}
  }

  _impactSound(strength){
    const ctx=this._audioCtx,a=this._audio;
    if(!ctx||!a||ctx.state!=='running')return;
    const now=ctx.currentTime;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    osc.type='triangle';osc.frequency.setValueAtTime(90+strength*80,now);osc.frequency.exponentialRampToValueAtTime(42,now+.12);
    filter.type='lowpass';filter.frequency.value=520;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.10*strength+.015,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);
    osc.connect(filter).connect(gain).connect(a.master);osc.start(now);osc.stop(now+.2);
  }

  _updateProceduralAudio(delta){
    if(!this._audioReady){this._ensureProceduralAudio();return;}
    const ctx=this._audioCtx,a=this._audio;if(!ctx||!a)return;
    const prefs=audioPrefs();
    const now=ctx.currentTime;
    const body=this.carBody?.body;
    const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
    const speed=Math.hypot(vx,vy);
    const maxFwd=Math.max(120,Number(this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1.15);
    const throttle=clamp(Number(this.touch?.throttle||0),0,1);
    const brake=clamp(Number(this.touch?.brake||0),0,1);

    // Two acoustic gears only. First gear runs through the lower half of the
    // useful speed range; second gear carries the car to maximum speed.
    const shiftPoint=.52;
    const gear=speed01<shiftPoint?1:2;
    if(gear!==this._audioGear && speed>35){
      this._audioGear=gear;
      this._audioShiftUntil=performance.now()+155;
    }
    const inGear=gear===1
      ? clamp(speed01/shiftPoint,0,1)
      : clamp((speed01-shiftPoint)/(1-shiftPoint),0,1);
    let rpm01=.22+inGear*.70+throttle*.10;
    if(performance.now()<this._audioShiftUntil)rpm01*=.66;

    const seed=a.seed;
    const baseHz=42+seed*18;
    const hz=baseHz+rpm01*(105+seed*42);
    const tc=.035;
    a.osc1.frequency.setTargetAtTime(hz,now,tc);
    a.osc2.frequency.setTargetAtTime(hz*2.01,now,tc);
    a.osc3.frequency.setTargetAtTime(hz*(3.0+seed*.08),now,tc);
    a.engineFilter.frequency.setTargetAtTime(520+rpm01*1850+throttle*900,now,.06);
    const engineLevel=(.025+rpm01*.055+throttle*.045)*(this._raceStarted?1:.45);
    a.engineBus.gain.setTargetAtTime(engineLevel,now,.045);

    // Slip = velocity not aligned with the nose.
    const rot=Number(this.carBody?.rotation||0),fx=Math.cos(rot),fy=Math.sin(rot);
    const forward=vx*fx+vy*fy;
    const lateral=Math.abs(-vx*fy+vy*fx);
    const slip=clamp(lateral/Math.max(28,Math.abs(forward)),0,1);
    const speedForTyres=clamp(speed/170,0,1);
    const cornerSqueal=clamp((slip-.075)*1.9,0,1)*speedForTyres;
    const brakeSqueal=brake*clamp((speed-55)/210,0,1)*.72;
    const squeal=clamp(Math.max(cornerSqueal,brakeSqueal),0,1);

    // Narrow, slightly moving harmonics imitate rubber resonance. Noise is kept
    // low and only adds texture, so the dominant perception is a chirp/squeal.
    const squealHz=1450+squeal*1250+Math.sin(performance.now()*.018)*55;
    a.tireSqueal1.frequency.setTargetAtTime(squealHz,now,.025);
    a.tireSqueal2.frequency.setTargetAtTime(squealHz*1.47,now,.03);
    a.tireToneFilter.frequency.setTargetAtTime(squealHz*1.08,now,.035);
    a.tireToneGain.gain.setTargetAtTime(Math.pow(squeal,1.15)*.075,now,.022);

    a.tireScrubFilter.frequency.setTargetAtTime(1250+squeal*1150,now,.045);
    a.tireScrubGain.gain.setTargetAtTime(Math.pow(squeal,1.4)*.018,now,.028);

    const windLevel=Math.pow(clamp(speed01,0,1),1.7)*.028;
    a.windFilter.frequency.setTargetAtTime(850+speed01*1700,now,.12);
    a.windGain.gain.setTargetAtTime(windLevel,now,.09);

    const master=prefs.mute?0:prefs.master*.78;
    a.master.gain.setTargetAtTime(master,now,.04);

    const dt=Math.max(.001,Number(delta||16.7)/1000);
    const decel=(this._audioPrevSpeed-speed)/dt;
    if(speed>80 && decel>520 && performance.now()-this._audioLastImpactAt>180){
      this._audioLastImpactAt=performance.now();
      this._impactSound(clamp((decel-520)/1200,.18,1));
    }
    this._audioPrevSpeed=speed;
  }

  _destroyProceduralAudio(){
    window.removeEventListener('pointerdown',this._audioUnlock);
    window.removeEventListener('touchstart',this._audioUnlock);
    window.removeEventListener('keydown',this._audioUnlock);
    try{this._audio?.noise?.stop?.();}catch{}
    try{this._audio?.wind?.stop?.();}catch{}
    try{this._audio?.osc1?.stop?.();}catch{}
    try{this._audio?.osc2?.stop?.();}catch{}
    try{this._audio?.osc3?.stop?.();}catch{}
    try{this._audio?.tireSqueal1?.stop?.();}catch{}
    try{this._audio?.tireSqueal2?.stop?.();}catch{}
    try{this._audioCtx?.close?.();}catch{}
    this._audio=null;this._audioCtx=null;this._audioReady=false;
  }

  update(time,delta){
    super.update(time,delta);
    this._updateProceduralAudio(delta);
  }
}

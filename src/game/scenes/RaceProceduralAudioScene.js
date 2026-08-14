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

      // Keep only a subtle aerodynamic layer. Tyre/slip synthesis was removed
      // deliberately: the engine is the core sonic identity and must stay clean.
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

    // Two acoustic gears only.
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

    // No lateral-slip or braking tyre sound. Deliberately silent until we have
    // an effect that improves immersion instead of calling attention to itself.

    const windLevel=Math.pow(clamp(speed01,0,1),1.7)*.018;
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
    try{this._audio?.wind?.stop?.();}catch{}
    try{this._audio?.osc1?.stop?.();}catch{}
    try{this._audio?.osc2?.stop?.();}catch{}
    try{this._audio?.osc3?.stop?.();}catch{}
    try{this._audioCtx?.close?.();}catch{}
    this._audio=null;this._audioCtx=null;this._audioReady=false;
  }

  update(time,delta){
    super.update(time,delta);
    this._updateProceduralAudio(delta);
  }
}

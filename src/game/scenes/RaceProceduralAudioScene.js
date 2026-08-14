import { RaceScene as CurrentRaceScene } from './RaceGamepadScene.js';

const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

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
      limiter.threshold.value=-9;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.006;limiter.release.value=.18;
      master.connect(limiter).connect(ctx.destination);

      const engineBus=ctx.createGain();engineBus.gain.value=0;
      const engineFilter=ctx.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=1200;engineFilter.Q.value=.55;
      engineBus.connect(engineFilter).connect(master);

      const id=String(this.carId||'car');
      const prefs=audioPrefs();
      const seed=profileSeed(id,prefs.profile);
      const osc1=ctx.createOscillator(),osc2=ctx.createOscillator(),osc3=ctx.createOscillator();
      osc1.type=seed>.66?'sawtooth':seed>.33?'square':'triangle';
      osc2.type='triangle';osc3.type='sine';
      const g1=ctx.createGain(),g2=ctx.createGain(),g3=ctx.createGain();
      g1.gain.value=.52;g2.gain.value=.22;g3.gain.value=.12;
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

    const shiftPoint=.52;
    const gear=speed01<shiftPoint?1:2;
    if(gear!==this._audioGear&&speed>35){this._audioGear=gear;this._audioShiftUntil=performance.now()+155;}
    const inGear=gear===1?clamp(speed01/shiftPoint,0,1):clamp((speed01-shiftPoint)/(1-shiftPoint),0,1);
    let rpm01=.22+inGear*.70+throttle*.10;
    if(performance.now()<this._audioShiftUntil)rpm01*=.66;

    const seed=a.seed;
    const baseHz=42+seed*18;
    const hz=baseHz+rpm01*(105+seed*42);
    a.osc1.frequency.setTargetAtTime(hz,now,.035);
    a.osc2.frequency.setTargetAtTime(hz*2.01,now,.035);
    a.osc3.frequency.setTargetAtTime(hz*(3+seed*.08),now,.035);
    a.engineFilter.frequency.setTargetAtTime(520+rpm01*1850+throttle*900,now,.06);
    const engineLevel=(.025+rpm01*.055+throttle*.045)*(this._raceStarted?1:.45)*prefs.engine;
    a.engineBus.gain.setTargetAtTime(engineLevel,now,.045);

    const windLevel=Math.pow(clamp(speed01,0,1),1.7)*.018*prefs.effects;
    a.windFilter.frequency.setTargetAtTime(850+speed01*1700,now,.12);
    a.windGain.gain.setTargetAtTime(windLevel,now,.09);

    a.master.gain.setTargetAtTime(prefs.mute?0:prefs.master*.78,now,.04);

    const dt=Math.max(.001,Number(delta||16.7)/1000);
    const decel=(this._audioPrevSpeed-speed)/dt;
    if(speed>80&&decel>520&&performance.now()-this._audioLastImpactAt>180){
      this._audioLastImpactAt=performance.now();
      this._impactSound(clamp((decel-520)/1200,.18,1),prefs.impacts);
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

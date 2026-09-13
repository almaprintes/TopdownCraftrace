import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=50;
const IDLE_RPM=950;
const REDLINE_RPM=7200;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    const a=s?.audio||{};
    return {master:clamp(Number(a.master??1),0,1),engine:clamp(Number(a.engine??1),0,1),mute:!!a.mute};
  }catch{return {master:1,engine:1,mute:false};}
}

function makeNoiseBuffer(ctx,seconds=1.5){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let last=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    last=last*.76+white*.24;
    d[i]=last;
  }
  return b;
}

export class CarEngineSampleRuntime{
  constructor(scene){
    this.scene=scene;
    this.engineStarted=false;
    this.unlocked=false;
    this._ctx=null;
    this._nodes=null;
    this._lastUpdate=0;
    this._rpm=IDLE_RPM;
    this._lastSpeedKmh=0;
    this._lastThrottle=0;
    this._gear=1;
    this._shiftUntil=0;
  }

  _buildGraph(){
    if(this._nodes||!this._ctx)return;
    const ctx=this._ctx;

    const master=ctx.createGain();
    master.gain.value=0;
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-8;
    limiter.knee.value=12;
    limiter.ratio.value=4;
    limiter.attack.value=.008;
    limiter.release.value=.16;
    master.connect(limiter).connect(ctx.destination);

    const engineBus=ctx.createGain();
    const bodyFilter=ctx.createBiquadFilter();
    bodyFilter.type='lowpass';
    bodyFilter.frequency.value=1500;
    bodyFilter.Q.value=.55;
    engineBus.connect(bodyFilter).connect(master);

    const fundamental=ctx.createOscillator();
    const harmonic2=ctx.createOscillator();
    const harmonic3=ctx.createOscillator();
    const harmonic4=ctx.createOscillator();
    fundamental.type='sawtooth';
    harmonic2.type='triangle';
    harmonic3.type='sine';
    harmonic4.type='sine';

    const g1=ctx.createGain(),g2=ctx.createGain(),g3=ctx.createGain(),g4=ctx.createGain();
    g1.gain.value=.29;g2.gain.value=.18;g3.gain.value=.08;g4.gain.value=.035;
    fundamental.connect(g1).connect(engineBus);
    harmonic2.connect(g2).connect(engineBus);
    harmonic3.connect(g3).connect(engineBus);
    harmonic4.connect(g4).connect(engineBus);

    const intakeNoise=ctx.createBufferSource();
    intakeNoise.buffer=makeNoiseBuffer(ctx);
    intakeNoise.loop=true;
    const intakeFilter=ctx.createBiquadFilter();
    intakeFilter.type='bandpass';
    intakeFilter.frequency.value=900;
    intakeFilter.Q.value=.8;
    const intakeGain=ctx.createGain();
    intakeGain.gain.value=0;
    intakeNoise.connect(intakeFilter).connect(intakeGain).connect(engineBus);

    const windNoise=ctx.createBufferSource();
    windNoise.buffer=makeNoiseBuffer(ctx);
    windNoise.loop=true;
    const windFilter=ctx.createBiquadFilter();
    windFilter.type='highpass';
    windFilter.frequency.value=1000;
    const windGain=ctx.createGain();
    windGain.gain.value=0;
    windNoise.connect(windFilter).connect(windGain).connect(master);

    fundamental.start();harmonic2.start();harmonic3.start();harmonic4.start();
    intakeNoise.start();windNoise.start();

    this._nodes={master,limiter,engineBus,bodyFilter,fundamental,harmonic2,harmonic3,harmonic4,g1,g2,g3,g4,intakeNoise,intakeFilter,intakeGain,windNoise,windFilter,windGain};
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    try{
      if(!this._ctx){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return;
        this._ctx=new AC({latencyHint:'interactive'});
        this._buildGraph();
      }
      if(this._ctx.state==='suspended')this._ctx.resume();
      this._rpm=IDLE_RPM;
      this._gear=1;
      this._shiftUntil=0;
      this.update(true);
    }catch(e){console.warn('[TDR2 engine] procedural init failed',e);}
  }

  _targetRpm(kmh,throttle,nowMs){
    const gearBySpeed=kmh<42?1:kmh<78?2:kmh<116?3:kmh<154?4:5;
    if(gearBySpeed!==this._gear&&kmh>8){
      this._gear=gearBySpeed;
      this._shiftUntil=nowMs+150;
    }

    const gearLow=[0,0,34,68,104,142][this._gear]||0;
    const gearHigh=[0,48,84,122,160,205][this._gear]||205;
    const gearProgress=clamp((kmh-gearLow)/Math.max(1,gearHigh-gearLow),0,1);
    const roadRpm=IDLE_RPM+gearProgress*4700;

    // Standing throttle can freely rev. While moving, road speed anchors the engine
    // and throttle adds load/rev response instead of acting as a binary pitch switch.
    const freeRev=IDLE_RPM+throttle*4700;
    let target=kmh<5?freeRev:Math.max(roadRpm,IDLE_RPM+throttle*2650);
    if(nowMs<this._shiftUntil)target*=.72;
    return clamp(target,IDLE_RPM,REDLINE_RPM);
  }

  update(force=false){
    if(!this.scene||this.scene._tdrEmbeddedReplay||!this.engineStarted)return;
    const perfNow=performance.now();
    if(!force&&perfNow-this._lastUpdate<UPDATE_MS)return;
    const elapsed=Math.max(UPDATE_MS,perfNow-this._lastUpdate||UPDATE_MS);
    this._lastUpdate=perfNow;

    if(!this._ctx||!this._nodes)return;
    if(this._ctx.state==='suspended')return;

    const body=this.scene.carBody?.body;
    const speedPx=Math.hypot(Number(body?.velocity?.x||0),Number(body?.velocity?.y||0));
    const kmh=Math.max(0,pxpsToKmh(speedPx));
    const throttle=clamp(Number(this.scene.touch?.throttle||0),0,1);
    const p=prefs();
    const target=this._targetRpm(kmh,throttle,perfNow);

    const risePerSecond=throttle>.05?7600:3000;
    const fallPerSecond=5200;
    const maxStep=(this._rpm<target?risePerSecond:fallPerSecond)*(elapsed/1000);
    if(this._rpm<target)this._rpm=Math.min(target,this._rpm+maxStep);
    else this._rpm=Math.max(target,this._rpm-maxStep);

    const rpm01=clamp((this._rpm-IDLE_RPM)/(REDLINE_RPM-IDLE_RPM),0,1);
    const firingHz=this._rpm/30; // 4-cylinder, four-stroke firing frequency.
    const n=this._nodes;
    const now=this._ctx.currentTime;

    n.fundamental.frequency.setTargetAtTime(firingHz,now,.045);
    n.harmonic2.frequency.setTargetAtTime(firingHz*2.01,now,.05);
    n.harmonic3.frequency.setTargetAtTime(firingHz*3.02,now,.055);
    n.harmonic4.frequency.setTargetAtTime(firingHz*4.03,now,.06);

    // Low RPM is rounder; high RPM progressively opens the exhaust/intake tone.
    const cutoff=650+rpm01*2350+throttle*500;
    n.bodyFilter.frequency.setTargetAtTime(cutoff,now,.08);
    n.g1.gain.setTargetAtTime(.26-rpm01*.07,now,.08);
    n.g2.gain.setTargetAtTime(.14+rpm01*.08,now,.08);
    n.g3.gain.setTargetAtTime(.055+rpm01*.055,now,.08);
    n.g4.gain.setTargetAtTime(.018+rpm01*.042,now,.08);

    n.intakeFilter.frequency.setTargetAtTime(720+rpm01*1550,now,.10);
    n.intakeGain.gain.setTargetAtTime((.006+throttle*.026+rpm01*.012)*p.engine,now,.08);

    const speed01=clamp(kmh/180,0,1);
    n.windFilter.frequency.setTargetAtTime(900+speed01*1800,now,.14);
    n.windGain.gain.setTargetAtTime(Math.pow(speed01,1.7)*.016,now,.12);

    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const engineLevel=(.055+rpm01*.055+throttle*.032)*(preGrid?.70:1)*p.engine;
    n.engineBus.gain.setTargetAtTime(engineLevel,now,.065);
    n.master.gain.setTargetAtTime(p.mute?0:p.master*.82,now,.06);

    this._lastSpeedKmh=kmh;
    this._lastThrottle=throttle;
  }

  destroy(){
    try{
      const n=this._nodes;
      n?.fundamental?.stop?.();n?.harmonic2?.stop?.();n?.harmonic3?.stop?.();n?.harmonic4?.stop?.();
      n?.intakeNoise?.stop?.();n?.windNoise?.stop?.();
    }catch{}
    try{this._ctx?.close?.();}catch{}
    this._nodes=null;
    this._ctx=null;
    this.scene=null;
  }
}

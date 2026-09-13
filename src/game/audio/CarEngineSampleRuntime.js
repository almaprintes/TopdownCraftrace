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

function makeNoiseBuffer(ctx,seconds=2){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let slow=0,fast=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    slow=slow*.985+white*.015;
    fast=fast*.72+white*.28;
    d[i]=slow*.62+fast*.38;
  }
  return b;
}

function makeDriveCurve(amount=1.5){
  const n=512,curve=new Float32Array(n);
  for(let i=0;i<n;i++){
    const x=(i/(n-1))*2-1;
    curve[i]=Math.tanh(x*amount)/Math.tanh(amount);
  }
  return curve;
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
    this._gear=1;
    this._shiftUntil=0;
  }

  _buildGraph(){
    if(this._nodes||!this._ctx)return;
    const ctx=this._ctx;

    const master=ctx.createGain(); master.gain.value=0;
    const limiter=ctx.createDynamicsCompressor();
    limiter.threshold.value=-10; limiter.knee.value=18; limiter.ratio.value=3.2;
    limiter.attack.value=.006; limiter.release.value=.18;
    master.connect(limiter).connect(ctx.destination);

    const engineBus=ctx.createGain(); engineBus.gain.value=0;
    const drive=ctx.createWaveShaper(); drive.curve=makeDriveCurve(1.35); drive.oversample='2x';
    const bodyLow=ctx.createBiquadFilter(); bodyLow.type='lowshelf'; bodyLow.frequency.value=180; bodyLow.gain.value=4;
    const bodyMid=ctx.createBiquadFilter(); bodyMid.type='peaking'; bodyMid.frequency.value=520; bodyMid.Q.value=.65; bodyMid.gain.value=3;
    const bodyHigh=ctx.createBiquadFilter(); bodyHigh.type='lowpass'; bodyHigh.frequency.value=2400; bodyHigh.Q.value=.35;
    engineBus.connect(drive).connect(bodyLow).connect(bodyMid).connect(bodyHigh).connect(master);

    // Crank/body layers. Avoid saw/square waves: those were the source of the "bee" timbre.
    const crank=ctx.createOscillator(); crank.type='sine';
    const combustion=ctx.createOscillator(); combustion.type='triangle';
    const harmonic=ctx.createOscillator(); harmonic.type='sine';
    const crankGain=ctx.createGain(),combGain=ctx.createGain(),harmGain=ctx.createGain();
    crankGain.gain.value=.22; combGain.gain.value=.16; harmGain.gain.value=.035;
    crank.connect(crankGain).connect(engineBus);
    combustion.connect(combGain).connect(engineBus);
    harmonic.connect(harmGain).connect(engineBus);

    // Broadband combustion texture. This gives each firing cycle grit/body instead of a pure electronic note.
    const combustionNoise=ctx.createBufferSource(); combustionNoise.buffer=makeNoiseBuffer(ctx); combustionNoise.loop=true;
    const combustionBand=ctx.createBiquadFilter(); combustionBand.type='bandpass'; combustionBand.frequency.value=430; combustionBand.Q.value=.75;
    const combustionNoiseGain=ctx.createGain(); combustionNoiseGain.gain.value=.012;
    combustionNoise.connect(combustionBand).connect(combustionNoiseGain).connect(engineBus);

    // Intake/exhaust air layer under load.
    const intakeNoise=ctx.createBufferSource(); intakeNoise.buffer=makeNoiseBuffer(ctx); intakeNoise.loop=true;
    const intakeFilter=ctx.createBiquadFilter(); intakeFilter.type='bandpass'; intakeFilter.frequency.value=950; intakeFilter.Q.value=.8;
    const intakeGain=ctx.createGain(); intakeGain.gain.value=0;
    intakeNoise.connect(intakeFilter).connect(intakeGain).connect(engineBus);

    // Mechanical/timing texture at higher rpm.
    const mechNoise=ctx.createBufferSource(); mechNoise.buffer=makeNoiseBuffer(ctx); mechNoise.loop=true;
    const mechFilter=ctx.createBiquadFilter(); mechFilter.type='highpass'; mechFilter.frequency.value=1700; mechFilter.Q.value=.25;
    const mechGain=ctx.createGain(); mechGain.gain.value=0;
    mechNoise.connect(mechFilter).connect(mechGain).connect(engineBus);

    // Road/wind stays separate from engine character.
    const windNoise=ctx.createBufferSource(); windNoise.buffer=makeNoiseBuffer(ctx); windNoise.loop=true;
    const windFilter=ctx.createBiquadFilter(); windFilter.type='highpass'; windFilter.frequency.value=1200;
    const windGain=ctx.createGain(); windGain.gain.value=0;
    windNoise.connect(windFilter).connect(windGain).connect(master);

    crank.start(); combustion.start(); harmonic.start();
    combustionNoise.start(); intakeNoise.start(); mechNoise.start(); windNoise.start();

    this._nodes={master,limiter,engineBus,drive,bodyLow,bodyMid,bodyHigh,
      crank,combustion,harmonic,crankGain,combGain,harmGain,
      combustionNoise,combustionBand,combustionNoiseGain,
      intakeNoise,intakeFilter,intakeGain,mechNoise,mechFilter,mechGain,
      windNoise,windFilter,windGain};
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
    if(gearBySpeed!==this._gear&&kmh>8){this._gear=gearBySpeed;this._shiftUntil=nowMs+165;}
    const gearLow=[0,0,34,68,104,142][this._gear]||0;
    const gearHigh=[0,48,84,122,160,205][this._gear]||205;
    const progress=clamp((kmh-gearLow)/Math.max(1,gearHigh-gearLow),0,1);
    const roadRpm=IDLE_RPM+progress*4550;
    const freeRev=IDLE_RPM+throttle*5000;
    let target=kmh<5?freeRev:Math.max(roadRpm,IDLE_RPM+throttle*2500);
    if(nowMs<this._shiftUntil)target*=.70;
    return clamp(target,IDLE_RPM,REDLINE_RPM);
  }

  update(force=false){
    if(!this.scene||this.scene._tdrEmbeddedReplay||!this.engineStarted)return;
    const perfNow=performance.now();
    if(!force&&perfNow-this._lastUpdate<UPDATE_MS)return;
    const elapsed=Math.max(UPDATE_MS,perfNow-this._lastUpdate||UPDATE_MS);
    this._lastUpdate=perfNow;
    if(!this._ctx||!this._nodes||this._ctx.state==='suspended')return;

    const body=this.scene.carBody?.body;
    const speedPx=Math.hypot(Number(body?.velocity?.x||0),Number(body?.velocity?.y||0));
    const kmh=Math.max(0,pxpsToKmh(speedPx));
    const throttle=clamp(Number(this.scene.touch?.throttle||0),0,1);
    const p=prefs();
    const target=this._targetRpm(kmh,throttle,perfNow);

    const risePerSecond=throttle>.05?6800:2600;
    const fallPerSecond=4300;
    const maxStep=(this._rpm<target?risePerSecond:fallPerSecond)*(elapsed/1000);
    if(this._rpm<target)this._rpm=Math.min(target,this._rpm+maxStep);
    else this._rpm=Math.max(target,this._rpm-maxStep);

    const rpm01=clamp((this._rpm-IDLE_RPM)/(REDLINE_RPM-IDLE_RPM),0,1);
    const crankHz=this._rpm/60;
    const firingHz=this._rpm/30;
    const jitter=1+Math.sin(perfNow*.017)*.003+Math.sin(perfNow*.0061)*.002;
    const n=this._nodes,now=this._ctx.currentTime;

    n.crank.frequency.setTargetAtTime(crankHz*jitter,now,.05);
    n.combustion.frequency.setTargetAtTime(firingHz*jitter,now,.045);
    n.harmonic.frequency.setTargetAtTime(firingHz*(1.48+rpm01*.08),now,.06);

    // The tonal component decreases with revs while texture/intake grows.
    n.crankGain.gain.setTargetAtTime(.20-rpm01*.08,now,.08);
    n.combGain.gain.setTargetAtTime(.13-rpm01*.035+throttle*.025,now,.08);
    n.harmGain.gain.setTargetAtTime(.022+rpm01*.024,now,.09);

    n.combustionBand.frequency.setTargetAtTime(320+rpm01*720,now,.10);
    n.combustionBand.Q.setTargetAtTime(.65+rpm01*.35,now,.10);
    n.combustionNoiseGain.gain.setTargetAtTime((.020+rpm01*.026+throttle*.018)*p.engine,now,.08);

    n.intakeFilter.frequency.setTargetAtTime(650+rpm01*1750,now,.11);
    n.intakeGain.gain.setTargetAtTime((.005+throttle*.040+rpm01*.012)*p.engine,now,.08);
    n.mechFilter.frequency.setTargetAtTime(1450+rpm01*1700,now,.12);
    n.mechGain.gain.setTargetAtTime((rpm01*.018+Math.max(0,rpm01-.55)*.025)*p.engine,now,.10);

    n.bodyMid.frequency.setTargetAtTime(430+rpm01*520,now,.12);
    n.bodyMid.gain.setTargetAtTime(4-rpm01*1.5,now,.12);
    n.bodyHigh.frequency.setTargetAtTime(1250+rpm01*3000+throttle*450,now,.10);

    const speed01=clamp(kmh/180,0,1);
    n.windFilter.frequency.setTargetAtTime(1050+speed01*1900,now,.14);
    n.windGain.gain.setTargetAtTime(Math.pow(speed01,1.75)*.012,now,.12);

    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const engineLevel=(.045+rpm01*.040+throttle*.030)*(preGrid?.70:1)*p.engine;
    n.engineBus.gain.setTargetAtTime(engineLevel,now,.07);
    n.master.gain.setTargetAtTime(p.mute?0:p.master*.84,now,.06);
  }

  destroy(){
    try{
      const n=this._nodes;
      n?.crank?.stop?.();n?.combustion?.stop?.();n?.harmonic?.stop?.();
      n?.combustionNoise?.stop?.();n?.intakeNoise?.stop?.();n?.mechNoise?.stop?.();n?.windNoise?.stop?.();
    }catch{}
    try{this._ctx?.close?.();}catch{}
    this._nodes=null;this._ctx=null;this.scene=null;
  }
}

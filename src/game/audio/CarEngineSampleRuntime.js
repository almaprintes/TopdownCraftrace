import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=45;
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

function makeNoiseBuffer(ctx,seconds=2.4){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let slow=0,mid=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    slow=slow*.992+white*.008;
    mid=mid*.78+white*.22;
    d[i]=clamp(slow*.34+mid*.46+white*.20,-1,1);
  }
  return b;
}

function makeDriveCurve(amount=1.25){
  const n=1024,curve=new Float32Array(n);
  for(let i=0;i<n;i++){
    const x=(i/(n-1))*2-1;
    curve[i]=Math.tanh(x*amount)/Math.tanh(amount);
  }
  return curve;
}

function makeExhaustWave(ctx,brightness=1){
  const partials=18;
  const real=new Float32Array(partials+1);
  const imag=new Float32Array(partials+1);
  for(let h=1;h<=partials;h++){
    const roll=Math.pow(h,1.12+brightness*.18);
    const odd=h%2?1:.72;
    imag[h]=(odd/roll)*(1+.08*Math.sin(h*1.73));
    real[h]=(0.16/roll)*Math.cos(h*.61);
  }
  return ctx.createPeriodicWave(real,imag,{disableNormalization:false});
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
    this._lastGear=1;
  }

  _buildGraph(){
    if(this._nodes||!this._ctx)return;
    const ctx=this._ctx;

    const master=ctx.createGain(); master.gain.value=0;
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-13; compressor.knee.value=20; compressor.ratio.value=3.4;
    compressor.attack.value=.004; compressor.release.value=.16;
    master.connect(compressor).connect(ctx.destination);

    const engineBus=ctx.createGain(); engineBus.gain.value=0;
    const drive=ctx.createWaveShaper(); drive.curve=makeDriveCurve(1.18); drive.oversample='2x';
    const warmth=ctx.createBiquadFilter(); warmth.type='lowshelf'; warmth.frequency.value=170; warmth.gain.value=5;
    const body=ctx.createBiquadFilter(); body.type='peaking'; body.frequency.value=480; body.Q.value=.58; body.gain.value=3.4;
    const roof=ctx.createBiquadFilter(); roof.type='lowpass'; roof.frequency.value=3000; roof.Q.value=.32;
    engineBus.connect(drive).connect(warmth).connect(body).connect(roof).connect(master);

    // Exhaust pulse train: custom wavetable instead of stock oscillator shapes.
    const pulseA=ctx.createOscillator(); pulseA.setPeriodicWave(makeExhaustWave(ctx,.35));
    const pulseB=ctx.createOscillator(); pulseB.setPeriodicWave(makeExhaustWave(ctx,.78));
    const crank=ctx.createOscillator(); crank.type='sine';
    const pulseAGain=ctx.createGain(),pulseBGain=ctx.createGain(),crankGain=ctx.createGain();
    pulseAGain.gain.value=.14; pulseBGain.gain.value=.055; crankGain.gain.value=.12;
    pulseA.connect(pulseAGain).connect(engineBus);
    pulseB.connect(pulseBGain).connect(engineBus);
    crank.connect(crankGain).connect(engineBus);

    // Combustion texture: broad, filtered noise carries most of the realism.
    const combustionNoise=ctx.createBufferSource(); combustionNoise.buffer=makeNoiseBuffer(ctx); combustionNoise.loop=true;
    const combustionLow=ctx.createBiquadFilter(); combustionLow.type='bandpass'; combustionLow.frequency.value=360; combustionLow.Q.value=.48;
    const combustionHigh=ctx.createBiquadFilter(); combustionHigh.type='bandpass'; combustionHigh.frequency.value=980; combustionHigh.Q.value=.62;
    const combustionLowGain=ctx.createGain(),combustionHighGain=ctx.createGain();
    combustionLowGain.gain.value=.024; combustionHighGain.gain.value=.008;
    combustionNoise.connect(combustionLow).connect(combustionLowGain).connect(engineBus);
    combustionNoise.connect(combustionHigh).connect(combustionHighGain).connect(engineBus);

    // Intake gets stronger with throttle; coast texture gets stronger with closed throttle at RPM.
    const intakeNoise=ctx.createBufferSource(); intakeNoise.buffer=makeNoiseBuffer(ctx); intakeNoise.loop=true;
    const intakeFilter=ctx.createBiquadFilter(); intakeFilter.type='bandpass'; intakeFilter.frequency.value=1050; intakeFilter.Q.value=.72;
    const intakeGain=ctx.createGain(); intakeGain.gain.value=0;
    intakeNoise.connect(intakeFilter).connect(intakeGain).connect(engineBus);

    const coastNoise=ctx.createBufferSource(); coastNoise.buffer=makeNoiseBuffer(ctx); coastNoise.loop=true;
    const coastFilter=ctx.createBiquadFilter(); coastFilter.type='bandpass'; coastFilter.frequency.value=620; coastFilter.Q.value=.55;
    const coastGain=ctx.createGain(); coastGain.gain.value=0;
    coastNoise.connect(coastFilter).connect(coastGain).connect(engineBus);

    const mechNoise=ctx.createBufferSource(); mechNoise.buffer=makeNoiseBuffer(ctx); mechNoise.loop=true;
    const mechFilter=ctx.createBiquadFilter(); mechFilter.type='highpass'; mechFilter.frequency.value=1900; mechFilter.Q.value=.2;
    const mechGain=ctx.createGain(); mechGain.gain.value=0;
    mechNoise.connect(mechFilter).connect(mechGain).connect(engineBus);

    const windNoise=ctx.createBufferSource(); windNoise.buffer=makeNoiseBuffer(ctx); windNoise.loop=true;
    const windFilter=ctx.createBiquadFilter(); windFilter.type='highpass'; windFilter.frequency.value=1350;
    const windGain=ctx.createGain(); windGain.gain.value=0;
    windNoise.connect(windFilter).connect(windGain).connect(master);

    pulseA.start(); pulseB.start(ctx.currentTime+.006); crank.start();
    combustionNoise.start(); intakeNoise.start(); coastNoise.start(); mechNoise.start(); windNoise.start();

    this._nodes={master,compressor,engineBus,drive,warmth,body,roof,pulseA,pulseB,crank,pulseAGain,pulseBGain,crankGain,
      combustionNoise,combustionLow,combustionHigh,combustionLowGain,combustionHighGain,
      intakeNoise,intakeFilter,intakeGain,coastNoise,coastFilter,coastGain,
      mechNoise,mechFilter,mechGain,windNoise,windFilter,windGain};
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
      this._lastGear=1;
      this._shiftUntil=0;
      this.update(true);
    }catch(e){console.warn('[TDR2 engine] procedural init failed',e);}
  }

  _targetRpm(kmh,throttle,nowMs){
    const gearBySpeed=kmh<43?1:kmh<79?2:kmh<116?3:kmh<154?4:5;
    if(gearBySpeed!==this._gear&&kmh>8){
      this._lastGear=this._gear;
      this._gear=gearBySpeed;
      this._shiftUntil=nowMs+175;
    }
    const gearLow=[0,0,34,69,105,143][this._gear]||0;
    const gearHigh=[0,49,85,123,161,205][this._gear]||205;
    const progress=clamp((kmh-gearLow)/Math.max(1,gearHigh-gearLow),0,1);
    const roadRpm=IDLE_RPM+progress*4725;
    const freeRev=IDLE_RPM+throttle*5050;
    let target=kmh<5?freeRev:Math.max(roadRpm,IDLE_RPM+throttle*2450);
    if(nowMs<this._shiftUntil)target*=.68;
    return clamp(target,IDLE_RPM,REDLINE_RPM);
  }

  update(force=false){
    if(!this.scene||this.scene._tdrEmbeddedReplay||!this.engineStarted)return;
    const perfNow=performance.now();
    if(!force&&perfNow-this._lastUpdate<UPDATE_MS)return;
    const elapsed=Math.max(UPDATE_MS,perfNow-this._lastUpdate||UPDATE_MS);
    this._lastUpdate=perfNow;
    if(!this._ctx||!this._nodes||this._ctx.state==='suspended')return;

    const bodyObj=this.scene.carBody?.body;
    const speedPx=Math.hypot(Number(bodyObj?.velocity?.x||0),Number(bodyObj?.velocity?.y||0));
    const kmh=Math.max(0,pxpsToKmh(speedPx));
    const throttle=clamp(Number(this.scene.touch?.throttle||0),0,1);
    const p=prefs();
    const target=this._targetRpm(kmh,throttle,perfNow);

    const risePerSecond=throttle>.05?6100:2350;
    const fallPerSecond=3900;
    const maxStep=(this._rpm<target?risePerSecond:fallPerSecond)*(elapsed/1000);
    if(this._rpm<target)this._rpm=Math.min(target,this._rpm+maxStep);
    else this._rpm=Math.max(target,this._rpm-maxStep);

    const rpm01=clamp((this._rpm-IDLE_RPM)/(REDLINE_RPM-IDLE_RPM),0,1);
    const crankHz=this._rpm/60;
    const firingHz=this._rpm/30;
    const roughness=1+Math.sin(perfNow*.0113)*.0027+Math.sin(perfNow*.0047)*.0019+Math.sin(perfNow*.0231)*.0012;
    const n=this._nodes,now=this._ctx.currentTime;
    const shifting=perfNow<this._shiftUntil;

    n.crank.frequency.setTargetAtTime(crankHz*roughness,now,.05);
    n.pulseA.frequency.setTargetAtTime(firingHz*roughness,now,.043);
    n.pulseB.frequency.setTargetAtTime(firingHz*(1.0035+rpm01*.0015),now,.052);

    // Keep pure tone subordinate to texture; load opens the exhaust rather than simply making it louder.
    n.crankGain.gain.setTargetAtTime(.095-rpm01*.035,now,.08);
    n.pulseAGain.gain.setTargetAtTime(.105-rpm01*.025+throttle*.018,now,.08);
    n.pulseBGain.gain.setTargetAtTime(.032+rpm01*.020+throttle*.012,now,.09);

    n.combustionLow.frequency.setTargetAtTime(280+rpm01*690,now,.10);
    n.combustionLowGain.gain.setTargetAtTime((.030+rpm01*.028+throttle*.014)*p.engine,now,.08);
    n.combustionHigh.frequency.setTargetAtTime(760+rpm01*1500,now,.10);
    n.combustionHighGain.gain.setTargetAtTime((.008+rpm01*.023+throttle*.014)*p.engine,now,.08);

    n.intakeFilter.frequency.setTargetAtTime(720+rpm01*2100,now,.11);
    n.intakeGain.gain.setTargetAtTime((.004+throttle*.046+rpm01*throttle*.018)*p.engine,now,.08);
    const coastAmount=(1-throttle)*rpm01;
    n.coastFilter.frequency.setTargetAtTime(430+rpm01*1050,now,.12);
    n.coastGain.gain.setTargetAtTime((coastAmount*.030)*p.engine,now,.09);
    n.mechFilter.frequency.setTargetAtTime(1650+rpm01*2100,now,.12);
    n.mechGain.gain.setTargetAtTime((rpm01*.011+Math.max(0,rpm01-.55)*.030)*p.engine,now,.10);

    n.body.frequency.setTargetAtTime(420+rpm01*560,now,.12);
    n.body.gain.setTargetAtTime(4.4-rpm01*1.8,now,.12);
    n.roof.frequency.setTargetAtTime(1450+rpm01*3300+throttle*620,now,.10);

    const speed01=clamp(kmh/180,0,1);
    n.windFilter.frequency.setTargetAtTime(1150+speed01*2200,now,.14);
    n.windGain.gain.setTargetAtTime(Math.pow(speed01,1.8)*.010,now,.12);

    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const shiftDip=shifting?.78:1;
    const engineLevel=(.050+rpm01*.036+throttle*.026)*(preGrid?.72:1)*shiftDip*p.engine;
    n.engineBus.gain.setTargetAtTime(engineLevel,now,.065);
    n.master.gain.setTargetAtTime(p.mute?0:p.master*.86,now,.055);
  }

  destroy(){
    try{
      const n=this._nodes;
      n?.pulseA?.stop?.();n?.pulseB?.stop?.();n?.crank?.stop?.();
      n?.combustionNoise?.stop?.();n?.intakeNoise?.stop?.();n?.coastNoise?.stop?.();n?.mechNoise?.stop?.();n?.windNoise?.stop?.();
    }catch{}
    try{this._ctx?.close?.();}catch{}
    this._nodes=null;this._ctx=null;this.scene=null;
  }
}

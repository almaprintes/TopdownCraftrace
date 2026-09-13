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
    return {master:clamp(Number(a.master??1),0,1),engine:clamp(Number(a.engine??1),0,1),effects:clamp(Number(a.effects??.45),0,1),mute:!!a.mute};
  }catch{return {master:1,engine:1,effects:.45,mute:false};}
}

function makeNoiseBuffer(ctx,seconds=2.2){
  const length=Math.max(1,Math.floor(ctx.sampleRate*seconds));
  const b=ctx.createBuffer(1,length,ctx.sampleRate);
  const d=b.getChannelData(0);
  let slow=0,fast=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    slow=slow*.988+white*.012;
    fast=fast*.70+white*.30;
    d[i]=clamp(slow*.40+fast*.44+white*.16,-1,1);
  }
  return b;
}

function makeDriveCurve(amount=1.18){
  const n=1024,curve=new Float32Array(n);
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
    this._graphPromise=null;
  }

  async _buildGraph(){
    if(this._nodes||!this._ctx)return;
    const ctx=this._ctx;
    if(!ctx.audioWorklet||typeof AudioWorkletNode==='undefined')throw new Error('AudioWorklet unavailable');

    const moduleUrl=new URL('./EngineCombustionProcessor.js',import.meta.url);
    await ctx.audioWorklet.addModule(moduleUrl);
    if(!this._ctx||this._ctx!==ctx)return;

    const master=ctx.createGain();master.gain.value=0;
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-12;compressor.knee.value=18;compressor.ratio.value=3.1;
    compressor.attack.value=.003;compressor.release.value=.18;
    master.connect(compressor).connect(ctx.destination);

    const engineBus=ctx.createGain();engineBus.gain.value=0;
    const drive=ctx.createWaveShaper();drive.curve=makeDriveCurve(1.12);drive.oversample='2x';
    const lowBody=ctx.createBiquadFilter();lowBody.type='lowshelf';lowBody.frequency.value=150;lowBody.gain.value=3.5;
    const cabin=ctx.createBiquadFilter();cabin.type='peaking';cabin.frequency.value=410;cabin.Q.value=.50;cabin.gain.value=2.4;
    const roof=ctx.createBiquadFilter();roof.type='lowpass';roof.frequency.value=5400;roof.Q.value=.28;
    engineBus.connect(drive).connect(lowBody).connect(cabin).connect(roof).connect(master);

    const combustion=new AudioWorkletNode(ctx,'tdr-engine-combustion',{
      numberOfInputs:0,
      numberOfOutputs:1,
      outputChannelCount:[2],
      parameterData:{rpm:IDLE_RPM,load:0,coast:0,level:.72},
    });
    combustion.connect(engineBus);

    const windNoise=ctx.createBufferSource();windNoise.buffer=makeNoiseBuffer(ctx);windNoise.loop=true;
    const windFilter=ctx.createBiquadFilter();windFilter.type='highpass';windFilter.frequency.value=1250;windFilter.Q.value=.20;
    const windGain=ctx.createGain();windGain.gain.value=0;
    windNoise.connect(windFilter).connect(windGain).connect(master);windNoise.start();

    this._nodes={master,compressor,engineBus,drive,lowBody,cabin,roof,combustion,windNoise,windFilter,windGain};
  }

  _playStarter(){
    const ctx=this._ctx;if(!ctx)return;
    const now=ctx.currentTime;
    try{
      const bus=ctx.createGain();
      const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=420;filter.Q.value=.70;
      const osc=ctx.createOscillator();osc.type='triangle';
      const oscGain=ctx.createGain();
      const noise=ctx.createBufferSource();noise.buffer=makeNoiseBuffer(ctx,.55);
      const noiseFilter=ctx.createBiquadFilter();noiseFilter.type='highpass';noiseFilter.frequency.value=900;
      const noiseGain=ctx.createGain();
      bus.connect(filter).connect(ctx.destination);
      osc.connect(oscGain).connect(bus);noise.connect(noiseFilter).connect(noiseGain).connect(bus);
      osc.frequency.setValueAtTime(72,now);osc.frequency.exponentialRampToValueAtTime(118,now+.34);
      oscGain.gain.setValueAtTime(.0001,now);oscGain.gain.exponentialRampToValueAtTime(.12,now+.025);oscGain.gain.exponentialRampToValueAtTime(.0001,now+.44);
      noiseGain.gain.setValueAtTime(.0001,now);noiseGain.gain.exponentialRampToValueAtTime(.035,now+.018);noiseGain.gain.exponentialRampToValueAtTime(.0001,now+.31);
      osc.start(now);noise.start(now);osc.stop(now+.46);noise.stop(now+.48);
    }catch{}
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    try{
      if(!this._ctx){
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return;
        this._ctx=new AC({latencyHint:'interactive'});
      }
      if(this._ctx.state==='suspended')this._ctx.resume();
      this._rpm=IDLE_RPM;
      this._playStarter();
      if(!this._nodes&&!this._graphPromise){
        this._graphPromise=this._buildGraph().then(()=>{
          this._graphPromise=null;
          this.update(true);
        }).catch(e=>{
          this._graphPromise=null;
          console.warn('[TDR2 engine] combustion worklet init failed',e);
        });
      }else this.update(true);
    }catch(e){console.warn('[TDR2 engine] procedural init failed',e);}
  }

  _targetRpm(kmh,throttle){
    const speedProgress=clamp(kmh/195,0,1);
    const roadCarry=IDLE_RPM+Math.pow(speedProgress,.86)*3450;
    if(throttle>.05)return REDLINE_RPM;
    return clamp(roadCarry,IDLE_RPM,REDLINE_RPM);
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
    const target=this._targetRpm(kmh,throttle);

    let risePerSecond=2250;
    if(throttle>.05)risePerSecond=this._rpm<3300?5900:this._rpm<5600?1250:900;
    const fallPerSecond=2850;
    const maxStep=(this._rpm<target?risePerSecond:fallPerSecond)*(elapsed/1000);
    if(this._rpm<target)this._rpm=Math.min(target,this._rpm+maxStep);
    else this._rpm=Math.max(target,this._rpm-maxStep);

    const rpm01=clamp((this._rpm-IDLE_RPM)/(REDLINE_RPM-IDLE_RPM),0,1);
    const speed01=clamp(kmh/180,0,1);
    const coast=clamp((1-throttle)*rpm01*(kmh>8?1:0),0,1);
    const load=clamp(throttle*.94+speed01*.06,0,1);
    const n=this._nodes,now=this._ctx.currentTime;

    n.combustion.parameters.get('rpm')?.setTargetAtTime(this._rpm,now,.055);
    n.combustion.parameters.get('load')?.setTargetAtTime(load,now,.055);
    n.combustion.parameters.get('coast')?.setTargetAtTime(coast,now,.070);
    n.combustion.parameters.get('level')?.setTargetAtTime(.64+rpm01*.09,now,.070);

    n.cabin.frequency.setTargetAtTime(360+rpm01*420,now,.12);
    n.cabin.gain.setTargetAtTime(2.8-rpm01*.9+load*.45,now,.12);
    n.roof.frequency.setTargetAtTime(2500+rpm01*3900+load*550,now,.10);

    n.windFilter.frequency.setTargetAtTime(1120+speed01*2450,now,.14);
    n.windGain.gain.setTargetAtTime(Math.pow(speed01,1.8)*.010*p.effects,now,.12);

    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const engineLevel=(.64+rpm01*.18+load*.10)*(preGrid?.72:1)*p.engine;
    n.engineBus.gain.setTargetAtTime(engineLevel,now,.06);
    n.master.gain.setTargetAtTime(p.mute?0:p.master*.82,now,.055);
  }

  destroy(){
    try{this._nodes?.windNoise?.stop?.();}catch{}
    try{this._nodes?.combustion?.disconnect?.();}catch{}
    try{this._ctx?.close?.();}catch{}
    this._nodes=null;
    this._graphPromise=null;
    this._ctx=null;
    this.scene=null;
  }
}

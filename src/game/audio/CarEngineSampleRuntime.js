import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=45,IDLE_RPM=950,REDLINE_RPM=7200;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const SPARK_URLS=[
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_0.wav',
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_1_0.wav',
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_2_0.wav',
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_3_0.wav',
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_4_0.wav',
'https://raw.githubusercontent.com/yashimosh/border-run/main/public/sfx/engine/loop_5_0.wav'];
const VORTEX_URL='https://raw.githubusercontent.com/buntine/CarEngines/master/sounds/engine.wav';
const SAMPLE_CARS=new Set(['helix_spark']);

function prefs(){try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'),a=s?.audio||{};return{master:clamp(Number(a.master??1),0,1),engine:clamp(Number(a.engine??1),0,1),effects:clamp(Number(a.effects??.45),0,1),mute:!!a.mute};}catch{return{master:1,engine:1,effects:.45,mute:false};}}
function makeNoiseBuffer(ctx,seconds=2.2){const length=Math.max(1,Math.floor(ctx.sampleRate*seconds)),b=ctx.createBuffer(1,length,ctx.sampleRate),d=b.getChannelData(0);let slow=0,fast=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;slow=slow*.988+white*.012;fast=fast*.70+white*.30;d[i]=clamp(slow*.40+fast*.44+white*.16,-1,1);}return b;}
function makeDriveCurve(amount=1.18){const n=1024,curve=new Float32Array(n);for(let i=0;i<n;i++){const x=(i/(n-1))*2-1;curve[i]=Math.tanh(x*amount)/Math.tanh(amount);}return curve;}
async function loadBuffer(ctx,url){const r=await fetch(url,{mode:'cors',cache:'force-cache'});if(!r.ok)throw new Error(`engine sample HTTP ${r.status}`);return ctx.decodeAudioData(await r.arrayBuffer());}

export class CarEngineSampleRuntime{
 constructor(scene){this.scene=scene;this.engineStarted=false;this.unlocked=false;this._ctx=null;this._nodes=null;this._lastUpdate=0;this._rpm=IDLE_RPM;this._graphPromise=null;}
 _mode(){return this.scene?.carId==='helix_spark'?'spark-samples':this.scene?.carId==='helix_vortex'?'vortex-sample':'procedural';}
 async _buildGraph(){
  if(this._nodes||!this._ctx)return;const ctx=this._ctx,mode=this._mode();
  const master=ctx.createGain();master.gain.value=0;const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=18;compressor.ratio.value=3.1;compressor.attack.value=.003;compressor.release.value=.18;master.connect(compressor).connect(ctx.destination);
  const engineBus=ctx.createGain();engineBus.gain.value=0,drive=ctx.createWaveShaper();drive.curve=makeDriveCurve(1.08);drive.oversample='2x';const lowBody=ctx.createBiquadFilter();lowBody.type='lowshelf';lowBody.frequency.value=150;lowBody.gain.value=3.2;const cabin=ctx.createBiquadFilter();cabin.type='peaking';cabin.frequency.value=410;cabin.Q.value=.50;cabin.gain.value=2.2;const roof=ctx.createBiquadFilter();roof.type='lowpass';roof.frequency.value=5600;roof.Q.value=.28;engineBus.connect(drive).connect(lowBody).connect(cabin).connect(roof).connect(master);
  let combustion=null,sampleSources=[],sampleGains=[];
  if(mode==='spark-samples'){
   console.info('[TDR2 engine] Spark loading six real RPM samples');
   const buffers=await Promise.all(SPARK_URLS.map(u=>loadBuffer(ctx,u)));
   for(const buffer of buffers){const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;gain.gain.value=0;src.connect(gain).connect(engineBus);src.start();sampleSources.push(src);sampleGains.push(gain);}console.info('[TDR2 engine] Spark six RPM samples decoded',buffers.map(b=>b.duration.toFixed(3)));
  }else if(mode==='vortex-sample'){
   const buffer=await loadBuffer(ctx,VORTEX_URL),src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.loop=true;src.playbackRate.value=1.1;gain.gain.value=.8;src.connect(gain).connect(engineBus);src.start();sampleSources=[src];sampleGains=[gain];
  }else{
   if(!ctx.audioWorklet||typeof AudioWorkletNode==='undefined')throw new Error('AudioWorklet unavailable');
   await ctx.audioWorklet.addModule(new URL('./EngineCombustionProcessor.js',import.meta.url));if(!this._ctx||this._ctx!==ctx)return;
   combustion=new AudioWorkletNode(ctx,'tdr-engine-combustion',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],parameterData:{rpm:IDLE_RPM,load:0,coast:0,level:.72}});combustion.connect(engineBus);
  }
  const windNoise=ctx.createBufferSource();windNoise.buffer=makeNoiseBuffer(ctx);windNoise.loop=true;const windFilter=ctx.createBiquadFilter();windFilter.type='highpass';windFilter.frequency.value=1250;windFilter.Q.value=.20;const windGain=ctx.createGain();windGain.gain.value=0;windNoise.connect(windFilter).connect(windGain).connect(master);windNoise.start();
  this._nodes={mode,master,compressor,engineBus,drive,lowBody,cabin,roof,combustion,sampleSources,sampleGains,windNoise,windFilter,windGain};
 }
 _playStarter(){const ctx=this._ctx;if(!ctx)return;const now=ctx.currentTime;try{const bus=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=420;filter.Q.value=.70;const osc=ctx.createOscillator();osc.type='triangle';const oscGain=ctx.createGain(),noise=ctx.createBufferSource();noise.buffer=makeNoiseBuffer(ctx,.55);const noiseFilter=ctx.createBiquadFilter();noiseFilter.type='highpass';noiseFilter.frequency.value=900;const noiseGain=ctx.createGain();bus.connect(filter).connect(ctx.destination);osc.connect(oscGain).connect(bus);noise.connect(noiseFilter).connect(noiseGain).connect(bus);osc.frequency.setValueAtTime(72,now);osc.frequency.exponentialRampToValueAtTime(118,now+.34);oscGain.gain.setValueAtTime(.0001,now);oscGain.gain.exponentialRampToValueAtTime(.12,now+.025);oscGain.gain.exponentialRampToValueAtTime(.0001,now+.44);noiseGain.gain.setValueAtTime(.0001,now);noiseGain.gain.exponentialRampToValueAtTime(.035,now+.018);noiseGain.gain.exponentialRampToValueAtTime(.0001,now+.31);osc.start(now);noise.start(now);osc.stop(now+.46);noise.stop(now+.48);}catch{}}
 startEngine(){this.engineStarted=true;this.unlocked=true;try{if(!this._ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this._ctx=new AC({latencyHint:'interactive'});}if(this._ctx.state==='suspended')this._ctx.resume();this._rpm=IDLE_RPM;this._playStarter();if(!this._nodes&&!this._graphPromise){this._graphPromise=this._buildGraph().then(()=>{this._graphPromise=null;this.update(true);}).catch(e=>{this._graphPromise=null;console.warn('[TDR2 engine] sample/procedural init failed',e);if(SAMPLE_CARS.has(this._carId())){console.error('[TDR2 engine] Spark samples unavailable; keeping engine silent rather than masking failure with synthetic fallback');}});}else this.update(true);}catch(e){console.warn('[TDR2 engine] init failed',e);}}
 _buildFallbackSampleGraph(){try{if(this._nodes||!this._ctx)return;const ctx=this._ctx,master=ctx.createGain(),compressor=ctx.createDynamicsCompressor(),engineBus=ctx.createGain(),roof=ctx.createBiquadFilter(),cabin=ctx.createBiquadFilter(),lowBody=ctx.createBiquadFilter(),drive=ctx.createWaveShaper();master.gain.value=0;compressor.threshold.value=-12;compressor.ratio.value=3;master.connect(compressor).connect(ctx.destination);drive.curve=makeDriveCurve(1.08);lowBody.type='lowshelf';lowBody.frequency.value=150;lowBody.gain.value=3;cabin.type='peaking';cabin.frequency.value=410;cabin.Q.value=.5;cabin.gain.value=2;roof.type='lowpass';roof.frequency.value=5600;engineBus.connect(drive).connect(lowBody).connect(cabin).connect(roof).connect(master);const osc=ctx.createOscillator(),osc2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();osc.type='sawtooth';osc2.type='triangle';g.gain.value=.07;g2.gain.value=.035;osc.frequency.value=70;osc2.frequency.value=140;osc.connect(g).connect(engineBus);osc2.connect(g2).connect(engineBus);osc.start();osc2.start();const windNoise=ctx.createBufferSource();windNoise.buffer=makeNoiseBuffer(ctx);windNoise.loop=true;const windFilter=ctx.createBiquadFilter();windFilter.type='highpass';windFilter.frequency.value=1250;const windGain=ctx.createGain();windGain.gain.value=0;windNoise.connect(windFilter).connect(windGain).connect(master);windNoise.start();this._nodes={mode:'fallback-sample',master,compressor,engineBus,drive,lowBody,cabin,roof,combustion:null,sampleSources:[osc,osc2],sampleGains:[g,g2],windNoise,windFilter,windGain};this.update(true);}catch(e){console.warn('[TDR2 engine] fallback failed',e);}}
 _targetRpm(kmh,throttle){const speedProgress=clamp(kmh/195,0,1),roadCarry=IDLE_RPM+Math.pow(speedProgress,.82)*3600,freeRev=IDLE_RPM+Math.pow(clamp(throttle,0,1),.72)*(REDLINE_RPM-IDLE_RPM);return clamp(Math.max(roadCarry,freeRev),IDLE_RPM,REDLINE_RPM);}
 update(force=false){
  if(!this.scene||this.scene._tdrEmbeddedReplay||!this.engineStarted)return;const perfNow=performance.now();if(!force&&perfNow-this._lastUpdate<UPDATE_MS)return;const elapsed=Math.max(UPDATE_MS,perfNow-this._lastUpdate||UPDATE_MS);this._lastUpdate=perfNow;if(!this._ctx||!this._nodes||this._ctx.state==='suspended')return;
  const bodyObj=this.scene.carBody?.body,speedPx=Math.hypot(Number(bodyObj?.velocity?.x||0),Number(bodyObj?.velocity?.y||0)),kmh=Math.max(0,pxpsToKmh(speedPx)),throttle=clamp(Number(this.scene.touch?.throttle||0),0,1),p=prefs(),target=this._targetRpm(kmh,throttle);
  let risePerSecond=2600+throttle*3300;const fallPerSecond=3100,maxStep=(this._rpm<target?risePerSecond:fallPerSecond)*(elapsed/1000);if(this._rpm<target)this._rpm=Math.min(target,this._rpm+maxStep);else this._rpm=Math.max(target,this._rpm-maxStep);
  const rpm01=clamp((this._rpm-IDLE_RPM)/(REDLINE_RPM-IDLE_RPM),0,1),speed01=clamp(kmh/180,0,1),coast=clamp((1-throttle)*rpm01*(kmh>8?1:0),0,1),load=clamp(throttle*.94+speed01*.06,0,1),n=this._nodes,now=this._ctx.currentTime;
  if(n.mode==='spark-samples'){
   const pos=rpm01*(n.sampleGains.length-1),base=Math.floor(pos),frac=pos-base;
   n.sampleGains.forEach((g,i)=>{let level=0;if(i===base)level=1-frac;if(i===Math.min(base+1,n.sampleGains.length-1))level=Math.max(level,frac);g.gain.setTargetAtTime(level*(.72+load*.18),now,.045);});
  }else if(n.mode==='vortex-sample'){
   const src=n.sampleSources[0],gain=n.sampleGains[0];src?.playbackRate?.setTargetAtTime?.(.62+rpm01*1.28,now,.045);gain?.gain?.setTargetAtTime?.(.62+load*.25-coast*.10,now,.055);
  }else{
   n.combustion?.parameters.get('rpm')?.setTargetAtTime(this._rpm,now,.055);n.combustion?.parameters.get('load')?.setTargetAtTime(load,now,.055);n.combustion?.parameters.get('coast')?.setTargetAtTime(coast,now,.070);n.combustion?.parameters.get('level')?.setTargetAtTime(.64+rpm01*.09,now,.070);
  }
  n.cabin.frequency.setTargetAtTime(420+rpm01*420,now,.12);n.cabin.gain.setTargetAtTime(1.8-rpm01*.5+load*.3,now,.12);n.lowBody.gain.setTargetAtTime(2.5-rpm01*.8,now,.12);n.roof.frequency.setTargetAtTime(4200+rpm01*3200+load*500,now,.10);n.windFilter.frequency.setTargetAtTime(1120+speed01*2450,now,.14);n.windGain.gain.setTargetAtTime(Math.pow(speed01,1.8)*.010*p.effects,now,.12);
  const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY',engineLevel=(.64+rpm01*.18+load*.10)*(preGrid?.72:1)*p.engine;n.engineBus.gain.setTargetAtTime(engineLevel,now,.06);n.master.gain.setTargetAtTime(p.mute?0:p.master*.82,now,.055);
 }
 destroy(){try{this._nodes?.windNoise?.stop?.();}catch{}for(const s of this._nodes?.sampleSources||[]){try{s.stop?.();}catch{}}try{this._nodes?.combustion?.disconnect?.();}catch{}try{this._ctx?.close?.();}catch{}this._nodes=null;this._graphPromise=null;this._ctx=null;this.scene=null;}
}

import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=120;
const VOLUME_EPSILON=.012;
const LOOP_FRACTION_START=.28;
const LOOP_FRACTION_END=.40;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    const a=s?.audio||{};
    return {master:clamp(Number(a.master??1),0,1),engine:clamp(Number(a.engine??1),0,1),mute:!!a.mute};
  }catch{return {master:1,engine:1,mute:false};}
}

function assetUrl(path){
  try{
    const base=String(import.meta.env?.BASE_URL||'/');
    return `${base.replace(/\/$/,'')}/${String(path).replace(/^\//,'')}`;
  }catch{return `/TopdownCraftrace/${String(path).replace(/^\//,'')}`;}
}

export class CarEngineSampleRuntime{
  constructor(scene){
    this.scene=scene;
    this.audio=new Audio();
    this.audio.src=assetUrl('assets/audio/cars/veloce_flash/engine/freesound_community-import-car-revs-on-chassis-dyno-with-turbo-66272.mp3');
    this.audio.loop=false;
    this.audio.preload='auto';
    this.audio.playsInline=true;
    this.audio.volume=0;
    this.audio.playbackRate=1;
    try{this.audio.preservesPitch=false;}catch{}
    try{this.audio.webkitPreservesPitch=false;}catch{}
    this.audio.setAttribute('playsinline','');
    this.audio.setAttribute('webkit-playsinline','');
    this.unlocked=false;
    this.engineStarted=false;
    this._lastUpdate=0;
    this._lastAppliedVolume=0;
    this._loopStart=0;
    this._loopEnd=0;
    this._loopReady=false;
    this._onLoadedMetadata=()=>this._prepareLoopWindow();
    this.audio.addEventListener('loadedmetadata',this._onLoadedMetadata);
    try{this.audio.load();}catch{}
  }

  _prepareLoopWindow(){
    const duration=Number(this.audio?.duration||0);
    if(!Number.isFinite(duration)||duration<=1)return;
    let start=duration*LOOP_FRACTION_START;
    let end=duration*LOOP_FRACTION_END;
    const minSpan=Math.min(2.2,Math.max(.8,duration*.08));
    if(end-start<minSpan)end=Math.min(duration-.15,start+minSpan);
    if(end<=start+.5){start=Math.max(.1,duration*.2);end=Math.min(duration-.1,start+Math.max(.8,duration*.12));}
    this._loopStart=clamp(start,0,Math.max(0,duration-.6));
    this._loopEnd=clamp(end,this._loopStart+.5,duration);
    this._loopReady=this._loopEnd>this._loopStart+.45;
  }

  _keepInsideLoop(){
    if(!this._loopReady||!this.audio)return;
    const t=Number(this.audio.currentTime||0);
    if(t<this._loopStart-.05||t>=this._loopEnd){
      try{this.audio.currentTime=this._loopStart;}catch{}
    }
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    if(!this._loopReady)this._prepareLoopWindow();
    try{
      this.audio.playbackRate=1;
      this.audio.volume=.03;
      this._lastAppliedVolume=.03;
      this.audio.currentTime=this._loopReady?this._loopStart:0;
      const p=this.audio.play();
      if(p?.catch)p.catch(()=>{});
    }catch{}
    this.update(true);
  }

  update(force=false){
    if(!this.scene||this.scene._tdrEmbeddedReplay)return;
    const now=performance.now();
    if(!force&&now-this._lastUpdate<UPDATE_MS)return;
    this._lastUpdate=now;
    const p=prefs();
    if(!this.engineStarted){
      try{if(this._lastAppliedVolume!==0){this.audio.volume=0;this._lastAppliedVolume=0;}}catch{}
      return;
    }

    this._keepInsideLoop();

    const body=this.scene.carBody?.body;
    const speedPx=Math.hypot(Number(body?.velocity?.x||0),Number(body?.velocity?.y||0));
    const kmh=Math.max(0,pxpsToKmh(speedPx));
    const throttle=clamp(Number(this.scene.touch?.throttle||0),0,1);
    const motion=clamp(kmh/120,0,1);
    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const targetVolume=clamp((p.mute?0:p.master*p.engine)*(.16+motion*.18+throttle*.22)*(preGrid?.72:1),0,.62);
    try{
      if(force||Math.abs(targetVolume-this._lastAppliedVolume)>=VOLUME_EPSILON){
        this.audio.volume=targetVolume;
        this._lastAppliedVolume=targetVolume;
      }
    }catch{}
  }

  destroy(){
    try{this.audio?.removeEventListener('loadedmetadata',this._onLoadedMetadata);}catch{}
    try{this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}catch{}
    this.audio=null;this.scene=null;
  }
}

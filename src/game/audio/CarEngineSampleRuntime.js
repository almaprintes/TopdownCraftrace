import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=120;
const RATE_EPSILON=.025;
const VOLUME_EPSILON=.012;
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
    this.audio.loop=true;
    this.audio.preload='auto';
    this.audio.playsInline=true;
    this.audio.volume=0;
    this.audio.playbackRate=.65;
    // Engine pitch should follow playback rate. Disabling pitch preservation also
    // avoids asking iOS/Safari to run real-time time-stretch DSP on every rate change.
    try{this.audio.preservesPitch=false;}catch{}
    try{this.audio.webkitPreservesPitch=false;}catch{}
    this.audio.setAttribute('playsinline','');
    this.audio.setAttribute('webkit-playsinline','');
    this.unlocked=false;
    this.engineStarted=false;
    this._lastUpdate=0;
    this._lastAppliedRate=.65;
    this._lastAppliedVolume=0;
    try{this.audio.load();}catch{}
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    try{
      this.audio.currentTime=0;
      this.audio.volume=.03;
      this.audio.playbackRate=.58;
      this._lastAppliedRate=.58;
      this._lastAppliedVolume=.03;
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
    const body=this.scene.carBody?.body;
    const speedPx=Math.hypot(Number(body?.velocity?.x||0),Number(body?.velocity?.y||0));
    const kmh=Math.max(0,pxpsToKmh(speedPx));
    const throttle=clamp(Number(this.scene.touch?.throttle||0),0,1);
    const low=clamp(kmh/15,0,1);
    const road=clamp((kmh-15)/145,0,1);
    const rpm=clamp(.06+low*.08+road*.68+throttle*.38,0,1);
    const targetRate=clamp(.58+rpm*.92,.58,1.5);
    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const targetVolume=clamp((p.mute?0:p.master*p.engine)*(.14+rpm*.30+throttle*.14)*(preGrid?.72:1),0,.66);
    try{
      const nextRate=this._lastAppliedRate+(targetRate-this._lastAppliedRate)*.34;
      if(force||Math.abs(nextRate-this._lastAppliedRate)>=RATE_EPSILON){
        this.audio.playbackRate=nextRate;
        this._lastAppliedRate=nextRate;
      }
      if(force||Math.abs(targetVolume-this._lastAppliedVolume)>=VOLUME_EPSILON){
        this.audio.volume=targetVolume;
        this._lastAppliedVolume=targetVolume;
      }
      // Do not keep calling play() from the race loop. The start button provides
      // the user gesture once; repeated play attempts under load are counterproductive on iOS.
    }catch{}
  }

  destroy(){
    try{this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}catch{}
    this.audio=null;this.scene=null;
  }
}

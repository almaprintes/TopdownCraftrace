import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
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
    this.audio.setAttribute('playsinline','');
    this.audio.setAttribute('webkit-playsinline','');
    this.unlocked=false;
    this.engineStarted=false;
    this._lastUpdate=0;
    try{this.audio.load();}catch{}
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    try{
      this.audio.currentTime=0;
      this.audio.volume=.03;
      this.audio.playbackRate=.58;
      const p=this.audio.play();
      if(p?.catch)p.catch(()=>{});
    }catch{}
    this.update(true);
  }

  update(force=false){
    if(!this.scene||this.scene._tdrEmbeddedReplay)return;
    const now=performance.now();
    if(!force&&now-this._lastUpdate<45)return;
    this._lastUpdate=now;
    const p=prefs();
    if(!this.engineStarted){
      try{this.audio.volume=0;}catch{}
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
    const targetVolume=(p.mute?0:p.master*p.engine)*(.14+rpm*.30+throttle*.14)*(preGrid?.72:1);
    try{
      this.audio.playbackRate=this.audio.playbackRate+(targetRate-this.audio.playbackRate)*.22;
      this.audio.volume=clamp(targetVolume,0,.66);
      if(this.unlocked&&this.audio.paused&&this.audio.volume>.001){const q=this.audio.play();if(q?.catch)q.catch(()=>{});}
    }catch{}
  }

  destroy(){
    try{this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}catch{}
    this.audio=null;this.scene=null;
  }
}

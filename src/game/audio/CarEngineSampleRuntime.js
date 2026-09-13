import { pxpsToKmh } from '../cars/speedUnits.js';

const SETTINGS_KEY='tdr2:settings';
const UPDATE_MS=120;
const VOLUME_EPSILON=.012;
const ZONES=[
  {start:.16,end:.23},
  {start:.31,end:.38},
  {start:.47,end:.54},
  {start:.63,end:.70},
];
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
    this._zoneWindows=[];
    this._zoneIndex=0;
    this._zonesReady=false;
    this._rpmState=.08;
    this._onLoadedMetadata=()=>this._prepareZoneWindows();
    this.audio.addEventListener('loadedmetadata',this._onLoadedMetadata);
    try{this.audio.load();}catch{}
  }

  _prepareZoneWindows(){
    const duration=Number(this.audio?.duration||0);
    if(!Number.isFinite(duration)||duration<=2)return;
    this._zoneWindows=ZONES.map(zone=>{
      let start=duration*zone.start;
      let end=duration*zone.end;
      const minSpan=Math.min(1.8,Math.max(.75,duration*.045));
      if(end-start<minSpan)end=Math.min(duration-.12,start+minSpan);
      start=clamp(start,.05,Math.max(.05,duration-.8));
      end=clamp(end,start+.55,duration-.05);
      return {start,end};
    });
    this._zonesReady=this._zoneWindows.length===ZONES.length&&this._zoneWindows.every(z=>z.end>z.start+.5);
  }

  _setZone(index,force=false){
    if(!this._zonesReady||!this.audio)return;
    const next=clamp(Math.round(index),0,this._zoneWindows.length-1);
    if(!force&&next===this._zoneIndex)return;
    this._zoneIndex=next;
    const zone=this._zoneWindows[next];
    try{this.audio.currentTime=zone.start;}catch{}
  }

  _keepInsideZone(){
    if(!this._zonesReady||!this.audio)return;
    const zone=this._zoneWindows[this._zoneIndex];
    if(!zone)return;
    const t=Number(this.audio.currentTime||0);
    if(t<zone.start-.05||t>=zone.end){
      try{this.audio.currentTime=zone.start;}catch{}
    }
  }

  startEngine(){
    this.engineStarted=true;
    this.unlocked=true;
    if(!this._zonesReady)this._prepareZoneWindows();
    try{
      this.audio.playbackRate=1;
      this.audio.volume=.03;
      this._lastAppliedVolume=.03;
      this._rpmState=.08;
      this._zoneIndex=0;
      if(this._zonesReady)this.audio.currentTime=this._zoneWindows[0].start;
      else this.audio.currentTime=0;
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
    const motion=clamp(kmh/150,0,1);

    // DEV 1.0.93: throttle is effectively digital on touch devices, so do not map
    // it directly to a zone. Maintain a virtual RPM state that rises/falls over time.
    // This makes 0 -> 1 throttle travel through low, mid-low, mid-high and high RPM
    // instead of jumping straight from idle to the highest sample.
    const speedFloor=.06+motion*.42;
    const throttleTarget=throttle>.05?clamp(.20+motion*.25+throttle*.55,0,1):speedFloor;
    const target=Math.max(speedFloor,throttleTarget);
    const rise=throttle>.05?.085:.035;
    const fall=.055;
    if(this._rpmState<target)this._rpmState=Math.min(target,this._rpmState+rise);
    else if(this._rpmState>target)this._rpmState=Math.max(target,this._rpmState-fall);
    this._rpmState=clamp(this._rpmState,.04,1);

    const nextZone=this._rpmState<.24?0:this._rpmState<.48?1:this._rpmState<.72?2:3;
    this._setZone(nextZone);
    this._keepInsideZone();

    const preGrid=this.scene._startState==='WAIT_ENGINE'||this.scene._startState==='READY';
    const targetVolume=clamp((p.mute?0:p.master*p.engine)*(.16+this._rpmState*.18+throttle*.18)*(preGrid?.72:1),0,.64);
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

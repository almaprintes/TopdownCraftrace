const SETTINGS_KEY='tdr2:settings';
const AUDIO_EVENT='tdr2:audio-settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return {
      master:clamp(Number(s?.audio?.master??1),0,1),
      music:clamp(Number(s?.audio?.music??1),0,1),
      mute:!!s?.audio?.mute
    };
  }catch{return {master:1,music:1,mute:false};}
}

function assetUrl(path){
  try{
    const base=String(import.meta.env?.BASE_URL||'/');
    return `${base.replace(/\/$/,'')}/${String(path).replace(/^\//,'')}`;
  }catch{
    return `/TopdownCraftrace/${String(path).replace(/^\//,'')}`;
  }
}

class MenuMusic {
  constructor(game){
    this.game=game;
    this.audio=new Audio();
    this.audio.src=assetUrl('assets/audio/turbo-carousel.mp3');
    this.audio.loop=true;
    this.audio.preload='auto';
    this.audio.volume=1;
    this.audio.muted=false;
    this.audio.playsInline=true;
    this.audio.setAttribute('playsinline','');
    this.audio.setAttribute('webkit-playsinline','');

    this.ctx=null;
    this.source=null;
    this.gain=null;
    this.unlocked=false;
    this.targetVolume=0;
    this.fadeTimer=null;

    this.unlock=()=>{
      this.unlocked=true;
      this._ensureGraph();
      try{if(this.ctx?.state==='suspended')this.ctx.resume();}catch{}
      if(this._isMenu())this._play();
      this._sync(true);
    };

    this.onAudioSettings=(ev)=>{
      const d=ev?.detail||{};
      const stored=prefs();
      const master=clamp(Number.isFinite(Number(d.master))?Number(d.master):stored.master,0,1);
      const music=clamp(Number.isFinite(Number(d.music))?Number(d.music):stored.music,0,1);
      const mute=typeof d.mute==='boolean'?d.mute:stored.mute;
      const desired=this._isMenu()&&!mute?master*music*.32:0;
      this._ensureGraph();
      this._setGain(desired,90);
      if(this._isMenu())this._play();
    };

    const opts={capture:true,passive:true};
    window.addEventListener('pointerup',this.unlock,opts);
    window.addEventListener('touchend',this.unlock,opts);
    window.addEventListener('click',this.unlock,opts);
    window.addEventListener('keydown',this.unlock,opts);
    window.addEventListener(AUDIO_EVENT,this.onAudioSettings);

    try{this.audio.load();}catch{}
    this.watch=setInterval(()=>this._sync(false),160);
    this._sync(false);
  }

  _ensureGraph(){
    if(this.gain||typeof window==='undefined')return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try{
      this.ctx=new AC();
      this.source=this.ctx.createMediaElementSource(this.audio);
      this.gain=this.ctx.createGain();
      this.gain.gain.value=0;
      this.source.connect(this.gain).connect(this.ctx.destination);
    }catch(e){
      console.warn('[TDR music] WebAudio graph failed',e);
      this.ctx=null;this.source=null;this.gain=null;
    }
  }

  _isMenu(){
    try{
      const active=this.game.scene.getScenes(true)||[];
      if(active.some(s=>String(s?.sys?.settings?.key||'').toLowerCase()==='race'))return false;
      return active.length>0;
    }catch{return false;}
  }

  _play(){
    if(!this.unlocked||!this._isMenu())return;
    this._ensureGraph();
    try{if(this.ctx?.state==='suspended')this.ctx.resume();}catch{}
    if(!this.audio.paused)return;
    try{const p=this.audio.play();if(p?.catch)p.catch(()=>{});}catch{}
  }

  _setGain(target,duration=120){
    target=clamp(target,0,1);
    this.targetVolume=target;
    this._ensureGraph();
    if(this.gain&&this.ctx){
      const now=this.ctx.currentTime;
      try{
        const param=this.gain.gain;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value,now);
        param.linearRampToValueAtTime(target,now+Math.max(.01,duration/1000));
      }catch{try{this.gain.gain.value=target;}catch{}}
      return;
    }
    // Fallback for browsers where MediaElementSource cannot be created.
    this.audio.volume=target;
  }

  _sync(force=false){
    const p=prefs();
    const menu=this._isMenu();
    const desired=menu&&!p.mute?p.master*p.music*.32:0;
    if(menu){
      this._play();
      if(force||Math.abs(this.targetVolume-desired)>.005)this._setGain(desired,120);
      return;
    }
    if(force||this.targetVolume!==0)this._setGain(0,100);
    // Only pause when leaving menu/race context, never because a volume slider hit zero.
    if(!menu&&this.audio.paused===false){
      setTimeout(()=>{if(!this._isMenu()){try{this.audio.pause();}catch{}}},130);
    }
  }

  destroy(){
    clearInterval(this.watch);clearInterval(this.fadeTimer);
    const opts={capture:true};
    window.removeEventListener('pointerup',this.unlock,opts);
    window.removeEventListener('touchend',this.unlock,opts);
    window.removeEventListener('click',this.unlock,opts);
    window.removeEventListener('keydown',this.unlock,opts);
    window.removeEventListener(AUDIO_EVENT,this.onAudioSettings);
    try{this.audio.pause();this.audio.src='';this.audio.load();}catch{}
    try{this.source?.disconnect?.();this.gain?.disconnect?.();this.ctx?.close?.();}catch{}
    this.source=null;this.gain=null;this.ctx=null;
  }
}

export function installMenuMusic(game){
  const mm=new MenuMusic(game);
  game.events.once('destroy',()=>mm.destroy());
  return mm;
}

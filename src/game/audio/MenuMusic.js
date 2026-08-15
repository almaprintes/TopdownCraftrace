const SETTINGS_KEY='tdr2:settings';
const AUDIO_EVENT='tdr2:audio-settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return {master:clamp(Number(s?.audio?.master??1),0,1),mute:!!s?.audio?.mute};
  }catch{return {master:1,mute:false};}
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
    this.audio.volume=0;
    this.audio.playsInline=true;
    this.audio.setAttribute('playsinline','');
    this.audio.setAttribute('webkit-playsinline','');
    this.targetVolume=0;
    this.unlocked=false;
    this.fadeTimer=null;
    this.pauseTimer=null;

    this.unlock=()=>{
      if(this.unlocked && !this.audio.paused){ this._sync(true); return; }
      this.unlocked=true;
      clearTimeout(this.pauseTimer);this.pauseTimer=null;
      const p=prefs();
      if(!this._isMenu()||p.mute){ this._sync(true); return; }
      try{
        this.audio.volume=Math.max(.01,Math.min(.03,p.master*.03));
        const playPromise=this.audio.play();
        if(playPromise?.then) playPromise.then(()=>this._sync(true)).catch(()=>{});
        else this._sync(true);
      }catch{}
    };

    this.onAudioSettings=(ev)=>{
      const d=ev?.detail||{};
      const master=clamp(Number.isFinite(Number(d.master))?Number(d.master):prefs().master,0,1);
      const mute=typeof d.mute==='boolean'?d.mute:prefs().mute;
      const desired=this._isMenu()&&!mute?master*.32:0;
      clearInterval(this.fadeTimer);this.fadeTimer=null;
      this.targetVolume=desired;
      this.audio.volume=desired;
      if(desired>0)this._play();
      else if(mute){try{this.audio.pause();}catch{}}
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

  _isMenu(){
    try{
      const active=this.game.scene.getScenes(true)||[];
      if(active.some(s=>String(s?.sys?.settings?.key||'').toLowerCase()==='race'))return false;
      return active.length>0;
    }catch{return false;}
  }

  _play(){
    if(!this.unlocked||!this.audio.paused)return;
    clearTimeout(this.pauseTimer);this.pauseTimer=null;
    try{const p=this.audio.play();if(p?.catch)p.catch(()=>{});}catch{}
  }

  _fadeTo(target,duration=220,onDone=null){
    target=clamp(target,0,1);
    this.targetVolume=target;
    clearInterval(this.fadeTimer);
    const start=Number(this.audio.volume||0);
    const started=performance.now();
    const tick=()=>{
      const k=clamp((performance.now()-started)/Math.max(1,duration),0,1);
      const eased=1-Math.pow(1-k,3);
      this.audio.volume=clamp(start+(target-start)*eased,0,1);
      if(k>=1){clearInterval(this.fadeTimer);this.fadeTimer=null;onDone?.();}
    };
    tick();this.fadeTimer=setInterval(tick,30);
  }

  _sync(force=false){
    const p=prefs();
    const menu=this._isMenu();
    const desired=menu&&!p.mute?p.master*.32:0;
    if(menu&&!p.mute){
      clearTimeout(this.pauseTimer);this.pauseTimer=null;
      this._play();
      if(force||Math.abs(this.audio.volume-desired)>.01)this._fadeTo(desired,220);
      return;
    }
    if(force||this.targetVolume!==0){
      this._fadeTo(0,180,()=>{
        if(!this._isMenu()||prefs().mute){try{this.audio.pause();}catch{}}
      });
    }
  }

  destroy(){
    clearInterval(this.watch);clearInterval(this.fadeTimer);clearTimeout(this.pauseTimer);
    const opts={capture:true};
    window.removeEventListener('pointerup',this.unlock,opts);
    window.removeEventListener('touchend',this.unlock,opts);
    window.removeEventListener('click',this.unlock,opts);
    window.removeEventListener('keydown',this.unlock,opts);
    window.removeEventListener(AUDIO_EVENT,this.onAudioSettings);
    try{this.audio.pause();this.audio.src='';this.audio.load();}catch{}
  }
}

export function installMenuMusic(game){
  const mm=new MenuMusic(game);
  game.events.once('destroy',()=>mm.destroy());
  return mm;
}

const SETTINGS_KEY='tdr2:settings';
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
    this.audio=new Audio(assetUrl('assets/audio/turbo-carousel.mp3'));
    this.audio.loop=true;
    this.audio.preload='auto';
    this.audio.volume=0;
    this.audio.playsInline=true;
    this.targetVolume=0;
    this.unlocked=false;
    this.fadeTimer=null;
    this.pauseTimer=null;

    this.unlock=()=>{
      this.unlocked=true;
      this._sync(true);
    };
    window.addEventListener('pointerdown',this.unlock,{passive:true});
    window.addEventListener('touchstart',this.unlock,{passive:true});
    window.addEventListener('keydown',this.unlock,{passive:true});

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
    try{
      const p=this.audio.play();
      if(p?.catch)p.catch(()=>{});
    }catch{}
  }

  _fadeTo(target,duration=420,onDone=null){
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
    tick();
    this.fadeTimer=setInterval(tick,30);
  }

  _sync(force=false){
    const p=prefs();
    const menu=this._isMenu();
    const desired=menu&&!p.mute?p.master*.32:0;

    if(menu&&!p.mute){
      clearTimeout(this.pauseTimer);this.pauseTimer=null;
      this._play();
      if(force||Math.abs(this.targetVolume-desired)>.015)this._fadeTo(desired,520);
      return;
    }

    if(force||this.targetVolume!==0){
      this._fadeTo(0,360,()=>{
        if(!this._isMenu()||prefs().mute){
          try{this.audio.pause();}catch{}
        }
      });
    }
  }

  destroy(){
    clearInterval(this.watch);
    clearInterval(this.fadeTimer);
    clearTimeout(this.pauseTimer);
    window.removeEventListener('pointerdown',this.unlock);
    window.removeEventListener('touchstart',this.unlock);
    window.removeEventListener('keydown',this.unlock);
    try{this.audio.pause();this.audio.src='';this.audio.load();}catch{}
  }
}

export function installMenuMusic(game){
  const mm=new MenuMusic(game);
  game.events.once('destroy',()=>mm.destroy());
  return mm;
}

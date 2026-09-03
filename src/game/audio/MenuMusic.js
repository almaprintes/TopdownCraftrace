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
    this.url=assetUrl('assets/audio/turbo-carousel.mp3');
    this.ctx=null;
    this.gain=null;
    this.buffer=null;
    this.source=null;
    this.loading=null;
    this.unlocked=false;
    this.targetVolume=0;

    // Last-resort fallback for browsers without Web Audio.
    this.fallback=null;

    this.unlock=()=>{
      this.unlocked=true;
      this._ensureContext();
      try{if(this.ctx?.state==='suspended')this.ctx.resume();}catch{}
      this._ensurePlaying();
      this._sync(true);
    };

    this.onAudioSettings=(ev)=>{
      const d=ev?.detail||{};
      const stored=prefs();
      const master=clamp(Number.isFinite(Number(d.master))?Number(d.master):stored.master,0,1);
      const music=clamp(Number.isFinite(Number(d.music))?Number(d.music):stored.music,0,1);
      const mute=typeof d.mute==='boolean'?d.mute:stored.mute;
      const desired=this._isMenu()&&!mute?master*music*.32:0;
      this.targetVolume=desired;
      this._ensurePlaying();
      this._setGain(desired,70);
    };

    const opts={capture:true,passive:true};
    window.addEventListener('pointerup',this.unlock,opts);
    window.addEventListener('touchend',this.unlock,opts);
    window.addEventListener('click',this.unlock,opts);
    window.addEventListener('keydown',this.unlock,opts);
    window.addEventListener(AUDIO_EVENT,this.onAudioSettings);

    this.watch=setInterval(()=>this._sync(false),180);
    this._sync(false);
  }

  _isMenu(){
    try{
      const active=this.game.scene.getScenes(true)||[];
      if(active.some(s=>String(s?.sys?.settings?.key||'').toLowerCase()==='race'))return false;
      return active.length>0;
    }catch{return false;}
  }

  _ensureContext(){
    if(this.ctx||typeof window==='undefined')return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC){this._ensureFallback();return;}
    try{
      this.ctx=new AC();
      this.gain=this.ctx.createGain();
      this.gain.gain.value=0;
      this.gain.connect(this.ctx.destination);
    }catch{
      this.ctx=null;this.gain=null;
      this._ensureFallback();
    }
  }

  _ensureFallback(){
    if(this.fallback)return;
    try{
      const a=new Audio(this.url);
      a.loop=true;a.preload='auto';a.playsInline=true;a.volume=0;
      a.setAttribute('playsinline','');a.setAttribute('webkit-playsinline','');
      this.fallback=a;
    }catch{}
  }

  async _loadBuffer(){
    if(this.buffer)return this.buffer;
    if(this.loading)return this.loading;
    this._ensureContext();
    if(!this.ctx)return null;
    this.loading=(async()=>{
      try{
        const res=await fetch(this.url,{cache:'force-cache'});
        if(!res.ok)throw new Error(`music fetch ${res.status}`);
        const raw=await res.arrayBuffer();
        const decoded=await this.ctx.decodeAudioData(raw.slice(0));
        this.buffer=decoded;
        return decoded;
      }catch(err){
        console.warn('[TDR music] buffer load failed',err);
        return null;
      }finally{this.loading=null;}
    })();
    return this.loading;
  }

  _startBufferSource(){
    if(!this.ctx||!this.gain||!this.buffer||this.source)return;
    try{
      const src=this.ctx.createBufferSource();
      src.buffer=this.buffer;
      src.loop=true;
      src.connect(this.gain);
      src.start(0);
      src.onended=()=>{if(this.source===src)this.source=null;};
      this.source=src;
    }catch(err){console.warn('[TDR music] source start failed',err);}
  }

  _ensurePlaying(){
    if(!this.unlocked||!this._isMenu())return;
    this._ensureContext();
    if(this.ctx){
      try{if(this.ctx.state==='suspended')this.ctx.resume();}catch{}
      if(this.buffer){this._startBufferSource();return;}
      this._loadBuffer().then(buf=>{if(buf&&this.unlocked&&this._isMenu()){this._startBufferSource();this._setGain(this.targetVolume,50);}});
      return;
    }
    this._ensureFallback();
    if(this.fallback?.paused){try{const p=this.fallback.play();if(p?.catch)p.catch(()=>{});}catch{}}
  }

  _setGain(target,duration=100){
    target=clamp(target,0,1);
    this.targetVolume=target;
    if(this.gain&&this.ctx){
      const now=this.ctx.currentTime;
      try{
        const p=this.gain.gain;
        p.cancelScheduledValues(now);
        p.setValueAtTime(p.value,now);
        p.linearRampToValueAtTime(target,now+Math.max(.01,duration/1000));
      }catch{try{this.gain.gain.value=target;}catch{}}
      return;
    }
    // Fallback only; iOS should use AudioBuffer + GainNode above.
    if(this.fallback)try{this.fallback.volume=target;}catch{}
  }

  _stopPlayback(){
    if(this.source){try{this.source.stop(0);}catch{}try{this.source.disconnect();}catch{}this.source=null;}
    if(this.fallback&&!this.fallback.paused){try{this.fallback.pause();}catch{}}
  }

  _sync(force=false){
    const p=prefs();
    const menu=this._isMenu();
    const desired=menu&&!p.mute?p.master*p.music*.32:0;
    if(menu){
      this._ensurePlaying();
      if(force||Math.abs(this.targetVolume-desired)>.004)this._setGain(desired,90);
      return;
    }
    if(force||this.targetVolume!==0)this._setGain(0,80);
    // Stop only because we left menu context, never because slider reached zero.
    if(!menu)setTimeout(()=>{if(!this._isMenu())this._stopPlayback();},100);
  }

  destroy(){
    clearInterval(this.watch);
    const opts={capture:true};
    window.removeEventListener('pointerup',this.unlock,opts);
    window.removeEventListener('touchend',this.unlock,opts);
    window.removeEventListener('click',this.unlock,opts);
    window.removeEventListener('keydown',this.unlock,opts);
    window.removeEventListener(AUDIO_EVENT,this.onAudioSettings);
    this._stopPlayback();
    if(this.fallback){try{this.fallback.src='';this.fallback.load();}catch{}}
    try{this.gain?.disconnect?.();this.ctx?.close?.();}catch{}
    this.gain=null;this.ctx=null;this.buffer=null;this.fallback=null;
  }
}

export function installMenuMusic(game){
  const mm=new MenuMusic(game);
  game.events.once('destroy',()=>mm.destroy());
  return mm;
}

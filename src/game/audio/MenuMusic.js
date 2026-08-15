const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return {master:clamp(Number(s?.audio?.master??1),0,1),mute:!!s?.audio?.mute};
  }catch{return {master:1,mute:false};}
}

class MenuMusic {
  constructor(game){
    this.game=game;this.ctx=null;this.master=null;this.timer=null;this.step=0;this.started=false;
    this.unlock=()=>this._ensure();
    window.addEventListener('pointerdown',this.unlock,{passive:true});
    window.addEventListener('touchstart',this.unlock,{passive:true});
    window.addEventListener('keydown',this.unlock,{passive:true});
    this.watch=setInterval(()=>this._sync(),180);
  }
  _ensure(){
    if(this.ctx){try{if(this.ctx.state==='suspended')this.ctx.resume();}catch{};return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);this.ctx.resume();}catch{}
  }
  _isMenu(){
    try{
      const active=this.game.scene.getScenes(true)||[];
      if(active.some(s=>String(s?.sys?.settings?.key||'').toLowerCase()==='race'))return false;
      return active.length>0;
    }catch{return false;}
  }
  _sync(){
    this._ensure();if(!this.ctx||!this.master)return;
    const p=prefs(),menu=this._isMenu();
    const target=menu&&!p.mute?p.master*.115:0;
    this.master.gain.setTargetAtTime(target,this.ctx.currentTime,.32);
    if(menu&&!this.started)this._start();
  }
  _start(){
    this.started=true;this.step=0;
    const tick=()=>{
      if(!this.ctx)return;
      const now=this.ctx.currentTime;
      // Warm, restrained synth bed: D minor pentatonic, deliberately non-melodic.
      const roots=[146.83,146.83,174.61,130.81,146.83,196.00,174.61,130.81];
      const root=roots[this.step%roots.length];
      this._pad(root,now,3.6);
      if(this.step%2===0)this._pluck(root*2,now+.22);
      if(this.step%4===2)this._pluck(root*2.4,now+1.05);
      this.step++;
    };
    tick();this.timer=setInterval(tick,3200);
  }
  _pad(freq,when,dur){
    const ctx=this.ctx;if(!ctx)return;
    const bus=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=760;filter.Q.value=.5;
    bus.gain.setValueAtTime(.0001,when);bus.gain.exponentialRampToValueAtTime(.17,when+.55);bus.gain.exponentialRampToValueAtTime(.0001,when+dur);
    bus.connect(filter).connect(this.master);
    [1,.5,1.5].forEach((m,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i===0?'triangle':'sine';o.frequency.value=freq*m;o.detune.value=i===1?-7:i===2?5:0;g.gain.value=i===0?.52:.19;o.connect(g).connect(bus);o.start(when);o.stop(when+dur+.05);});
  }
  _pluck(freq,when){
    const ctx=this.ctx;if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='triangle';o.frequency.value=freq;f.type='lowpass';f.frequency.value=1350;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.085,when+.015);g.gain.exponentialRampToValueAtTime(.0001,when+.7);o.connect(f).connect(g).connect(this.master);o.start(when);o.stop(when+.72);
  }
  destroy(){clearInterval(this.watch);clearInterval(this.timer);window.removeEventListener('pointerdown',this.unlock);window.removeEventListener('touchstart',this.unlock);window.removeEventListener('keydown',this.unlock);try{this.ctx?.close?.();}catch{}}
}

export function installMenuMusic(game){
  const mm=new MenuMusic(game);game.events.once('destroy',()=>mm.destroy());return mm;
}

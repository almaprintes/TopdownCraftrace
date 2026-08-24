import Phaser from 'phaser';

const STORAGE_KEY='tdr2:settings';
const AUDIO_EVENT='tdr2:audio-settings';

const defaults={
  controls:{scheme:'touch',steeringMode:'stick',sensitivity:1,deadZone:.1,invertSteer:false,leftHanded:false},
  video:{quality:'high',targetFps:60,showFPS:false,particles:true,renderScale:'normal'},
  audio:{master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false}
};

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      ...raw,
      controls:{...defaults.controls,...(raw.controls||{})},
      video:{...defaults.video,...(raw.video||{})},
      audio:{...defaults.audio,...(raw.audio||{})}
    };
  }catch{return structuredClone(defaults);}
}
function save(s){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s));}catch{}
  try{window.dispatchEvent(new CustomEvent(AUDIO_EVENT,{detail:{...(s.audio||{})}}));}catch{}
}

export class SettingsScene extends Phaser.Scene{
  constructor(){super({key:'SettingsScene'});this.settings=null;this.root=null;this._videoDirty=false;}
  init(){this.settings=load();}
  create(){
    this.cameras.main.setBackgroundColor('#071018');
    this._mount();
    this.events.once('shutdown',()=>this._unmount());
  }
  _mount(){
    this._unmount();
    const style=document.createElement('style');
    style.id='tdr-settings2-style';
    style.textContent=`
      #tdr-settings2{position:fixed;inset:0;z-index:9000;background:radial-gradient(circle at 50% -15%,rgba(42,255,136,.09),transparent 38%),linear-gradient(180deg,#071018,#090d17 70%);color:#fff;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;display:flex;flex-direction:column;box-sizing:border-box;padding:max(14px,2vh) max(18px,2.2vw);user-select:none;-webkit-user-select:none}
      #tdr-settings2 *{box-sizing:border-box}.s2top{height:54px;display:flex;align-items:center;gap:16px;flex:none}.s2back{border:1px solid rgba(180,205,255,.22);background:rgba(18,26,42,.84);color:#fff;border-radius:14px;padding:11px 16px;font-weight:800}.s2title{font-size:clamp(20px,2.2vw,30px);font-weight:950;letter-spacing:.06em}.s2save{margin-left:auto;color:#51f59a;font-size:12px;font-weight:850;opacity:.9}.s2tabs{display:flex;gap:10px;margin:10px 0 14px;flex:none}.s2tab{min-width:150px;padding:12px 18px;border-radius:14px;border:1px solid rgba(180,205,255,.17);background:rgba(14,21,35,.76);color:#bfc9df;font-weight:900;letter-spacing:.04em}.s2tab.on{color:#70ffad;border-color:rgba(74,255,151,.58);background:linear-gradient(180deg,rgba(26,71,56,.92),rgba(13,38,32,.92));box-shadow:0 0 24px rgba(55,255,148,.08)}.s2body{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 18px}.s2grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.s2card{border:1px solid rgba(180,205,255,.14);background:linear-gradient(145deg,rgba(20,29,45,.94),rgba(10,16,28,.94));border-radius:18px;padding:15px 16px;min-height:92px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.s2card.wide{grid-column:1/-1}.s2label{font-size:13px;font-weight:900;letter-spacing:.05em}.s2desc{font-size:11px;color:#98a7c2;margin-top:5px;line-height:1.35}.s2row{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}.s2choice{border:1px solid rgba(180,205,255,.18);background:#101828;color:#c7d1e6;border-radius:12px;padding:10px 14px;font-size:11px;font-weight:900}.s2choice.on{border-color:#42f795;color:#71ffb2;background:#123a2e}.s2switch{margin-left:auto;width:56px;height:30px;border-radius:999px;border:1px solid rgba(180,205,255,.25);background:#151d2d;padding:3px;display:flex;align-items:center}.s2switch i{width:22px;height:22px;border-radius:50%;background:#d9e3f3;display:block;transition:transform .12s}.s2switch.on{background:#1a7c50;border-color:#42f795}.s2switch.on i{transform:translateX(25px);background:#fff}.s2range{width:min(420px,72vw);accent-color:#45f596}.s2val{min-width:48px;text-align:right;font-size:11px;font-weight:900;color:#70ffad}.s2apply{margin-left:auto;border:1px solid rgba(74,255,151,.55);background:#164d38;color:#7cffb8;border-radius:13px;padding:10px 15px;font-weight:950}.s2apply[hidden]{display:none}.s2note{font-size:10px;color:#7f8ca5;margin-left:auto}.s2danger{border-color:rgba(255,96,116,.22)}@media(max-width:760px){#tdr-settings2{padding:10px 12px}.s2top{height:46px}.s2tabs{margin:7px 0 10px}.s2tab{min-width:110px;padding:9px 12px}.s2grid{gap:8px}.s2card{padding:11px 12px;min-height:78px}.s2row{margin-top:9px}.s2choice{padding:8px 10px}}
    `;
    document.head.appendChild(style);
    const root=document.createElement('div');root.id='tdr-settings2';this.root=root;
    root.innerHTML=`<div class="s2top"><button class="s2back">← VOLVER</button><div class="s2title">CONFIGURACIÓN 2.0</div><div class="s2save">Guardado automático ✓</div></div><div class="s2tabs"><button class="s2tab on" data-tab="controls">CONTROLES</button><button class="s2tab" data-tab="video">VÍDEO</button><button class="s2tab" data-tab="audio">AUDIO</button></div><div class="s2body"></div>`;
    document.body.appendChild(root);
    root.querySelector('.s2back').onclick=()=>this.scene.start('menu');
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>this._renderTab(b.dataset.tab));
    this._renderTab('controls');
  }
  _unmount(){try{this.root?.remove();}catch{}this.root=null;try{document.getElementById('tdr-settings2-style')?.remove();}catch{}}
  _set(path,val,rerender=false){const [a,b]=path;this.settings[a][b]=val;save(this.settings);if(rerender)this._renderTab(a==='audio'?'audio':a==='video'?'video':'controls');}
  _toggleEl(el,val){el.classList.toggle('on',!!val);}
  _switch(card,path){const sw=card.querySelector('.s2switch');sw.onclick=()=>{const [a,b]=path;this._set(path,!this.settings[a][b]);this._toggleEl(sw,this.settings[a][b]);};}
  _choiceWrap(items,current,onPick){return items.map(([v,l])=>`<button class="s2choice ${current===v?'on':''}" data-v="${v}">${l}</button>`).join('');}
  _renderTab(tab){
    if(!this.root)return;this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
    const body=this.root.querySelector('.s2body');const c=this.settings.controls,v=this.settings.video,a=this.settings.audio;
    if(tab==='controls'){
      body.innerHTML=`<div class="s2grid">
        <section class="s2card wide"><div class="s2label">MODO DE DIRECCIÓN</div><div class="s2desc">Elige el control principal para conducir.</div><div class="s2row" data-choice="steer">${this._choiceWrap([['stick','◉ PALANCA'],['buttons','◀ ▶ BOTONES'],['gamepad','🎮 MANDO']],c.steeringMode)}</div></section>
        <section class="s2card"><div class="s2label">MODO ZURDO</div><div class="s2desc">Intercambia dirección y pedales de lado.</div><div class="s2row"><span class="s2note">Dirección derecha · Gas/freno izquierda</span><button class="s2switch ${c.leftHanded?'on':''}"><i></i></button></div></section>
        <section class="s2card"><div class="s2label">INVERTIR DIRECCIÓN</div><div class="s2desc">Invierte izquierda y derecha.</div><div class="s2row"><button class="s2switch ${c.invertSteer?'on':''}"><i></i></button></div></section>
        <section class="s2card wide"><div class="s2label">SENSIBILIDAD</div><div class="s2desc">Respuesta de la dirección táctil.</div><div class="s2row"><input class="s2range" type="range" min="0.4" max="1.4" step="0.05" value="${c.sensitivity}"><span class="s2val">${Math.round(c.sensitivity*100)}%</span></div></section>
      </div>`;
      body.querySelector('[data-choice="steer"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;c.steeringMode=b.dataset.v;c.scheme=c.steeringMode==='gamepad'?'gamepad':'touch';save(this.settings);this._renderTab('controls');};
      this._switch(body.querySelectorAll('.s2card')[1],['controls','leftHanded']);this._switch(body.querySelectorAll('.s2card')[2],['controls','invertSteer']);
      const r=body.querySelector('.s2range'),val=body.querySelector('.s2val');r.oninput=()=>{c.sensitivity=Number(r.value);val.textContent=`${Math.round(c.sensitivity*100)}%`;save(this.settings);};
    }
    if(tab==='video'){
      body.innerHTML=`<div class="s2grid">
        <section class="s2card"><div class="s2label">FPS OBJETIVO</div><div class="s2desc">Se aplica al reiniciar el motor gráfico.</div><div class="s2row" data-choice="fps">${this._choiceWrap([[30,'30 FPS'],[60,'60 FPS']],Number(v.targetFps))}</div></section>
        <section class="s2card"><div class="s2label">CALIDAD</div><div class="s2desc">Perfil general de render.</div><div class="s2row" data-choice="quality">${this._choiceWrap([['low','BAJA'],['medium','MEDIA'],['high','ALTA']],v.quality)}</div></section>
        <section class="s2card"><div class="s2label">MOSTRAR FPS</div><div class="s2desc">Contador de rendimiento durante la carrera.</div><div class="s2row"><button class="s2switch ${v.showFPS?'on':''}"><i></i></button></div></section>
        <section class="s2card"><div class="s2label">PARTÍCULAS</div><div class="s2desc">Efectos secundarios de carrera.</div><div class="s2row"><button class="s2switch ${v.particles?'on':''}"><i></i></button></div></section>
        <section class="s2card wide"><div class="s2label">ESCALA DE RENDER</div><div class="s2desc">Ahorro reduce carga; Nítida aumenta definición.</div><div class="s2row" data-choice="render">${this._choiceWrap([['eco','AHORRO'],['normal','NORMAL'],['sharp','NÍTIDA']],v.renderScale)}<button class="s2apply" ${this._videoDirty?'':'hidden'}>APLICAR Y REINICIAR</button></div></section>
      </div>`;
      const dirty=()=>{this._videoDirty=true;body.querySelector('.s2apply').hidden=false;save(this.settings);};
      body.querySelector('[data-choice="fps"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;v.targetFps=Number(b.dataset.v);dirty();this._renderTab('video');};
      body.querySelector('[data-choice="quality"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;v.quality=b.dataset.v;dirty();this._renderTab('video');};
      body.querySelector('[data-choice="render"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;v.renderScale=b.dataset.v;dirty();this._renderTab('video');};
      this._switch(body.querySelectorAll('.s2card')[2],['video','showFPS']);this._switch(body.querySelectorAll('.s2card')[3],['video','particles']);
      body.querySelector('.s2apply').onclick=()=>{save(this.settings);window.location.reload();};
    }
    if(tab==='audio'){
      body.innerHTML=`<div class="s2grid">
        <section class="s2card"><div class="s2label">MODO SILENCIO</div><div class="s2desc">Apaga todo el audio.</div><div class="s2row"><button class="s2switch ${a.mute?'on':''}"><i></i></button></div></section>
        ${[['master','VOLUMEN GENERAL'],['engine','MOTOR'],['effects','EFECTOS'],['impacts','IMPACTOS']].map(([k,l])=>`<section class="s2card"><div class="s2label">${l}</div><div class="s2row"><input class="s2range" data-a="${k}" type="range" min="0" max="1" step="0.02" value="${a[k]}"><span class="s2val">${Math.round(a[k]*100)}%</span></div></section>`).join('')}
        <section class="s2card wide"><div class="s2label">PERFIL DE MOTOR</div><div class="s2row" data-choice="profile">${this._choiceWrap([['per_car','POR COCHE'],['forge','FORGE'],['avenir','AVENIR'],['crown','CROWN']],a.profile)}</div></section>
      </div>`;
      this._switch(body.querySelector('.s2card'),['audio','mute']);
      body.querySelectorAll('[data-a]').forEach(r=>r.oninput=()=>{a[r.dataset.a]=Number(r.value);r.nextElementSibling.textContent=`${Math.round(a[r.dataset.a]*100)}%`;save(this.settings);});
      body.querySelector('[data-choice="profile"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;a.profile=b.dataset.v;save(this.settings);this._renderTab('audio');};
    }
  }
}

import Phaser from 'phaser';
import { defaultControlLayout, saveControlLayout, resetControlLayout, sanitizeLayoutPoint } from '../controls/controlLayout.js';

const STORAGE_KEY='tdr2:settings';
const AUDIO_EVENT='tdr2:audio-settings';

const defaults={
  controls:{scheme:'touch',steeringMode:'stick',sensitivity:1,deadZone:.1,invertSteer:false,leftHanded:false,layouts:{}},
  video:{quality:'high',targetFps:60,showFPS:false,particles:true,renderScale:'normal'},
  audio:{master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false}
};

function load(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {
      ...raw,
      controls:{...defaults.controls,...(raw.controls||{}),layouts:{...(raw.controls?.layouts||{})}},
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
  constructor(){super({key:'SettingsScene'});this.settings=null;this.root=null;this._videoDirty=false;this._calRoot=null;this._calLayout=null;this._calSelected=null;this._calTesting=false;}
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
      #tdr-settings2 *{box-sizing:border-box}.s2top{height:54px;display:flex;align-items:center;gap:16px;flex:none}.s2back{border:1px solid rgba(180,205,255,.22);background:rgba(18,26,42,.84);color:#fff;border-radius:14px;padding:11px 16px;font-weight:800}.s2title{font-size:clamp(20px,2.2vw,30px);font-weight:950;letter-spacing:.06em}.s2save{margin-left:auto;color:#51f59a;font-size:12px;font-weight:850;opacity:.9}.s2tabs{display:flex;gap:10px;margin:10px 0 14px;flex:none}.s2tab{min-width:150px;padding:12px 18px;border-radius:14px;border:1px solid rgba(180,205,255,.17);background:rgba(14,21,35,.76);color:#bfc9df;font-weight:900;letter-spacing:.04em}.s2tab.on{color:#70ffad;border-color:rgba(74,255,151,.58);background:linear-gradient(180deg,rgba(26,71,56,.92),rgba(13,38,32,.92));box-shadow:0 0 24px rgba(55,255,148,.08)}.s2body{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 18px}.s2grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.s2card{border:1px solid rgba(180,205,255,.14);background:linear-gradient(145deg,rgba(20,29,45,.94),rgba(10,16,28,.94));border-radius:18px;padding:15px 16px;min-height:92px;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}.s2card.wide{grid-column:1/-1}.s2label{font-size:13px;font-weight:900;letter-spacing:.05em}.s2desc{font-size:11px;color:#98a7c2;margin-top:5px;line-height:1.35}.s2row{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}.s2choice{border:1px solid rgba(180,205,255,.18);background:#101828;color:#c7d1e6;border-radius:12px;padding:10px 14px;font-size:11px;font-weight:900}.s2choice.on{border-color:#42f795;color:#71ffb2;background:#123a2e}.s2switch{margin-left:auto;width:56px;height:30px;border-radius:999px;border:1px solid rgba(180,205,255,.25);background:#151d2d;padding:3px;display:flex;align-items:center}.s2switch i{width:22px;height:22px;border-radius:50%;background:#d9e3f3;display:block;transition:transform .12s}.s2switch.on{background:#1a7c50;border-color:#42f795}.s2switch.on i{transform:translateX(25px);background:#fff}.s2range{width:min(420px,72vw);accent-color:#45f596}.s2val{min-width:48px;text-align:right;font-size:11px;font-weight:900;color:#70ffad}.s2apply{margin-left:auto;border:1px solid rgba(74,255,151,.55);background:#164d38;color:#7cffb8;border-radius:13px;padding:10px 15px;font-weight:950}.s2apply[hidden]{display:none}.s2note{font-size:10px;color:#7f8ca5;margin-left:auto}.s2cta{border:1px solid rgba(77,255,157,.62);background:linear-gradient(180deg,#1a6144,#113c2d);color:#8affc0;border-radius:13px;padding:11px 15px;font-weight:950;letter-spacing:.04em}.s2danger{border-color:rgba(255,96,116,.22)}
      #tdr-control-cal{position:fixed;inset:0;z-index:12000;background:#091014;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;overflow:hidden}
      #tdr-control-cal .ccgame{position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.06),transparent 28%),repeating-linear-gradient(92deg,#182023 0 42px,#1b2426 42px 84px)}
      #tdr-control-cal .ccroad{position:absolute;left:-5%;top:30%;width:110%;height:42%;background:linear-gradient(180deg,#34383a,#202426 50%,#303536);transform:rotate(-3deg);box-shadow:0 0 0 7px #65715c,0 0 0 20px #233926}
      #tdr-control-cal .cccar{position:absolute;left:49%;top:49%;width:42px;height:76px;border-radius:12px 12px 7px 7px;background:linear-gradient(90deg,#111,#e8edf2 20% 80%,#111);transform:translate(-50%,-50%) rotate(-3deg);box-shadow:0 8px 18px #0008}
      #tdr-control-cal .ccprotected{position:absolute;border:1px dashed rgba(255,88,110,.54);background:rgba(255,55,79,.08);color:#ff9aac;font-size:9px;font-weight:900;letter-spacing:.08em;display:flex;align-items:center;justify-content:center;pointer-events:none}
      #tdr-control-cal .ccp1{left:2%;top:3%;width:20%;height:18%}#tdr-control-cal .ccp2{right:2%;top:3%;width:25%;height:26%}#tdr-control-cal .ccp3{left:38%;top:2%;width:24%;height:14%}
      #tdr-control-cal .cctop{position:absolute;left:0;right:0;top:0;height:58px;z-index:20;display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(180deg,rgba(4,9,14,.94),rgba(4,9,14,.45),transparent)}
      #tdr-control-cal .cctitle{font-weight:1000;letter-spacing:.08em}.ccspacer{flex:1}.ccbtn{border:1px solid #ffffff2a;background:#101b25;color:#fff;border-radius:12px;padding:9px 12px;font-size:11px;font-weight:900}.ccbtn.good{border-color:#42f79588;background:#174b36;color:#7cffb8}.ccbtn.warn{border-color:#ffb04b66;color:#ffd295}.cchelp{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:20;background:#071018dd;border:1px solid #ffffff25;border-radius:999px;padding:8px 14px;color:#b8c7dc;font-size:10px;font-weight:800;white-space:nowrap}
      .cccontrol{position:absolute;z-index:10;display:flex;align-items:center;justify-content:center;touch-action:none;transform:translate(-50%,-50%);filter:drop-shadow(0 6px 12px #0008)}.cccontrol.edit{outline:2px solid #6cffad;border-radius:16px}.cccontrol.selected{outline:3px solid #fff;box-shadow:0 0 0 5px #42f79555;border-radius:16px}.cccontrol.invalid{outline-color:#ff5570!important;background:#ff335522!important}.cccontrol .ccname{position:absolute;left:50%;bottom:calc(100% + 5px);transform:translateX(-50%);font:900 9px system-ui;color:#a9ffd0;white-space:nowrap;text-shadow:0 1px 4px #000}.ccstick,.ccwheel{width:145px;height:145px;border-radius:50%;border:5px solid #bfeaff66;background:radial-gradient(circle,#bfeaff 0 18%,#1c4255 19% 33%,#10232c 34% 63%,#66d8ff33 64% 100%)}.ccwheel{background:url('assets/ui/tdr_steering_wheel_nissan.webp?v=1') center/contain no-repeat;border:0}.ccpedal{width:90px;height:145px;clip-path:polygon(6% 0,94% 0,100% 100%,0 100%);background:linear-gradient(180deg,#183228dd,#08100ddd);border:2px solid #54ff9c;color:#fff;font-weight:1000;writing-mode:vertical-rl;text-orientation:upright;letter-spacing:.1em}.ccpedal.brake{border-color:#ff6478;background:linear-gradient(180deg,#3a1920dd,#10080add)}.cchand{width:78px;height:115px;background:url('assets/ui/tdr_handbrake_idle.webp?v=3') center/100% 100% no-repeat}.ccdir{width:110px;height:95px;border:2px solid #67cfff99;border-radius:16px;background:#07131ecf;color:#fff;font-size:38px;font-weight:1000}.ccscale{position:absolute;right:12px;bottom:62px;z-index:21;display:none;gap:6px;align-items:center;background:#071018e8;border:1px solid #ffffff28;border-radius:14px;padding:7px}.ccscale.on{display:flex}.ccscale span{font-size:10px;font-weight:950;color:#71ffb2;min-width:42px;text-align:center}
      @media(max-width:760px){#tdr-settings2{padding:10px 12px}.s2top{height:46px}.s2tabs{margin:7px 0 10px}.s2tab{min-width:110px;padding:9px 12px}.s2grid{gap:8px}.s2card{padding:11px 12px;min-height:78px}.s2row{margin-top:9px}.s2choice{padding:8px 10px}}
    `;
    document.head.appendChild(style);
    const root=document.createElement('div');root.id='tdr-settings2';this.root=root;
    root.innerHTML=`<div class="s2top"><button class="s2back">← VOLVER</button><div class="s2title">CONFIGURACIÓN 2.0</div><div class="s2save">Guardado automático ✓</div></div><div class="s2tabs"><button class="s2tab on" data-tab="controls">CONTROLES</button><button class="s2tab" data-tab="video">VÍDEO</button><button class="s2tab" data-tab="audio">AUDIO</button></div><div class="s2body"></div>`;
    document.body.appendChild(root);
    root.querySelector('.s2back').onclick=()=>this.scene.start('menu');
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>this._renderTab(b.dataset.tab));
    this._renderTab('controls');
  }
  _unmount(){this._closeCalibration();try{this.root?.remove();}catch{}this.root=null;try{document.getElementById('tdr-settings2-style')?.remove();}catch{}}
  _set(path,val,rerender=false){const [a,b]=path;this.settings[a][b]=val;save(this.settings);if(rerender)this._renderTab(a==='audio'?'audio':a==='video'?'video':'controls');}
  _toggleEl(el,val){el.classList.toggle('on',!!val);}
  _switch(card,path){const sw=card.querySelector('.s2switch');sw.onclick=()=>{const [a,b]=path;this._set(path,!this.settings[a][b]);this._toggleEl(sw,this.settings[a][b]);};}
  _choiceWrap(items,current){return items.map(([v,l])=>`<button class="s2choice ${current===v?'on':''}" data-v="${v}">${l}</button>`).join('');}
  _layoutKey(){const c=this.settings.controls;return `${c.steeringMode}:${c.leftHanded?'left':'right'}`;}
  _openCalibration(){
    this._closeCalibration();
    const c=this.settings.controls;
    if(c.steeringMode==='gamepad')return;
    const key=this._layoutKey();
    const current=c.layouts?.[key];
    this._calLayout=structuredClone(current||defaultControlLayout(c));
    const root=document.createElement('div');root.id='tdr-control-cal';this._calRoot=root;
    root.innerHTML=`<div class="ccgame"><div class="ccroad"></div><div class="cccar"></div></div><div class="ccprotected ccp1">HUD VUELTA/POSICIÓN</div><div class="ccprotected ccp2">MINIMAPA / FANTASMA</div><div class="ccprotected ccp3">MENSAJES</div><div class="cctop"><button class="ccbtn" data-act="back">← CANCELAR</button><div class="cctitle">PERSONALIZAR CONTROLES</div><div class="ccspacer"></div><button class="ccbtn warn" data-act="reset">RESTABLECER</button><button class="ccbtn" data-act="test">PROBAR</button><button class="ccbtn good" data-act="save">GUARDAR</button></div><div class="ccscale"><button class="ccbtn" data-scale="-">−</button><span>100%</span><button class="ccbtn" data-scale="+">+</button></div><div class="cchelp">Arrastra · toca un control para ajustar tamaño · las zonas rojas están protegidas</div>`;
    document.body.appendChild(root);
    const controls=[];
    const add=(id,klass,label,html='')=>{const el=document.createElement('div');el.className=`cccontrol edit ${klass}`;el.dataset.id=id;el.innerHTML=`${html}<span class="ccname">${label}</span>`;root.appendChild(el);controls.push(el);return el;};
    if(c.steeringMode==='buttons'){add('left','ccdir','IZQUIERDA','◀');add('right','ccdir','DERECHA','▶');}
    else add('steer',c.steeringMode==='wheel'?'ccwheel':'ccstick',c.steeringMode==='wheel'?'VOLANTE':'PALANCA');
    add('gas','ccpedal','GAS','GAS');add('brake','ccpedal brake','FRENO','FRENO');add('handbrake','cchand','FRENO DE MANO');
    const protectedRects=()=>[...root.querySelectorAll('.ccprotected')].map(e=>e.getBoundingClientRect());
    const intersects=(a,b)=>!(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom);
    const place=(el)=>{const p=sanitizeLayoutPoint(this._calLayout[el.dataset.id]||{});el.style.left=`${p.x*100}%`;el.style.top=`${p.y*100}%`;el.style.scale=String(p.scale);};
    const validity=(el)=>{const r=el.getBoundingClientRect();const bad=protectedRects().some(z=>intersects(r,z))||r.left<2||r.top<52||r.right>innerWidth-2||r.bottom>innerHeight-2;el.classList.toggle('invalid',bad);return !bad;};
    const select=el=>{controls.forEach(x=>x.classList.toggle('selected',x===el));this._calSelected=el;const box=root.querySelector('.ccscale');box.classList.toggle('on',!!el&&!this._calTesting);if(el){const p=sanitizeLayoutPoint(this._calLayout[el.dataset.id]);box.querySelector('span').textContent=`${Math.round(p.scale*100)}%`;}};
    controls.forEach(el=>{
      place(el);validity(el);
      let pid=null,dx=0,dy=0;
      el.addEventListener('pointerdown',e=>{if(this._calTesting){el.classList.add('selected');return;}pid=e.pointerId;select(el);const r=el.getBoundingClientRect();dx=e.clientX-(r.left+r.width/2);dy=e.clientY-(r.top+r.height/2);el.setPointerCapture?.(pid);e.preventDefault();});
      el.addEventListener('pointermove',e=>{if(this._calTesting||pid!==e.pointerId)return;const x=(e.clientX-dx)/innerWidth,y=(e.clientY-dy)/innerHeight;this._calLayout[el.dataset.id]={...sanitizeLayoutPoint(this._calLayout[el.dataset.id]),x,y};place(el);validity(el);e.preventDefault();});
      const up=e=>{if(pid!==e.pointerId)return;pid=null;validity(el);e.preventDefault();};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    });
    root.querySelector('[data-act="back"]').onclick=()=>this._closeCalibration();
    root.querySelector('[data-act="reset"]').onclick=()=>{this._calLayout=structuredClone(defaultControlLayout(c));controls.forEach(el=>{place(el);validity(el);});select(null);};
    root.querySelector('[data-act="test"]').onclick=e=>{this._calTesting=!this._calTesting;e.currentTarget.textContent=this._calTesting?'EDITAR':'PROBAR';controls.forEach(el=>el.classList.toggle('edit',!this._calTesting));select(null);root.querySelector('.cchelp').textContent=this._calTesting?'Modo prueba de alcance · pulsa EDITAR para seguir ajustando':'Arrastra · toca un control para ajustar tamaño · las zonas rojas están protegidas';};
    root.querySelector('[data-act="save"]').onclick=()=>{if(controls.some(el=>!validity(el))){root.querySelector('.cchelp').textContent='⚠ Mueve los controles fuera de las zonas protegidas';return;}c.layouts={...(c.layouts||{}),[key]:this._calLayout};save(this.settings);saveControlLayout(this._calLayout,c);this._closeCalibration();};
    root.querySelectorAll('[data-scale]').forEach(b=>b.onclick=()=>{const el=this._calSelected;if(!el)return;const id=el.dataset.id,p=sanitizeLayoutPoint(this._calLayout[id]);p.scale=Math.max(.65,Math.min(1.55,p.scale+(b.dataset.scale==='+'?.05:-.05)));this._calLayout[id]=p;place(el);validity(el);select(el);});
  }
  _closeCalibration(){try{this._calRoot?.remove();}catch{}this._calRoot=null;this._calLayout=null;this._calSelected=null;this._calTesting=false;}
  _renderTab(tab){
    if(!this.root)return;this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
    const body=this.root.querySelector('.s2body');const c=this.settings.controls,v=this.settings.video,a=this.settings.audio;
    if(tab==='controls'){
      body.innerHTML=`<div class="s2grid">
        <section class="s2card wide"><div class="s2label">MODO DE DIRECCIÓN</div><div class="s2desc">Elige el control principal para conducir.</div><div class="s2row" data-choice="steer">${this._choiceWrap([['stick','◉ PALANCA'],['buttons','◀ ▶ BOTONES'],['wheel','◉ VOLANTE'],['gamepad','🎮 MANDO']],c.steeringMode)}</div></section>
        <section class="s2card wide"><div class="s2label">DISPOSICIÓN EN PANTALLA</div><div class="s2desc">Coloca y escala tus controles con precisión. Cada modo y cada mano conservan su propia distribución.</div><div class="s2row"><button class="s2cta" data-customize ${c.steeringMode==='gamepad'?'disabled':''}>✥ PERSONALIZAR CONTROLES</button><span class="s2note">Arrastrar · tamaño · zonas protegidas · prueba de alcance</span></div></section>
        <section class="s2card"><div class="s2label">MODO ZURDO</div><div class="s2desc">Intercambia dirección y pedales de lado.</div><div class="s2row"><span class="s2note">La calibración se guarda por separado</span><button class="s2switch ${c.leftHanded?'on':''}"><i></i></button></div></section>
        <section class="s2card"><div class="s2label">INVERTIR DIRECCIÓN</div><div class="s2desc">Invierte izquierda y derecha.</div><div class="s2row"><button class="s2switch ${c.invertSteer?'on':''}"><i></i></button></div></section>
        <section class="s2card wide"><div class="s2label">SENSIBILIDAD</div><div class="s2desc">Respuesta de la dirección táctil.</div><div class="s2row"><input class="s2range" type="range" min="0.4" max="1.4" step="0.05" value="${c.sensitivity}"><span class="s2val">${Math.round(c.sensitivity*100)}%</span></div></section>
      </div>`;
      body.querySelector('[data-choice="steer"]').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;c.steeringMode=b.dataset.v;c.scheme=c.steeringMode==='gamepad'?'gamepad':'touch';save(this.settings);this._renderTab('controls');};
      this._switch(body.querySelectorAll('.s2card')[2],['controls','leftHanded']);this._switch(body.querySelectorAll('.s2card')[3],['controls','invertSteer']);
      const r=body.querySelector('.s2range'),val=body.querySelector('.s2val');r.oninput=()=>{c.sensitivity=Number(r.value);val.textContent=`${Math.round(c.sensitivity*100)}%`;save(this.settings);};
      body.querySelector('[data-customize]').onclick=()=>this._openCalibration();
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

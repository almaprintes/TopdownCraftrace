import { SettingsScene as CurrentSettingsScene } from './SettingsDomScene.js';
import { defaultControlLayout, sanitizeLayoutPoint } from '../controls/controlLayout.js';

const STORAGE_KEY='tdr2:settings';

function persist(settings){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}
}

export class SettingsScene extends CurrentSettingsScene {
  _renderTab(tab){
    super._renderTab(tab);
    if(tab!=='controls' || !this.root) return;
    const row=this.root.querySelector('[data-choice="steer"]');
    if(!row || row.querySelector('[data-v="wheel"]')) return;
    const c=this.settings.controls;
    const btn=document.createElement('button');
    btn.className=`s2choice ${c.steeringMode==='wheel'?'on':''}`;
    btn.dataset.v='wheel';
    btn.textContent='◉ VOLANTE';
    row.appendChild(btn);
    row.onclick=e=>{
      const b=e.target.closest('[data-v]');
      if(!b)return;
      c.steeringMode=b.dataset.v;
      c.scheme=c.steeringMode==='gamepad'?'gamepad':'touch';
      persist(this.settings);
      this._renderTab('controls');
    };
  }

  _openCalibration(){
    this._closeCalibration();
    const c=this.settings.controls;
    if(c.steeringMode==='gamepad')return;

    document.getElementById('tdr-control-cal-v2-style')?.remove?.();
    const style=document.createElement('style');
    style.id='tdr-control-cal-v2-style';
    style.textContent=`
      #tdr-control-cal{background:#071018!important}
      #tdr-control-cal .ccgame{background:
        linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px) 0 0/68px 68px,
        linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px) 0 0/68px 68px,
        radial-gradient(circle at 50% 55%,rgba(46,85,72,.22),transparent 42%),#0a1217!important}
      #tdr-control-cal .ccgame:before{content:'';position:absolute;left:-8%;right:-8%;top:43%;height:32%;transform:rotate(-2deg);background:#282d30;box-shadow:0 -5px 0 #76806d,0 5px 0 #76806d,0 -18px 0 #183323,0 18px 0 #183323;opacity:.78}
      #tdr-control-cal .ccroad,#tdr-control-cal .cccar{display:none!important}
      #tdr-control-cal .ccprotected{opacity:.48;border-color:rgba(255,91,113,.58);background:rgba(255,55,79,.045);font-size:8px}
      #tdr-control-cal .ccp1{left:1.5%;top:8%;width:19%;height:13%}
      #tdr-control-cal .ccp2{right:1.5%;top:8%;width:22%;height:18%}
      #tdr-control-cal .ccp3{left:39%;top:8%;width:22%;height:10%}
      #tdr-control-cal .cctop{height:54px;padding:7px 10px;background:linear-gradient(180deg,rgba(4,9,14,.98),rgba(4,9,14,.78),transparent)}
      #tdr-control-cal .cctitle{font-size:15px}
      #tdr-control-cal .cchelp{bottom:8px;max-width:70vw;overflow:hidden;text-overflow:ellipsis}
      #tdr-control-cal .cccontrol{opacity:.93}
      #tdr-control-cal .cccontrol.edit{outline:1px dashed rgba(108,255,173,.78)}
      #tdr-control-cal .cccontrol.selected{outline:2px solid #fff;box-shadow:0 0 0 4px rgba(66,247,149,.28)}
      #tdr-control-cal .ccname{font-size:8px!important;opacity:.88}
      #tdr-control-cal .ccscale{right:10px;bottom:52px}
      #tdr-control-cal .ccbtn[disabled]{opacity:.55;pointer-events:none}
    `;
    document.head.appendChild(style);

    const key=`${c.steeringMode}:${c.leftHanded?'left':'right'}`;
    const current=c.layouts?.[key];
    this._calLayout=structuredClone(current||defaultControlLayout(c));
    this._calTesting=false;

    const root=document.createElement('div');
    root.id='tdr-control-cal';
    this._calRoot=root;
    root.innerHTML=`
      <div class="ccgame"></div>
      <div class="ccprotected ccp1">HUD VUELTA / POSICIÓN</div>
      <div class="ccprotected ccp2">MINIMAPA / FANTASMA</div>
      <div class="ccprotected ccp3">MENSAJES</div>
      <div class="cctop">
        <button class="ccbtn" data-act="back">← CANCELAR</button>
        <div class="cctitle">PERSONALIZAR CONTROLES</div>
        <div class="ccspacer"></div>
        <button class="ccbtn warn" data-act="reset">RESTABLECER</button>
        <button class="ccbtn" data-act="view">VISTA LIMPIA</button>
        <button class="ccbtn good" data-act="save">GUARDAR</button>
      </div>
      <div class="ccscale"><button class="ccbtn" data-scale="-">−</button><span>100%</span><button class="ccbtn" data-scale="+">+</button></div>
      <div class="cchelp">Arrastra cada control · toca para ajustar tamaño · las zonas rojas están reservadas al HUD</div>
    `;
    document.body.appendChild(root);

    const controls=[];
    const add=(id,klass,label,html='')=>{
      const el=document.createElement('div');
      el.className=`cccontrol edit ${klass}`;
      el.dataset.id=id;
      el.innerHTML=`${html}<span class="ccname">${label}</span>`;
      root.appendChild(el);
      controls.push(el);
      return el;
    };

    if(c.steeringMode==='buttons'){
      add('left','ccdir','IZQUIERDA','◀');
      add('right','ccdir','DERECHA','▶');
    }else{
      add('steer',c.steeringMode==='wheel'?'ccwheel':'ccstick',c.steeringMode==='wheel'?'VOLANTE':'PALANCA');
    }
    add('gas','ccpedal','GAS','GAS');
    add('brake','ccpedal brake','FRENO','FRENO');
    add('handbrake','cchand','FRENO DE MANO');

    const protectedRects=()=>[...root.querySelectorAll('.ccprotected')].map(e=>e.getBoundingClientRect());
    const intersects=(a,b)=>!(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom);
    const pointFor=el=>sanitizeLayoutPoint(this._calLayout[el.dataset.id]||{});
    const place=el=>{
      const p=pointFor(el);
      el.style.left=`${p.x*100}%`;
      el.style.top=`${p.y*100}%`;
      el.style.transform=`translate(-50%,-50%) scale(${p.scale})`;
    };
    const validity=el=>{
      const r=el.getBoundingClientRect();
      const bad=protectedRects().some(z=>intersects(r,z))||r.left<3||r.top<55||r.right>innerWidth-3||r.bottom>innerHeight-3;
      el.classList.toggle('invalid',bad);
      return !bad;
    };
    const select=el=>{
      controls.forEach(x=>x.classList.toggle('selected',x===el));
      this._calSelected=el;
      const box=root.querySelector('.ccscale');
      box.classList.toggle('on',!!el&&!this._calTesting);
      if(el)box.querySelector('span').textContent=`${Math.round(pointFor(el).scale*100)}%`;
    };

    controls.forEach(el=>{
      place(el);validity(el);
      let pid=null,dx=0,dy=0;
      el.addEventListener('pointerdown',e=>{
        if(this._calTesting)return;
        pid=e.pointerId;
        select(el);
        const r=el.getBoundingClientRect();
        dx=e.clientX-(r.left+r.width/2);
        dy=e.clientY-(r.top+r.height/2);
        try{el.setPointerCapture?.(pid);}catch{}
        e.preventDefault();e.stopPropagation();
      },{passive:false});
      el.addEventListener('pointermove',e=>{
        if(this._calTesting||pid!==e.pointerId)return;
        const x=(e.clientX-dx)/innerWidth,y=(e.clientY-dy)/innerHeight;
        this._calLayout[el.dataset.id]={...pointFor(el),x,y};
        place(el);validity(el);
        e.preventDefault();e.stopPropagation();
      },{passive:false});
      const up=e=>{
        if(pid!==e.pointerId)return;
        try{el.releasePointerCapture?.(pid);}catch{}
        pid=null;validity(el);
        e.preventDefault();e.stopPropagation();
      };
      el.addEventListener('pointerup',up,{passive:false});
      el.addEventListener('pointercancel',up,{passive:false});
    });

    root.querySelector('[data-act="back"]').onclick=e=>{e.preventDefault();e.stopPropagation();this._closeCalibration();};
    root.querySelector('[data-act="reset"]').onclick=e=>{
      e.preventDefault();e.stopPropagation();
      this._calLayout=structuredClone(defaultControlLayout(c));
      controls.forEach(el=>{place(el);validity(el);});
      select(null);
    };
    root.querySelector('[data-act="view"]').onclick=e=>{
      e.preventDefault();e.stopPropagation();
      this._calTesting=!this._calTesting;
      e.currentTarget.textContent=this._calTesting?'EDITAR':'VISTA LIMPIA';
      controls.forEach(el=>el.classList.toggle('edit',!this._calTesting));
      root.querySelectorAll('.ccprotected').forEach(el=>el.style.display=this._calTesting?'none':'flex');
      select(null);
      root.querySelector('.cchelp').textContent=this._calTesting?'Vista limpia · pulsa EDITAR para seguir moviendo controles':'Arrastra cada control · toca para ajustar tamaño · las zonas rojas están reservadas al HUD';
    };
    root.querySelector('[data-act="save"]').onclick=e=>{
      e.preventDefault();e.stopPropagation();
      if(controls.some(el=>!validity(el))){
        root.querySelector('.cchelp').textContent='⚠ Hay un control invadiendo una zona protegida o saliendo de pantalla';
        return;
      }
      const saveBtn=e.currentTarget;
      saveBtn.disabled=true;
      c.layouts={...(c.layouts||{}),[key]:structuredClone(this._calLayout)};
      persist(this.settings); // una sola escritura atómica
      saveBtn.textContent='GUARDADO ✓';
      root.style.pointerEvents='none';
      window.setTimeout(()=>this._closeCalibration(),120);
    };
    root.querySelectorAll('[data-scale]').forEach(b=>b.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      const el=this._calSelected;if(!el)return;
      const id=el.dataset.id,p=pointFor(el);
      p.scale=Math.max(.65,Math.min(1.55,p.scale+(b.dataset.scale==='+'?.05:-.05)));
      this._calLayout[id]=p;
      place(el);validity(el);select(el);
    });
  }

  _closeCalibration(){
    try{document.activeElement?.blur?.();}catch{}
    try{this._calRoot?.remove();}catch{}
    this._calRoot=null;
    this._calLayout=null;
    this._calSelected=null;
    this._calTesting=false;
    document.getElementById('tdr-control-cal-v2-style')?.remove?.();
  }
}

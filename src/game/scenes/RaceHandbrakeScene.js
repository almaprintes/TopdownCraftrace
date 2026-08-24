import { RaceScene as CurrentRaceScene } from './RaceWheelModeScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrHandbrake=false;
    this._tdrHandbrakeVisual=null;
    const result=super.create(data);
    this._buildPedalRow();
    this._buildHandbrakeControl();
    return result;
  }

  _buildPedalRow(){
    document.getElementById('tdr-pedal-row-style')?.remove?.();
    let leftHanded=false;
    try{leftHanded=JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.controls?.leftHanded===true;}catch{}

    const style=document.createElement('style');
    style.id='tdr-pedal-row-style';
    const edge=leftHanded?'left':'right';
    style.textContent=`
      #tdr-race-controls .tdr-pedal{
        ${edge}:auto!important;
        bottom:max(10px,1.8vh)!important;
        width:clamp(104px,11vw,148px)!important;
        height:clamp(126px,23vh,166px)!important;
        pointer-events:auto!important;
        touch-action:none!important;
        clip-path:polygon(5% 0,95% 0,100% 100%,0 100%)!important;
      }
      #tdr-race-controls .tdr-pedal-brake{
        ${edge}:calc(max(8px,1vw) + clamp(78px,8vw,102px) + 8px)!important;
      }
      #tdr-race-controls .tdr-pedal-gas{
        ${edge}:calc(max(8px,1vw) + clamp(78px,8vw,102px) + 8px + clamp(104px,11vw,148px) + 10px)!important;
      }
      #tdr-race-controls .tdr-pedal-inner{flex-direction:column!important;gap:5px!important;}
      #tdr-race-controls .tdr-pedal-icon{
        width:42%!important;height:18px!important;border-left:0!important;
        border-right:0!important;border-bottom:3px solid var(--accent)!important;
        transform:none!important;
      }
      #tdr-race-controls .tdr-pedal-copy{align-items:center!important;}
      #tdr-race-controls .tdr-pedal-label{font-size:clamp(18px,2vw,29px)!important;}
      #tdr-race-controls .tdr-pedal-sub{font-size:clamp(6px,.58vw,9px)!important;margin-top:5px!important;}
    `;
    document.head.appendChild(style);

    const root=document.getElementById('tdr-race-controls');
    const gas=root?.querySelector?.('[data-pedal="gas"]');
    const brake=root?.querySelector?.('[data-pedal="brake"]');
    const bindings=[];

    const bind=(el,key)=>{
      if(!el)return;
      let pointerId=null;
      const set=v=>{if(this.touch)this.touch[key]=v?1:0;};
      const down=e=>{
        if(pointerId!==null)return;
        pointerId=e.pointerId;
        try{el.setPointerCapture?.(e.pointerId);}catch{}
        set(true);
        e.preventDefault();e.stopPropagation?.();
      };
      const up=e=>{
        if(pointerId!==e.pointerId)return;
        try{el.releasePointerCapture?.(e.pointerId);}catch{}
        pointerId=null;set(false);
        e.preventDefault();e.stopPropagation?.();
      };
      el.addEventListener('pointerdown',down,{passive:false});
      el.addEventListener('pointerup',up,{passive:false});
      el.addEventListener('pointercancel',up,{passive:false});
      el.addEventListener('lostpointercapture',up,{passive:false});
      bindings.push(()=>{set(false);el.removeEventListener('pointerdown',down);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('lostpointercapture',up);});
    };
    bind(gas,'throttle');
    bind(brake,'brake');

    this.events.once('shutdown',()=>{
      bindings.forEach(fn=>{try{fn();}catch{}});
      document.getElementById('tdr-pedal-row-style')?.remove?.();
    });
  }

  _buildHandbrakeControl(){
    document.getElementById('tdr-handbrake')?.remove?.();
    document.getElementById('tdr-handbrake-style')?.remove?.();

    let leftHanded=false;
    try{leftHanded=JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.controls?.leftHanded===true;}catch{}

    const style=document.createElement('style');
    style.id='tdr-handbrake-style';
    style.textContent=`
      #tdr-handbrake{
        position:fixed;z-index:82;bottom:max(10px,1.8vh);
        ${leftHanded?'left':'right'}:max(8px,1vw);
        width:clamp(78px,8vw,102px);aspect-ratio:859/1024;
        touch-action:none;user-select:none;-webkit-user-select:none;
        pointer-events:auto;filter:drop-shadow(0 7px 15px rgba(0,0,0,.42));
      }
      #tdr-handbrake img{
        position:absolute;left:0;top:0;width:100%;height:100%;
        object-fit:fill;object-position:0 0;pointer-events:none;
        transform:none!important;transition:none!important;
      }
      #tdr-handbrake .idle{opacity:1;}
      #tdr-handbrake .pulled{opacity:0;}
      #tdr-handbrake.active .idle{opacity:0;}
      #tdr-handbrake.active .pulled{opacity:1;}
    `;
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='tdr-handbrake';
    root.innerHTML=`
      <img class="idle" src="assets/ui/tdr_handbrake_idle.webp?v=3" width="859" height="1024" alt="Freno de mano">
      <img class="pulled" src="assets/ui/tdr_handbrake_pulled.webp?v=3" width="859" height="1024" alt="Freno de mano accionado">
    `;
    document.body.appendChild(root);
    this._tdrHandbrakeVisual=root;

    let activeId=null;
    const setActive=(v)=>{
      this._tdrHandbrake=!!v;
      root.classList.toggle('active',!!v);
    };
    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      root.setPointerCapture?.(e.pointerId);
      setActive(true);
      e.preventDefault();
      e.stopPropagation?.();
    };
    const release=e=>{
      if(activeId!==e.pointerId)return;
      try{root.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;
      setActive(false);
      e.preventDefault();
      e.stopPropagation?.();
    };
    root.addEventListener('pointerdown',down,{passive:false});
    root.addEventListener('pointerup',release,{passive:false});
    root.addEventListener('pointercancel',release,{passive:false});
    root.addEventListener('lostpointercapture',release,{passive:false});

    const keyDown=e=>{if(e.code==='Space'){setActive(true);e.preventDefault();}};
    const keyUp=e=>{if(e.code==='Space'){setActive(false);e.preventDefault();}};
    window.addEventListener('keydown',keyDown,{passive:false});
    window.addEventListener('keyup',keyUp,{passive:false});

    this.events.once('shutdown',()=>{
      setActive(false);
      root.removeEventListener('pointerdown',down);
      root.removeEventListener('pointerup',release);
      root.removeEventListener('pointercancel',release);
      root.removeEventListener('lostpointercapture',release);
      window.removeEventListener('keydown',keyDown);
      window.removeEventListener('keyup',keyUp);
      root.remove();
      document.getElementById('tdr-handbrake-style')?.remove();
      this._tdrHandbrakeVisual=null;
    });
  }

  _steerForHandbrake(){
    if(Number.isFinite(this._tdrWheelSteer) && Math.abs(this._tdrWheelSteer)>.01) return clamp(this._tdrWheelSteer,-1,1);
    const t=this.touch||{};
    let s=Number(t.steer||t.buttonSteer||0);
    if(Math.abs(s)>.01)return clamp(s,-1,1);
    const k=this.keys||{};
    const left=!!(k.left?.isDown||k.left2?.isDown);
    const right=!!(k.right?.isDown||k.right2?.isDown);
    if(left!==right)return right?1:-1;
    return 0;
  }

  _applyHandbrakePhysics(delta){
    if(!this._tdrHandbrake || !this._raceStarted)return;
    const body=this.carBody;
    const vel=body?.body?.velocity;
    if(!body?.scene || !vel)return;

    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    const rot=Number(body.rotation||0);
    const fx=Math.cos(rot),fy=Math.sin(rot);
    const rx=-fy,ry=fx;
    let vf=vel.x*fx+vel.y*fy;
    let vl=vel.x*rx+vel.y*ry;
    const speed=Math.hypot(vel.x,vel.y);
    if(speed<24)return;

    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);
    const steer=this._steerForHandbrake();

    const brakeDrag=Math.exp(-dt*(.78+.88*speed01));
    vf*=brakeDrag;

    const slipBuild=(.85+2.25*speed01)*Math.abs(vf)*steer*dt;
    vl+=slipBuild;
    vl*=Math.exp(-dt*.20);

    const yawAuthority=clamp((speed-24)/140,0,1);
    const yaw=steer*(.70+1.35*speed01)*yawAuthority*dt;
    body.rotation+=yaw;

    const nr=Number(body.rotation||rot);
    const nfx=Math.cos(nr),nfy=Math.sin(nr);
    const nrx=-nfy,nry=nfx;
    vel.x=nfx*vf+nrx*vl;
    vel.y=nfy*vf+nry*vl;

    if(this.carRig?.scene){
      this.carRig.x=body.x;
      this.carRig.y=body.y;
      this.carRig.rotation=body.rotation+(this._carVisualRotOffset||0);
    }
  }

  update(time,delta){
    super.update(time,delta);
    this._applyHandbrakePhysics(delta);
  }
}

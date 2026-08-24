import { RaceScene as CurrentRaceScene } from './RaceWheelModeScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrHandbrake=false;
    this._tdrHandbrakeVisual=null;
    const result=super.create(data);
    this._buildHandbrakeControl();
    return result;
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
        ${leftHanded?'left:calc(max(18px,1.8vw) + clamp(150px,22vw,260px) + 12px);':'right:calc(max(18px,1.8vw) + clamp(150px,22vw,260px) + 12px);'}
        width:clamp(70px,7.2vw,92px);aspect-ratio:859/1024;
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

    // More rear breakaway: stronger lateral build-up and slower lateral damping.
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

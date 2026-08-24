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

  _setHandbrakeFromSwipe(v){
    this._tdrHandbrake=!!v;
    this._tdrHandbrakeVisual?.classList?.toggle('active',!!v);
  }

  _buildPedalRow(){
    document.getElementById('tdr-pedal-row-style')?.remove?.();
    let leftHanded=false;
    try{leftHanded=JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.controls?.leftHanded===true;}catch{}

    const style=document.createElement('style');
    style.id='tdr-pedal-row-style';
    const edge=leftHanded?'left':'right';
    style.textContent=`
      #tdr-race-controls,
      #tdr-race-controls *,
      button[data-tdr-race-ui="1"],
      button[data-tdr-race-ui="1"] *{
        user-select:none!important;
        -webkit-user-select:none!important;
        -webkit-touch-callout:none!important;
      }
      #tdr-race-controls .tdr-pedal{
        ${edge}:auto!important;
        bottom:max(8px,1.5vh)!important;
        width:clamp(88px,9.2vw,122px)!important;
        height:clamp(132px,24vh,172px)!important;
        pointer-events:auto!important;
        touch-action:none!important;
        clip-path:polygon(5% 0,95% 0,100% 100%,0 100%)!important;
      }
      #tdr-race-controls .tdr-pedal-brake{
        ${edge}:calc(max(4px,.55vw) + clamp(78px,8vw,102px) + 5px)!important;
      }
      #tdr-race-controls .tdr-pedal-gas{
        ${edge}:calc(max(4px,.55vw) + clamp(78px,8vw,102px) + 5px + clamp(88px,9.2vw,122px) + 6px)!important;
      }
      #tdr-race-controls .tdr-pedal-inner{
        flex-direction:column!important;
        gap:4px!important;
        padding:8px 0!important;
      }
      #tdr-race-controls .tdr-pedal-icon{
        width:38%!important;height:15px!important;border-left:0!important;
        border-right:0!important;border-bottom:3px solid var(--accent)!important;
        transform:none!important;flex:0 0 auto!important;
      }
      #tdr-race-controls .tdr-pedal-copy{
        align-items:center!important;
        justify-content:center!important;
        flex-direction:row!important;
        gap:5px!important;
        min-height:0!important;
      }
      #tdr-race-controls .tdr-pedal-label,
      #tdr-race-controls .tdr-pedal-sub{
        writing-mode:vertical-rl!important;
        text-orientation:upright!important;
        white-space:nowrap!important;
        margin:0!important;
        line-height:1!important;
      }
      #tdr-race-controls .tdr-pedal-label{
        font-size:clamp(14px,1.55vw,22px)!important;
        letter-spacing:.04em!important;
      }
      #tdr-race-controls .tdr-pedal-sub{
        font-size:clamp(5px,.48vw,7px)!important;
        letter-spacing:.08em!important;
      }
    `;
    document.head.appendChild(style);

    const root=document.getElementById('tdr-race-controls');
    const gas=root?.querySelector?.('[data-pedal="gas"]');
    const brake=root?.querySelector?.('[data-pedal="brake"]');
    if(!gas||!brake)return;

    let activeId=null;
    let captureEl=null;

    const clear=()=>{
      if(this.touch){this.touch.throttle=0;this.touch.brake=0;}
      this._setHandbrakeFromSwipe(false);
    };

    const paddedHit=(rect,x,pad=7)=>x>=rect.left-pad&&x<=rect.right+pad;
    const applyAt=x=>{
      const gr=gas.getBoundingClientRect();
      const br=brake.getBoundingClientRect();
      const hb=this._tdrHandbrakeVisual?.getBoundingClientRect?.();

      let mode='none';
      if(hb&&paddedHit(hb,x,6)) mode='handbrake';
      else if(paddedHit(br,x,7)) mode='brake';
      else if(paddedHit(gr,x,7)) mode='gas';
      else {
        const centers=[
          {mode:'gas',x:(gr.left+gr.right)/2},
          {mode:'brake',x:(br.left+br.right)/2}
        ];
        if(hb)centers.push({mode:'handbrake',x:(hb.left+hb.right)/2});
        centers.sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));
        if(centers[0]&&Math.abs(centers[0].x-x)<70)mode=centers[0].mode;
      }

      if(this.touch){
        this.touch.throttle=mode==='gas'?1:0;
        this.touch.brake=mode==='brake'?1:0;
      }
      this._setHandbrakeFromSwipe(mode==='handbrake');
    };

    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      captureEl=e.currentTarget;
      try{captureEl.setPointerCapture?.(e.pointerId);}catch{}
      applyAt(e.clientX);
      e.preventDefault();e.stopPropagation?.();
    };
    const move=e=>{
      if(activeId!==e.pointerId)return;
      applyAt(e.clientX);
      e.preventDefault();e.stopPropagation?.();
    };
    const up=e=>{
      if(activeId!==e.pointerId)return;
      try{captureEl?.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;captureEl=null;clear();
      e.preventDefault();e.stopPropagation?.();
    };

    [gas,brake].forEach(el=>{
      el.addEventListener('pointerdown',down,{passive:false});
      el.addEventListener('pointermove',move,{passive:false});
      el.addEventListener('pointerup',up,{passive:false});
      el.addEventListener('pointercancel',up,{passive:false});
      el.addEventListener('lostpointercapture',up,{passive:false});
    });

    this.events.once('shutdown',()=>{
      clear();
      [gas,brake].forEach(el=>{
        el.removeEventListener('pointerdown',down);
        el.removeEventListener('pointermove',move);
        el.removeEventListener('pointerup',up);
        el.removeEventListener('pointercancel',up);
        el.removeEventListener('lostpointercapture',up);
      });
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
        position:fixed;z-index:82;bottom:max(8px,1.5vh);
        ${leftHanded?'left':'right'}:max(4px,.55vw);
        width:clamp(78px,8vw,102px);aspect-ratio:859/1024;
        touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;
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
    const setActive=v=>this._setHandbrakeFromSwipe(v);
    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      root.setPointerCapture?.(e.pointerId);
      setActive(true);
      e.preventDefault();e.stopPropagation?.();
    };
    const release=e=>{
      if(activeId!==e.pointerId)return;
      try{root.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;setActive(false);
      e.preventDefault();e.stopPropagation?.();
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
    if(Number.isFinite(this._tdrWheelSteer)&&Math.abs(this._tdrWheelSteer)>.01)return clamp(this._tdrWheelSteer,-1,1);
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
    if(!this._tdrHandbrake||!this._raceStarted)return;
    const body=this.carBody;
    const vel=body?.body?.velocity;
    if(!body?.scene||!vel)return;

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

import { RaceScene as CurrentRaceScene } from './RaceWheelModeScene.js';
import { applyDomControlLayout } from '../controls/controlLayout.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrHandbrake=false;
    this._tdrHandbrakeVisual=null;
    const result=super.create(data);

    try{this.ttPanel?.c?.setVisible?.(false);}catch{}
    this._showTTPanel=()=>{};
    this._hideTTPanel=()=>{};

    this._buildPedalRow();
    this._buildHandbrakeControl();

    const applyLayout=()=>{
      try{applyDomControlLayout();}catch{}
      try{this._syncPedalHitboxes?.();}catch{}
    };
    this.time?.delayedCall?.(0,applyLayout);
    window.addEventListener('resize',applyLayout,{passive:true});
    this.events.once('shutdown',()=>window.removeEventListener('resize',applyLayout));
    return result;
  }

  _showTimingAchievement(records,lapMs){
    super._showTimingAchievement(records,lapMs);
    const shell=this._timingBanner?.list?.[0];
    if(shell?.scene) shell.setAlpha(.70);
  }

  _showRaceLoot(reward){
    super._showRaceLoot(reward);
    const toast=this._lootToast;
    if(toast?.scene) toast.setBackgroundColor?.('#07160f8c');
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
      #tdr-race-controls .tdr-pedal.is-active{
        filter:brightness(1.7) saturate(1.55) drop-shadow(0 0 18px var(--accent))!important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.38),
          inset 0 -18px 34px rgba(0,0,0,.12),
          0 0 16px color-mix(in srgb,var(--accent) 92%,transparent),
          0 0 34px color-mix(in srgb,var(--accent) 68%,transparent)!important;
      }
      #tdr-race-controls .tdr-pedal.is-active::after{
        height:5px!important;
        opacity:1!important;
        box-shadow:0 0 18px var(--accent),0 0 32px var(--accent)!important;
      }
      #tdr-race-controls .tdr-pedal-hitbox{
        position:fixed!important;
        z-index:81!important;
        display:block!important;
        background:transparent!important;
        border:0!important;
        padding:0!important;
        margin:0!important;
        pointer-events:auto!important;
        touch-action:none!important;
        user-select:none!important;
        -webkit-user-select:none!important;
        -webkit-touch-callout:none!important;
        -webkit-tap-highlight-color:transparent!important;
      }
    `;
    document.head.appendChild(style);

    const root=document.getElementById('tdr-race-controls');
    const gas=root?.querySelector?.('[data-pedal="gas"]');
    const brake=root?.querySelector?.('[data-pedal="brake"]');
    if(!gas||!brake)return;

    const makeHitbox=mode=>{
      root.querySelector?.(`[data-pedal-hitbox="${mode}"]`)?.remove?.();
      const el=document.createElement('div');
      el.className='tdr-pedal-hitbox';
      el.dataset.pedalHitbox=mode;
      el.setAttribute('aria-hidden','true');
      root.appendChild(el);
      return el;
    };
    const gasHit=makeHitbox('gas');
    const brakeHit=makeHitbox('brake');

    const syncHitboxes=()=>{
      const sync=(visual,hit)=>{
        const r=visual.getBoundingClientRect();
        if(!r.width||!r.height)return;
        // Preserve the old large rectangular touch area around the slimmer
        // visual pedal. The top extension is deliberately generous so the
        // full rectangle shown by control customisation is touch-sensitive.
        const padX=Math.max(28,Math.min(44,r.width*.34));
        const padTop=Math.max(52,Math.min(76,r.height*.40));
        const padBottom=Math.max(18,Math.min(30,r.height*.16));
        const left=Math.max(0,r.left-padX);
        const top=Math.max(0,r.top-padTop);
        const right=Math.min(innerWidth,r.right+padX);
        const bottom=Math.min(innerHeight,r.bottom+padBottom);
        hit.style.left=`${left}px`;
        hit.style.top=`${top}px`;
        hit.style.width=`${Math.max(1,right-left)}px`;
        hit.style.height=`${Math.max(1,bottom-top)}px`;
      };
      sync(gas,gasHit);
      sync(brake,brakeHit);
    };
    this._syncPedalHitboxes=syncHitboxes;
    requestAnimationFrame(()=>requestAnimationFrame(syncHitboxes));

    let activeId=null;
    let captureEl=null;

    const setPedalVisual=mode=>{
      gas.classList.toggle('is-active',mode==='gas');
      brake.classList.toggle('is-active',mode==='brake');
    };
    const clear=()=>{
      if(this.touch){this.touch.throttle=0;this.touch.brake=0;}
      setPedalVisual('none');
      this._setHandbrakeFromSwipe(false);
    };

    const paddedHit=(rect,x,pad=7)=>x>=rect.left-pad&&x<=rect.right+pad;
    const applyAt=x=>{
      const gr=gas.getBoundingClientRect();
      const br=brake.getBoundingClientRect();
      const hb=this._tdrHandbrakeVisual?.getBoundingClientRect?.();
      const gc=(gr.left+gr.right)/2;
      const bc=(br.left+br.right)/2;

      let mode='none';
      if(hb&&paddedHit(hb,x,6)) mode='handbrake';
      else {
        const gasReach=paddedHit(gr,x,44);
        const brakeReach=paddedHit(br,x,44);
        if(gasReach||brakeReach){
          mode=Math.abs(x-gc)<=Math.abs(x-bc)?'gas':'brake';
        }else{
          const centers=[
            {mode:'gas',x:gc},
            {mode:'brake',x:bc}
          ];
          if(hb)centers.push({mode:'handbrake',x:(hb.left+hb.right)/2});
          centers.sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));
          if(centers[0]&&Math.abs(centers[0].x-x)<96)mode=centers[0].mode;
        }
      }

      if(this.touch){
        this.touch.throttle=mode==='gas'?1:0;
        this.touch.brake=mode==='brake'?1:0;
      }
      setPedalVisual(mode);
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
      const el=captureEl;
      activeId=null;captureEl=null;
      try{el?.releasePointerCapture?.(e.pointerId);}catch{}
      clear();
      e.preventDefault();e.stopPropagation?.();
    };

    [gasHit,brakeHit].forEach(el=>{
      el.addEventListener('pointerdown',down,{passive:false});
      el.addEventListener('pointermove',move,{passive:false});
      el.addEventListener('pointerup',up,{passive:false});
      el.addEventListener('pointercancel',up,{passive:false});
      el.addEventListener('lostpointercapture',up,{passive:false});
    });

    this.events.once('shutdown',()=>{
      clear();
      [gasHit,brakeHit].forEach(el=>{
        el.removeEventListener('pointerdown',down);
        el.removeEventListener('pointermove',move);
        el.removeEventListener('pointerup',up);
        el.removeEventListener('pointercancel',up);
        el.removeEventListener('lostpointercapture',up);
        el.remove();
      });
      this._syncPedalHitboxes=null;
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
    // The handbrake must not magnify tiny steering residue into a lateral kick.
    // Use one deliberate neutral dead-zone for every steering source.
    const neutral=.06;
    const wheel=Number(this._tdrWheelSteer||0);
    if(Number.isFinite(wheel)&&Math.abs(wheel)>neutral)return clamp(wheel,-1,1);

    const t=this.touch||{};
    const touchSteer=Number(t.steer||0);
    const buttonSteer=Number(t.buttonSteer||0);
    let s=Math.abs(touchSteer)>=Math.abs(buttonSteer)?touchSteer:buttonSteer;
    if(Number.isFinite(s)&&Math.abs(s)>neutral)return clamp(s,-1,1);

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
    const speed=Math.hypot(vel.x,vel.y);
    if(speed<24)return;

    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520));
    const speed01=clamp(speed/maxFwd,0,1);
    const steer=this._steerForHandbrake();

    // Rear wheels lock first: retain most world-space momentum instead of
    // rotating the whole velocity vector with the body. This lets the body yaw
    // while the car keeps travelling roughly along its previous trajectory.
    const brakeDrag=Math.exp(-dt*(.32+.48*speed01));
    vel.x*=brakeDrag;
    vel.y*=brakeDrag;

    if(steer!==0){
      const yawAuthority=clamp((speed-24)/150,0,1);
      const yawDelta=steer*(.82+1.72*speed01)*yawAuthority*dt;

      // Virtual front-axle pivot. Keep the front axle almost where it is while
      // rotation is applied, so the rear axle sweeps a wider arc than the nose.
      // This removes the old whole-car diagonal translation.
      const longSide=Math.max(Number(body.displayWidth||0),Number(body.displayHeight||0),54);
      const frontOffset=clamp(longSide*.24,12,30);
      const frontX=Number(body.x||0)+fx*frontOffset;
      const frontY=Number(body.y||0)+fy*frontOffset;
      const nr=rot+yawDelta;
      const nfx=Math.cos(nr),nfy=Math.sin(nr);

      body.rotation=nr;
      body.x=frontX-nfx*frontOffset;
      body.y=frontY-nfy*frontOffset;
    }

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

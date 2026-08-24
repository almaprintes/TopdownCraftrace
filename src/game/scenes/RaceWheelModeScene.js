import { RaceScene as CurrentRaceScene } from './RaceLeftHandedControlsScene.js';

const SETTINGS_KEY='tdr2:settings';
function prefs(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}catch{return {};}}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrWheelMode=prefs().steeringMode==='wheel';
    this._tdrWheelSteer=0;
    const result=super.create(data);
    if(this._tdrWheelMode)this._buildSteeringWheel();
    return result;
  }

  createTouchControls(){
    if(!this._tdrWheelMode)return super.createTouchControls();

    const left=!!prefs().leftHanded;
    const state={
      steer:0,throttle:0,brake:0,stickX:0,stickY:0,targetAngle:null,
      buttonSteer:0,leftId:null,rightId:null,leftActive:false,
      rightThrottle:false,rightBrake:false,btnW:0,btnH:0,rightX:0,throttleY:0,brakeY:0,_draw:()=>{}
    };

    this.touchUI=this.add.container(0,0).setScrollFactor(0).setDepth(1000);
    for(let i=0;i<6;i++)this.touchUI.add(this.add.rectangle(0,0,1,1,0x000000,0).setVisible(false));
    try{this.cameras.main.ignore(this.touchUI);}catch{}

    let pedalX=0,pedalW=0,pedalH=0,gasY=0,brakeY=0,pedalId=null;
    const layout=()=>{
      const w=Number(this.scale?.width||0),h=Number(this.scale?.height||0);
      const pad=Math.max(14,Math.min(28,Math.floor(Math.min(w,h)*0.04)));
      pedalW=Math.max(150,Math.min(260,Math.floor(w*0.22)));
      pedalH=Math.max(78,Math.min(140,Math.floor(h*0.16)));
      pedalX=left?pad:w-pad-pedalW;
      brakeY=h-pad-pedalH;
      gasY=brakeY-Math.floor(pedalH*1.08);
      state.btnW=pedalW;state.btnH=pedalH;state.rightX=pedalX;state.throttleY=gasY;state.brakeY=brakeY;
    };
    const inRect=(x,y,rx,ry,rw,rh)=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh;
    const setPedal=p=>{
      state.throttle=inRect(p.x,p.y,pedalX,gasY,pedalW,pedalH)?1:0;
      state.brake=inRect(p.x,p.y,pedalX,brakeY,pedalW,pedalH)?1:0;
      state.rightThrottle=state.throttle>0;
      state.rightBrake=state.brake>0;
    };
    const down=p=>{
      if(!inRect(p.x,p.y,pedalX,gasY,pedalW,pedalH)&&!inRect(p.x,p.y,pedalX,brakeY,pedalW,pedalH))return;
      pedalId=p.id;setPedal(p);
    };
    const move=p=>{if(p.isDown&&pedalId===p.id)setPedal(p);};
    const up=p=>{if(pedalId!==p.id)return;pedalId=null;state.throttle=0;state.brake=0;state.rightThrottle=false;state.rightBrake=false;};

    this.input.on('pointerdown',down);this.input.on('pointermove',move);this.input.on('pointerup',up);this.input.on('pointerupoutside',up);
    this.scale.on('resize',layout);layout();
    this.events.once('shutdown',()=>{
      this.input.off('pointerdown',down);this.input.off('pointermove',move);this.input.off('pointerup',up);this.input.off('pointerupoutside',up);this.scale.off('resize',layout);
    });
    return state;
  }

  _applyWheelSteer(value){
    this._tdrWheelSteer=Number.isFinite(value)?value:0;
    if(!this.touch)return;
    // Never feed the old absolute-stick branch. Wheel steering is relative.
    this.touch.targetAngle=null;
    this.touch.stickX=0;
    this.touch.stickY=0;
    this.touch.steer=0;
    this.touch.buttonSteer=0;
    this.touch.leftActive=Math.abs(this._tdrWheelSteer)>.008;
  }

  _buildSteeringWheel(){
    document.getElementById('tdr-steering-wheel')?.remove?.();
    document.getElementById('tdr-steering-wheel-style')?.remove?.();
    const p=prefs();
    const left=!!p.leftHanded;
    const style=document.createElement('style');
    style.id='tdr-steering-wheel-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick{display:none!important}
      #tdr-steering-wheel{position:fixed;z-index:80;${left?'right':'left'}:max(18px,1.8vw);bottom:max(10px,1.8vh);width:clamp(132px,15vw,176px);aspect-ratio:1/1;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 7px 15px rgba(0,0,0,.38));overflow:hidden;border-radius:50%;}
      #tdr-steering-wheel .art{position:absolute;left:50%;top:50%;width:126%;height:126%;object-fit:cover;pointer-events:none;opacity:.97;transform:translate(-50%,-50%) rotate(var(--rot,0deg));transform-origin:50% 50%;transition:transform 38ms linear,filter 80ms linear}
      #tdr-steering-wheel.active .art{filter:brightness(1.05)}
    `;
    document.head.appendChild(style);

    const wheel=document.createElement('div');
    wheel.id='tdr-steering-wheel';
    // Revert the broken black-mask asset. This is the last visible wheel art,
    // clipped cleanly by CSS while we keep gameplay independent from the image.
    wheel.innerHTML='<img class="art" src="assets/ui/steering-wheel.svg?v=4" alt="Volante">';
    document.body.appendChild(wheel);

    let activeId=null;

    const setFromPointer=e=>{
      const r=wheel.getBoundingClientRect();
      const cx=r.left+r.width*.5;
      const half=Math.max(44,r.width*.5);
      let raw=(e.clientX-cx)/half;
      raw=Math.max(-1,Math.min(1,raw));

      const current=prefs();
      const sens=Math.max(.4,Math.min(1.4,Number(current.sensitivity||1)));
      const inv=current.invertSteer===true?-1:1;

      // Deliberately contained: lots of useful precision around centre.
      const shaped=Math.sign(raw)*Math.pow(Math.abs(raw),1.55);
      const steer=Math.max(-0.62,Math.min(0.62,shaped*0.56*sens*inv));
      this._applyWheelSteer(steer);
      wheel.style.setProperty('--rot',`${raw*42}deg`);
    };

    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      wheel.setPointerCapture?.(e.pointerId);
      wheel.classList.add('active');
      setFromPointer(e);
      e.preventDefault();
    };
    const move=e=>{
      if(activeId!==e.pointerId)return;
      setFromPointer(e);
      e.preventDefault();
    };
    const release=e=>{
      if(activeId!==e.pointerId)return;
      try{wheel.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;
      wheel.classList.remove('active');
      this._applyWheelSteer(0);
      wheel.style.setProperty('--rot','0deg');
      e.preventDefault();
    };

    wheel.addEventListener('pointerdown',down,{passive:false});
    wheel.addEventListener('pointermove',move,{passive:false});
    wheel.addEventListener('pointerup',release,{passive:false});
    wheel.addEventListener('pointercancel',release,{passive:false});
    wheel.addEventListener('lostpointercapture',release,{passive:false});

    this.events.once('shutdown',()=>{
      this._applyWheelSteer(0);
      wheel.removeEventListener('pointerdown',down);
      wheel.removeEventListener('pointermove',move);
      wheel.removeEventListener('pointerup',release);
      wheel.removeEventListener('pointercancel',release);
      wheel.removeEventListener('lostpointercapture',release);
      wheel.remove();
      document.getElementById('tdr-steering-wheel-style')?.remove();
    });
  }

  update(time,delta){
    if(!this._tdrWheelMode){
      super.update(time,delta);
      return;
    }

    const steer=Number(this._tdrWheelSteer||0);
    const mag=Math.abs(steer);
    const leftKey=this.keys?.left;
    const rightKey=this.keys?.right;
    const prevLeft=!!leftKey?.isDown;
    const prevRight=!!rightKey?.isDown;
    const prevTurnRate=this.turnRate;

    // The base race controller already has the correct continuous "classic wheel"
    // physics on keyboard left/right. Drive that exact path instead of inventing a
    // second steering model. Scale turnRate by wheel deflection to keep it analogue.
    if(mag>0.018){
      if(leftKey)leftKey.isDown=steer<0;
      if(rightKey)rightKey.isDown=steer>0;
      if(Number.isFinite(prevTurnRate))this.turnRate=prevTurnRate*Math.max(.12,Math.min(.62,mag));
    }else{
      if(leftKey)leftKey.isDown=false;
      if(rightKey)rightKey.isDown=false;
    }

    this._applyWheelSteer(steer);
    try{
      super.update(time,delta);
    }finally{
      if(leftKey)leftKey.isDown=prevLeft;
      if(rightKey)rightKey.isDown=prevRight;
      if(Number.isFinite(prevTurnRate))this.turnRate=prevTurnRate;
      this._applyWheelSteer(steer);
    }
  }
}
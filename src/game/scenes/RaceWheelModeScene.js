import { RaceScene as CurrentRaceScene } from './RaceLeftHandedControlsScene.js';

const SETTINGS_KEY='tdr2:settings';
function prefs(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}catch{return {};}}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrWheelMode=prefs().steeringMode==='wheel';
    const result=super.create(data);
    if(this._tdrWheelMode)this._buildSteeringWheel();
    return result;
  }

  // Wheel mode must NOT inherit the old analogue joystick's absolute-angle logic.
  // A steering wheel is relative to the car: hold right and the car keeps turning right.
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

  _buildSteeringWheel(){
    document.getElementById('tdr-steering-wheel')?.remove?.();
    document.getElementById('tdr-steering-wheel-style')?.remove?.();
    const p=prefs();
    const left=!!p.leftHanded;
    const style=document.createElement('style');
    style.id='tdr-steering-wheel-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick{display:none!important}
      #tdr-steering-wheel{position:fixed;z-index:80;${left?'right':'left'}:max(18px,1.8vw);bottom:max(10px,1.8vh);width:clamp(142px,17vw,194px);aspect-ratio:475/365;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 8px 18px rgba(0,0,0,.42));}
      #tdr-steering-wheel .art{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;opacity:.98;transform:rotate(var(--rot,0deg));transform-origin:50% 50%;transition:transform 45ms linear,filter 80ms linear}
      #tdr-steering-wheel.active .art{filter:brightness(1.08)}
    `;
    document.head.appendChild(style);

    const wheel=document.createElement('div');
    wheel.id='tdr-steering-wheel';
    wheel.innerHTML='<img class="art" src="assets/ui/steering-wheel.svg?v=2" alt="Volante">';
    document.body.appendChild(wheel);

    let activeId=null,startX=0,steer=0;
    const setSteer=value=>{
      const current=prefs();
      const sens=Math.max(.4,Math.min(1.4,Number(current.sensitivity||1)));
      const inv=current.invertSteer===true?-1:1;
      steer=Math.max(-1,Math.min(1,value*sens*inv));
      if(this.touch){
        // IMPORTANT: targetAngle MUST stay null. A wheel is relative steering,
        // not the joystick's old world-space "point the car toward this angle" mode.
        this.touch.targetAngle=null;
        this.touch.stickX=0;
        this.touch.stickY=0;
        this.touch.steer=steer;
        this.touch.buttonSteer=0;
        this.touch.leftActive=Math.abs(steer)>.01;
      }
      wheel.style.setProperty('--rot',`${steer*82}deg`);
    };
    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;startX=e.clientX;wheel.setPointerCapture?.(e.pointerId);wheel.classList.add('active');setSteer(0);e.preventDefault();
    };
    const move=e=>{
      if(activeId!==e.pointerId)return;
      const travel=Math.max(48,wheel.getBoundingClientRect().width*.46);
      setSteer((e.clientX-startX)/travel);e.preventDefault();
    };
    const release=e=>{
      if(activeId!==e.pointerId)return;
      try{wheel.releasePointerCapture?.(e.pointerId);}catch{}
      activeId=null;startX=0;wheel.classList.remove('active');setSteer(0);e.preventDefault();
    };
    wheel.addEventListener('pointerdown',down,{passive:false});
    wheel.addEventListener('pointermove',move,{passive:false});
    wheel.addEventListener('pointerup',release,{passive:false});
    wheel.addEventListener('pointercancel',release,{passive:false});
    wheel.addEventListener('lostpointercapture',release,{passive:false});

    this.events.once('shutdown',()=>{
      if(this.touch){this.touch.targetAngle=null;this.touch.steer=0;this.touch.stickX=0;this.touch.stickY=0;this.touch.leftActive=false;}
      wheel.remove();document.getElementById('tdr-steering-wheel-style')?.remove();
    });
  }

  update(time,delta){
    // Belt-and-braces: never allow inherited joystick code to turn wheel input
    // back into an absolute world angle between pointer events.
    if(this._tdrWheelMode&&this.touch)this.touch.targetAngle=null;
    super.update(time,delta);
  }
}

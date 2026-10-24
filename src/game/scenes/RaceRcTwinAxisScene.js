import {RaceScene as PreviousRaceScene} from './RaceWheelModeScene.js';
import {readControlLayout} from '../controls/controlLayout.js';
import {rcAxisValue,rcThrottleBrake} from '../controls/rcTwinAxis.js';

const SETTINGS_KEY='tdr2:settings';
function settings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}catch{return {};}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Two separate one-axis, spring-centered RC radio sticks. Independent of
// existing wheel/stick/buttons/gamepad; all values go through normal car physics.
export class RaceScene extends PreviousRaceScene{
  create(data){
    this._tdrRcMode=settings().steeringMode==='rc_twin';
    this._tdrRcSteer=0;
    this._tdrRcGas=0;
    this._tdrRcBrake=0;
    const result=super.create(data);
    if(this._tdrRcMode)this._buildRcTwinAxis();
    return result;
  }

  createTouchControls(){
    if(!this._tdrRcMode)return super.createTouchControls();
    const state={
      steer:0,throttle:0,brake:0,stickX:0,stickY:0,targetAngle:null,
      buttonSteer:0,leftId:null,rightId:null,leftActive:false,
      rightThrottle:false,rightBrake:false,btnW:0,btnH:0,rightX:0,
      throttleY:0,brakeY:0,_draw:()=>{}
    };
    // No generic Phaser stick or pedal handlers should compete for either
    // pointer. The DOM zones own their individual finger captures.
    this.touchUI=this.add.container(0,0).setScrollFactor(0).setDepth(1000);
    this.touchUI.setVisible(false);
    try{this.cameras.main.ignore(this.touchUI);}catch{}
    return state;
  }

  _applyRcValues(){
    if(!this.touch)return;
    this._applyWheelSteer(this._tdrRcSteer);
    const t=this.touch;
    t.throttle=this._tdrRcGas>.07?1:0;
    t.brake=this._tdrRcBrake>.07?1:0;
    t.rightThrottle=t.throttle>0;
    t.rightBrake=t.brake>0;
  }

  _buildRcTwinAxis(){
    document.getElementById('tdr-rc-controls')?.remove();
    document.getElementById('tdr-rc-controls-style')?.remove();
    const config=settings();
    const style=document.createElement('style');
    style.id='tdr-rc-controls-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick,#tdr-race-controls .tdr-pedal,
      #tdr-race-controls .tdr-pedal-hitbox{display:none!important;pointer-events:none!important}
      #tdr-rc-controls{position:fixed;inset:0;z-index:84;pointer-events:none;color:#d9f7ff;font-family:system-ui,-apple-system,sans-serif;user-select:none;-webkit-user-select:none}
      #tdr-rc-controls .rczone{position:fixed;box-sizing:border-box;border:1.5px solid rgba(105,215,246,.55);border-radius:23px;background:linear-gradient(160deg,rgba(14,38,55,.91),rgba(6,13,25,.87));box-shadow:0 8px 25px #0008,inset 0 1px #ffffff24;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;overflow:hidden}
      #tdr-rc-controls .rczone.active{border-color:#72fbbd}
      #tdr-rc-controls .rczone.rc-steer{width:clamp(166px,24vw,242px);height:clamp(105px,19vh,137px)}
      #tdr-rc-controls .rczone.rc-drive{width:clamp(92px,12vw,115px);height:clamp(174px,50vh,217px)}
      #tdr-rc-controls .rclabel{position:absolute;top:8px;left:0;right:0;text-align:center;font:800 10px system-ui;letter-spacing:.075em;opacity:.84;pointer-events:none}
      #tdr-rc-controls .rcpath{position:absolute;background:#90cce150;border-radius:10px;pointer-events:none}
      #tdr-rc-controls .rc-steer .rcpath{height:5px;left:13%;right:13%;top:57%}
      #tdr-rc-controls .rc-drive .rcpath{width:5px;top:17%;bottom:14%;left:50%;transform:translateX(-50%)}
      #tdr-rc-controls .rccenter{position:absolute;pointer-events:none;background:#ffffff5c}
      #tdr-rc-controls .rc-steer .rccenter{width:2px;height:36%;left:50%;top:40%}
      #tdr-rc-controls .rc-drive .rccenter{height:2px;width:48%;left:26%;top:50%}
      #tdr-rc-controls .rcknob{position:absolute;left:50%;top:57%;width:30px;height:48px;border-radius:15px;transform:translate(-50%,-50%);background:#68d8ff;box-shadow:0 0 15px #68d8ff90;pointer-events:none}
      #tdr-rc-controls .rc-drive .rcknob{width:54px;height:32px;top:50%;border-radius:16px}
      #tdr-rc-controls .rcknob.neutral{background:#72ffc0;box-shadow:0 0 14px #72ffc080}
      #tdr-rc-controls .rcmarks{position:absolute;bottom:8px;left:0;right:0;text-align:center;pointer-events:none;font:800 9px system-ui;color:#abc7dd}
      #tdr-rc-controls .rc-drive .rcmarks{top:37%;bottom:auto;font-size:8px}
      #tdr-rc-controls .rc-drive .rcbrake{position:absolute;bottom:7%;left:0;right:0;text-align:center;font:800 9px system-ui;color:#ff9c9c;pointer-events:none}
    `;
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='tdr-rc-controls';
    root.innerHTML=`<div class="rczone rc-drive" data-rc="drive" role="group" aria-label="Palanca RC vertical: acelerar y frenar"><span class="rclabel">GAS ↑</span><span class="rcpath"></span><span class="rccenter"></span><span class="rcknob neutral"></span><span class="rcmarks">CENTRO</span><span class="rcbrake">FRENO ↓</span></div><div class="rczone rc-steer" data-rc="steer" role="group" aria-label="Palanca RC horizontal: dirección"><span class="rclabel">DIRECCIÓN ↔</span><span class="rcpath"></span><span class="rccenter"></span><span class="rcknob neutral"></span><span class="rcmarks">IZQ ◀ · ▶ DER</span></div>`;
    document.body.appendChild(root);
    const drive=root.querySelector('[data-rc="drive"]');
    const steer=root.querySelector('[data-rc="steer"]');
    const layout=()=>{
      const saved=readControlLayout().layout;
      for(const [el,point] of [[drive,saved.gas],[steer,saved.steer]]){
        if(!point)continue;
        el.style.left=`${point.x*100}vw`;
        el.style.top=`${point.y*100}vh`;
        el.style.scale=String(clamp(Number(point.scale)||1,.65,1.55));
      }
    };
    const setSteer=value=>{
      this._tdrRcSteer=value;
      this._applyRcValues();
      const knob=steer.querySelector('.rcknob');
      knob.style.left=`${50+value*38}%`;
      knob.classList.toggle('neutral',value===0);
    };
    const setDrive=value=>{
      const v=rcThrottleBrake(value);
      this._tdrRcGas=v.throttle;
      this._tdrRcBrake=v.brake;
      this._applyRcValues();
      const knob=drive.querySelector('.rcknob');
      knob.style.top=`${50-value*38}%`;
      knob.classList.toggle('neutral',value===0);
    };
    const listeners=[];
    const bind=(el,axis)=>{
      let id=null;
      const knob=el.querySelector('.rcknob');
      const apply=e=>{
        const rect=el.getBoundingClientRect();
        // Absolute coordinates, never accumulated gestures; axes never mix.
        if(axis==='steer'){
          const v=rcAxisValue(e.clientX,(rect.left+rect.right)/2,rect.width*.38,{
            inverted:config.invertSteer===true,sensitivity:config.sensitivity
          });
          setSteer(v);
        }else{
          const v=-rcAxisValue(e.clientY,(rect.top+rect.bottom)/2,rect.height*.38);
          setDrive(v);
        }
      };
      const down=e=>{
        if(id!==null)return;
        id=e.pointerId;
        try{el.setPointerCapture(e.pointerId);}catch{}
        el.classList.add('active');
        apply(e);
        e.preventDefault();e.stopPropagation();
      };
      const move=e=>{if(e.pointerId!==id)return;apply(e);e.preventDefault();e.stopPropagation();};
      const release=e=>{
        if(e.pointerId!==id)return;
        id=null;
        if(axis==='steer')setSteer(0);else setDrive(0);
        knob.classList.add('neutral');
        el.classList.remove('active');
        try{if(el.hasPointerCapture?.(e.pointerId))el.releasePointerCapture(e.pointerId);}catch{}
        e.preventDefault();e.stopPropagation();
      };
      for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',release],
        ['pointercancel',release],['lostpointercapture',release]]){
        el.addEventListener(name,fn,{passive:false});
        listeners.push(()=>el.removeEventListener(name,fn));
      }
    };
    bind(steer,'steer');
    bind(drive,'drive');
    const clear=()=>{
      setSteer(0);setDrive(0);
      steer.classList.remove('active');drive.classList.remove('active');
    };
    window.addEventListener('blur',clear);
    window.addEventListener('resize',layout,{passive:true});
    layout();
    this.events.once('shutdown',()=>{
      clear();
      listeners.forEach(dispose=>dispose());
      window.removeEventListener('blur',clear);
      window.removeEventListener('resize',layout);
      root.remove();style.remove();
    });
  }

  update(time,delta){
    if(!this._tdrRcMode)return super.update(time,delta);
    this._applyRcValues();
    // Reuse the baseline car model: proportional steering is fed through the
    // existing left/right angular rate, while the vertical stick modulates
    // the existing engine/brake forces. No extra physics solver.
    const keys=this.keys||{},left=keys.left,right=keys.right;
    const oldLeft=left?.isDown,oldRight=right?.isDown;
    const oldTurn=Number(this.turnRate);
    const oldAccel=Number(this.accel),oldBrakeForce=Number(this.brakeForce);
    const steer=this._tdrRcSteer;
    try{
      if(left)left.isDown=steer<-.015;
      if(right)right.isDown=steer>.015;
      if(Number.isFinite(oldTurn))this.turnRate=oldTurn*Math.abs(steer);
      if(Number.isFinite(oldAccel))this.accel=oldAccel*clamp(this._tdrRcGas,.0,1);
      if(Number.isFinite(oldBrakeForce))this.brakeForce=oldBrakeForce*clamp(this._tdrRcBrake,.0,1);
      return super.update(time,delta);
    }finally{
      if(left)left.isDown=oldLeft;
      if(right)right.isDown=oldRight;
      if(Number.isFinite(oldTurn))this.turnRate=oldTurn;
      if(Number.isFinite(oldAccel))this.accel=oldAccel;
      if(Number.isFinite(oldBrakeForce))this.brakeForce=oldBrakeForce;
      this._applyRcValues();
    }
  }
}

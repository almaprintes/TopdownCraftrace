import { RaceScene as CurrentRaceScene } from './RaceLeftHandedControlsScene.js';
import {createRelativeSteeringGesture} from '../controls/relativeSteeringGesture.js';

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
    this._tdrWheelSteer=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
    if(!this.touch)return;
    this.touch.targetAngle=null;
    this.touch.stickX=0;
    this.touch.stickY=0;
    this.touch.steer=this._tdrWheelSteer;
    this.touch.buttonSteer=0;
    this.touch.leftActive=Math.abs(this._tdrWheelSteer)>.008;
  }

  _buildSteeringWheel(){
    // The historical 'wheel' preference now means a relative horizontal touch
    // steering strip. Signed finger movement alters lock from its CURRENT value,
    // not from the initial finger position. Preserve existing saved preferences.
    document.getElementById('tdr-steering-wheel')?.remove?.();
    document.getElementById('tdr-steering-wheel-style')?.remove?.();
    const left=!!prefs().leftHanded;
    const style=document.createElement('style');
    style.id='tdr-steering-wheel-style';
    style.textContent=`
      #tdr-race-controls .tdr-stick{display:none!important}
      #tdr-steering-wheel{position:fixed;z-index:80;${left?'right':'left'}:max(15px,1.8vw);bottom:max(10px,1.8vh);width:clamp(180px,28vw,320px);height:clamp(110px,22vh,160px);border:1px solid rgba(101,222,255,.45);border-radius:24px;background:linear-gradient(160deg,rgba(12,34,48,.84),rgba(5,12,22,.83));box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 24px rgba(0,0,0,.28);pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;overflow:hidden;box-sizing:border-box}
      #tdr-steering-wheel .track{position:absolute;left:12%;right:12%;top:53%;height:7px;border-radius:6px;background:rgba(128,177,199,.25);transform:translateY(-50%);pointer-events:none}
      #tdr-steering-wheel .center{position:absolute;left:50%;top:36%;height:38%;width:2px;background:rgba(255,255,255,.36);pointer-events:none}
      #tdr-steering-wheel .thumb{position:absolute;left:50%;top:53%;width:26px;height:46px;border-radius:13px;transform:translate(-50%,-50%);background:#65deff;box-shadow:0 0 14px rgba(85,221,255,.48);pointer-events:none}
      #tdr-steering-wheel .thumb.neutral{background:#55ff9d;box-shadow:0 0 15px rgba(85,255,157,.48)}
      #tdr-steering-wheel .caption{position:absolute;left:0;right:0;top:10%;font:700 11px system-ui,sans-serif;color:rgba(214,244,255,.84);text-align:center;letter-spacing:.08em;pointer-events:none}
      #tdr-steering-wheel.active{border-color:rgba(101,222,255,.9)}
    `;
    document.head.appendChild(style);
    const zone=document.createElement('div');
    zone.id='tdr-steering-wheel';
    zone.setAttribute('role','group');
    zone.setAttribute('aria-label','Dirección táctil de precisión');
    zone.innerHTML='<div class="caption">DESLIZA PARA GIRAR</div><div class="track"></div><div class="center"></div><div class="thumb neutral"></div>';
    document.body.appendChild(zone);

    let activeId=null;
    const gesture=createRelativeSteeringGesture();
    const thumb=zone.querySelector('.thumb');
    const reset=()=>{
      gesture.end();
      this._applyWheelSteer(0);
      thumb.style.left='50%';
      thumb.classList.add('neutral');
      zone.classList.remove('active');
    };
    const down=e=>{
      if(activeId!==null)return;
      activeId=e.pointerId;
      gesture.start(e.clientX);
      try{zone.setPointerCapture(e.pointerId);}catch{}
      zone.classList.add('active');
      this._applyWheelSteer(0);
      thumb.style.left='50%';
      thumb.classList.add('neutral');
      e.preventDefault();
    };
    const move=e=>{
      if(activeId!==e.pointerId)return;
      const config=prefs();
      const value=gesture.move(e.clientX,{
        sensitivity:config.sensitivity,
        inverted:config.invertSteer===true
      });
      this._applyWheelSteer(value);
      thumb.style.left=`${50+value*38}%`;
      thumb.classList.toggle('neutral',value===0);
      e.preventDefault();
    };
    const release=e=>{
      if(activeId!==e.pointerId)return;
      activeId=null;
      reset();
      try{if(zone.hasPointerCapture?.(e.pointerId))zone.releasePointerCapture(e.pointerId);}catch{}
      e.preventDefault();
    };
    zone.addEventListener('pointerdown',down,{passive:false});
    zone.addEventListener('pointermove',move,{passive:false});
    zone.addEventListener('pointerup',release,{passive:false});
    zone.addEventListener('pointercancel',release,{passive:false});
    zone.addEventListener('lostpointercapture',release,{passive:false});
    this.events.once('shutdown',()=>{
      reset();
      zone.removeEventListener('pointerdown',down);
      zone.removeEventListener('pointermove',move);
      zone.removeEventListener('pointerup',release);
      zone.removeEventListener('pointercancel',release);
      zone.removeEventListener('lostpointercapture',release);
      zone.remove();
      document.getElementById('tdr-steering-wheel-style')?.remove();
    });
  }

  update(time,delta){
    if(!this._tdrWheelMode)return super.update(time,delta);

    const steer=this._tdrWheelSteer||0;
    this._applyWheelSteer(steer);

    const k=this.keys||{};
    const lk=k.left,rk=k.right;
    const oldL=lk?.isDown,oldR=rk?.isDown;
    const oldTurn=Number(this.turnRate);
    const abs=Math.abs(steer);
    try{
      if(lk)lk.isDown=steer<-.012;
      if(rk)rk.isDown=steer>.012;
      if(Number.isFinite(oldTurn))this.turnRate=oldTurn*Math.max(.08,abs);
      super.update(time,delta);
    }finally{
      if(lk)lk.isDown=oldL;
      if(rk)rk.isDown=oldR;
      if(Number.isFinite(oldTurn))this.turnRate=oldTurn;
      this._applyWheelSteer(steer);
    }
  }
}

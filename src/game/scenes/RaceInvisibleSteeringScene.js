import {RaceScene as CurrentRaceScene} from './RaceRcTwinAxisScene.js';
import {createInvisibleSteeringGesture} from '../controls/invisibleSteeringGesture.js';

const SETTINGS_KEY='tdr2:settings';
function controls(){
  try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}
  catch{return {};}
}

// Experimental "invisible steering": any touch in the steering half creates
// its own neutral center; horizontal movement controls steering proportionally.
// The standard right-side gas, brake and handbrake are supplied unchanged by
// RaceHandbrakeScene, which subclasses this scene.
export class RaceScene extends CurrentRaceScene{
  create(data){
    const pref=controls();
    this._tdrInvisibleSteeringMode=pref.steeringMode==='invisible';
    this._tdrInvisibleSteer=0;
    const result=super.create(data);
    if(this._tdrInvisibleSteeringMode)this._buildInvisibleSteering(pref);
    return result;
  }

  createTouchControls(){
    if(!this._tdrInvisibleSteeringMode)return super.createTouchControls();
    const state={
      steer:0,throttle:0,brake:0,stickX:0,stickY:0,targetAngle:null,
      buttonSteer:0,leftId:null,rightId:null,leftActive:false,
      rightThrottle:false,rightBrake:false,btnW:0,btnH:0,rightX:0,
      throttleY:0,brakeY:0,_draw:()=>{}
    };
    this.touchUI=this.add.container(0,0).setScrollFactor(0).setDepth(1000);
    this.touchUI.setVisible(false);
    try{this.cameras.main.ignore(this.touchUI);}catch{}
    // No Phaser joystick or generic pedal input competes with the DOM controls.
    return state;
  }

  _buildInvisibleSteering(pref){
    document.getElementById('tdr-invisible-steering-zone')?.remove();
    const zone=document.createElement('div');
    zone.id='tdr-invisible-steering-zone';
    zone.setAttribute('role','group');
    zone.setAttribute('aria-label','Zona invisible de dirección izquierda y derecha');
    const left=pref.leftHanded!==true;
    // The control is truly invisible: transparent even when pressed. Use
    // client pixel coordinates rather than Phaser renderResolution.
    zone.style.cssText=[
      'position:fixed','top:0','bottom:0',
      left?'left:0':'right:0','width:50vw','z-index:79',
      'background:transparent','border:0','opacity:1',
      'pointer-events:auto','touch-action:none','user-select:none',
      '-webkit-user-select:none','-webkit-touch-callout:none',
      '-webkit-tap-highlight-color:transparent'
    ].join(';');
    document.body.appendChild(zone);

    const gesture=createInvisibleSteeringGesture({
      travelPx:92,
      sensitivity:pref.sensitivity,
      inverted:pref.invertSteer===true
    });
    let activePointer=null;
    const steer=value=>{
      this._tdrInvisibleSteer=value;
      this._applyWheelSteer(value);
    };
    const reset=()=>{
      activePointer=null;
      gesture.end();
      steer(0);
    };
    const down=e=>{
      if(activePointer!==null||!this.sys?.isActive?.())return;
      activePointer=e.pointerId;
      steer(gesture.start(e.clientX));
      try{zone.setPointerCapture(e.pointerId);}catch{}
      e.preventDefault();e.stopPropagation();
    };
    const move=e=>{
      if(e.pointerId!==activePointer)return;
      steer(gesture.move(e.clientX));
      e.preventDefault();e.stopPropagation();
    };
    const up=e=>{
      if(e.pointerId!==activePointer)return;
      reset();
      try{if(zone.hasPointerCapture?.(e.pointerId))zone.releasePointerCapture(e.pointerId);}catch{}
      e.preventDefault();e.stopPropagation();
    };
    const blur=()=>reset();
    const onVisibility=()=>{if(document.hidden)reset();};
    const handlers=[
      ['pointerdown',down],['pointermove',move],['pointerup',up],
      ['pointercancel',up],['lostpointercapture',up]
    ];
    handlers.forEach(([event,fn])=>zone.addEventListener(event,fn,{passive:false}));
    window.addEventListener('blur',blur);
    document.addEventListener('visibilitychange',onVisibility);
    this.events.once('shutdown',()=>{
      reset();
      handlers.forEach(([event,fn])=>zone.removeEventListener(event,fn));
      window.removeEventListener('blur',blur);
      document.removeEventListener('visibilitychange',onVisibility);
      zone.remove();
    });
  }

  update(time,delta){
    if(!this._tdrInvisibleSteeringMode)return super.update(time,delta);
    const steer=this._tdrInvisibleSteer;
    this._applyWheelSteer(steer);
    const keys=this.keys||{},left=keys.left,right=keys.right;
    const previousLeft=left?.isDown,previousRight=right?.isDown;
    const previousRate=Number(this.turnRate);
    try{
      if(left)left.isDown=steer<-.012;
      if(right)right.isDown=steer>.012;
      if(Number.isFinite(previousRate))this.turnRate=previousRate*Math.abs(steer);
      return super.update(time,delta);
    }finally{
      if(left)left.isDown=previousLeft;
      if(right)right.isDown=previousRight;
      if(Number.isFinite(previousRate))this.turnRate=previousRate;
      this._applyWheelSteer(steer);
    }
  }
}

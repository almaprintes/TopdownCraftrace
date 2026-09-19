import { RaceScene as TouchRaceScene } from './RaceControlSchemeScene.js';

const SETTINGS_KEY = 'tdr2:settings';
const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

function readSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch (_) { return {}; }
}
function selectedMode() { return readSettings()?.controls?.steeringMode || 'stick'; }
function firstPad() {
  try { return Array.from(navigator.getGamepads?.() || []).find(p => p && p.connected !== false) || null; }
  catch (_) { return null; }
}
function digital(p, i) { const b=p?.buttons?.[i]; return !!b && (b.pressed || Number(b.value)>.5); }
function triggerValue(button) {
  if (!button) return 0;
  const v = Number(button.value);
  return clamp01(Number.isFinite(v) ? v : (button.pressed ? 1 : 0));
}
function stickVector(rawX, rawY, dz = 0.12) {
  const x=Math.max(-1,Math.min(1,Number(rawX)||0)), y=Math.max(-1,Math.min(1,Number(rawY)||0));
  const mag=Math.hypot(x,y); if(mag<=dz)return{x:0,y:0,mag:0};
  const usable=(Math.min(1,mag)-dz)/(1-dz); return{x:(x/mag)*usable,y:(y/mag)*usable,mag:usable};
}

export class RaceScene extends TouchRaceScene {
  create(data) {
    const wanted=selectedMode();
    this._tdrGamepadMode=wanted==='gamepad';
    let originalRaw=null;
    if(this._tdrGamepadMode){
      try{
        originalRaw=localStorage.getItem(SETTINGS_KEY);
        const temp=originalRaw?JSON.parse(originalRaw):{};
        temp.controls={...(temp.controls||{}),steeringMode:'buttons',scheme:'gamepad'};
        localStorage.setItem(SETTINGS_KEY,JSON.stringify(temp));
      }catch(_){}
    }
    let result;
    try{result=super.create(data);}finally{
      if(this._tdrGamepadMode){try{if(originalRaw==null)localStorage.removeItem(SETTINGS_KEY);else localStorage.setItem(SETTINGS_KEY,originalRaw);}catch(_){}}
    }
    if(!this._tdrGamepadMode)return result;

    this._tdrSteeringMode='gamepad';
    this._destroyButtonSteeringUi?.();
    this._tdrDestroyTouchSteeringUi();
    this._tdrHideTouchDrivingDom();
    this._tdrEnsurePadMeters();
    this._tdrPadPrevOptions=false;
    this._tdrPadRefresh=()=>{this._tdrDestroyTouchSteeringUi();this._tdrHideTouchDrivingDom();this._tdrEnsurePadMeters();};
    for(const ev of ['focus','pageshow','gamepadconnected'])window.addEventListener(ev,this._tdrPadRefresh,{passive:true});
    document.addEventListener('visibilitychange',this._tdrPadRefresh,{passive:true});

    // Poll OPTIONS outside Phaser's update clock too. The pause stack can freeze
    // scene updates, but a second OPTIONS press must always resume the race.
    const pollOptions=()=>{
      if(!this._tdrGamepadMode||!this.sys?.isActive?.())return;
      this._tdrHandleOptions(firstPad());
      this._tdrPadOptionsRaf=requestAnimationFrame(pollOptions);
    };
    this._tdrPadOptionsRaf=requestAnimationFrame(pollOptions);

    this.events.once('shutdown',()=>this._tdrPadCleanup());
    return result;
  }

  _tdrDestroyTouchSteeringUi(){
    if(!this._tdrGamepadMode)return;
    // In gamepad mode the physical stick writes directly into this.touch.
    // The Phaser touch container is presentation-only, so destroy it instead
    // of repeatedly hiding by geometry. This removes the legacy joystick at source.
    const ui=this.touchUI;
    if(ui){
      try{for(const child of [...(ui.list||[])]){try{child?.disableInteractive?.();}catch(_){}}}catch(_){}
      try{ui.destroy?.(true);}catch(_){}
      if(this.touchUI===ui)this.touchUI=null;
    }
    try{this._destroyButtonSteeringUi?.();}catch(_){}
    try{document.querySelectorAll('[data-tdr-steering-button],#tdr-steering-wheel').forEach(el=>el.remove());}catch(_){}
  }

  _tdrHideTouchDrivingDom(){
    try{
      document.querySelectorAll('[data-tdr-steering-button]').forEach(el=>el.remove());
      // Do not mutate the shared #tdr-race-controls root: it owns unrelated
      // race HUD and touch controls. Gamepad-specific presentation is handled
      // by the gamepad CSS class and this scene's own Phaser UI teardown.
    }catch(_){}
  }

  _tdrEnsurePadMeters(){
    if(this._tdrPadMeters?.isConnected)return;
    const root=document.createElement('div');
    root.id='tdr-gamepad-pedals'; root.dataset.tdrGamepadFeedback='1';
    root.style.cssText='position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:8100;display:flex;gap:9px;pointer-events:none;color:#fff;font-family:system-ui';
    root.innerHTML='<div style="width:46px"><div style="font:900 8px system-ui;text-align:center;margin-bottom:3px">L2</div><div style="height:64px;border:1px solid #ff667a88;background:#18090dcc;border-radius:8px;overflow:hidden;display:flex;align-items:flex-end"><i data-brake style="display:block;width:100%;height:0%;background:#ff405c;opacity:.9"></i></div></div><div style="width:46px"><div style="font:900 8px system-ui;text-align:center;margin-bottom:3px">R2</div><div style="height:64px;border:1px solid #52ff9b88;background:#07150dcc;border-radius:8px;overflow:hidden;display:flex;align-items:flex-end"><i data-gas style="display:block;width:100%;height:0%;background:#32e97d;opacity:.9"></i></div></div>';
    document.body.appendChild(root); this._tdrPadMeters=root;
  }
  _tdrMeters(gas,brake){
    const r=this._tdrPadMeters;if(!r)return;
    const g=r.querySelector('[data-gas]'),b=r.querySelector('[data-brake]');
    if(g)g.style.height=`${Math.round(gas*100)}%`; if(b)b.style.height=`${Math.round(brake*100)}%`;
  }
  _tdrHandleOptions(p){
    const down=digital(p,9);
    if(down&&!this._tdrPadPrevOptions){
      const open=this._tdrPauseMenuOpen===true||!!this._experiencePauseUi?.root?.isConnected;
      try{open?this._closePauseMenu?.(true):this._openPauseMenu?.();}catch(_){}
    }
    this._tdrPadPrevOptions=down;
  }

  update(time,delta){
    if(!this._tdrGamepadMode){super.update(time,delta);return;}
    const p=firstPad(),touch=this.touch;
    let gas=0,brake=0,handbrake=false;
    if(touch){
      if(p){
        const v=stickVector(p.axes?.[0],p.axes?.[1]);
        const dl=digital(p,14),dr=digital(p,15),dpad=dl&&!dr?-1:dr&&!dl?1:0;
        if(dpad){touch.stickX=0;touch.stickY=0;touch.targetAngle=null;touch.steer=dpad;touch.leftActive=true;touch.buttonSteer=0;}
        else if(v.mag>=.02){touch.stickX=v.x;touch.stickY=v.y;touch.steer=v.x;touch.leftActive=true;touch.buttonSteer=0;touch.targetAngle=Math.atan2(v.y,v.x)-(Math.PI/2);}
        else{touch.stickX=0;touch.stickY=0;touch.targetAngle=null;touch.steer=0;touch.leftActive=false;touch.buttonSteer=0;}
        gas=triggerValue(p.buttons?.[7]);brake=triggerValue(p.buttons?.[6]);handbrake=digital(p,1);
        touch.throttle=gas;touch.brake=brake;touch.rightThrottle=gas>.01;touch.rightBrake=brake>.01;
        touch.handbrake=handbrake;touch.handBrake=handbrake;
        // RaceHandbrakePhysicsScene consumes this authoritative flag.
        this._tdrHandbrake=handbrake;
      }else{
        touch.stickX=0;touch.stickY=0;touch.targetAngle=null;touch.steer=0;touch.leftActive=false;touch.buttonSteer=0;touch.throttle=0;touch.brake=0;touch.rightThrottle=false;touch.rightBrake=false;touch.handbrake=false;touch.handBrake=false;this._tdrHandbrake=false;
      }
    }
    this._tdrMeters(gas,brake);
    super.update(time,delta);
    if(p&&touch){touch.throttle=gas;touch.brake=brake;touch.handbrake=handbrake;touch.handBrake=handbrake;this._tdrHandbrake=handbrake;}
  }

  _tdrPadCleanup(){
    try{cancelAnimationFrame(this._tdrPadOptionsRaf);}catch(_){} this._tdrPadOptionsRaf=null;
    for(const ev of ['focus','pageshow','gamepadconnected'])try{window.removeEventListener(ev,this._tdrPadRefresh);}catch(_){}
    try{document.removeEventListener('visibilitychange',this._tdrPadRefresh);}catch(_){}
    try{this._tdrPadMeters?.remove?.();}catch(_){} this._tdrPadMeters=null;
    this._tdrHandbrake=false;
  }
}
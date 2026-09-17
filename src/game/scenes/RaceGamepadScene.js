import { RaceScene as CurrentRaceScene } from './RaceEmbeddedReplaySceneV2.js';

const SETTINGS_KEY='tdr2:settings';
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
function cfg(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls||{};}catch{return {};}}
function pad(){try{return Array.from(navigator.getGamepads?.()||[]).find(p=>p&&p.connected!==false)||null;}catch{return null;}}
function digital(p,i){const b=p?.buttons?.[i];return !!b&&(b.pressed||Number(b.value)>.5);}
function analog(p,i){const b=p?.buttons?.[i];if(!b)return 0;const v=Number(b.value);return clamp01(Number.isFinite(v)?v:(b.pressed?1:0));}
function stick(v,dz=.12){v=Math.max(-1,Math.min(1,Number(v)||0));if(Math.abs(v)<=dz)return 0;return Math.sign(v)*(Math.abs(v)-dz)/(1-dz);}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._tdrPadPrevOptions=false;
    this._tdrPadRefresh=()=>this._tdrRefreshPadMode();
    for(const ev of ['focus','pageshow','gamepadconnected','gamepaddisconnected'])window.addEventListener(ev,this._tdrPadRefresh,{passive:true});
    document.addEventListener('visibilitychange',this._tdrPadRefresh,{passive:true});
    this.events.once('shutdown',()=>this._tdrPadCleanup());
    this._tdrRefreshPadMode();
    return result;
  }
  _tdrRefreshPadMode(){
    if(this._tdrEmbeddedReplay)return;
    requestAnimationFrame(()=>{
      const active=!!pad();
      try{document.body.classList.toggle('tdr-gamepad-active',active);}catch{}
      if(active)this._tdrEnsurePadMeters();else this._tdrRemovePadMeters();
    });
  }
  _tdrEnsurePadMeters(){
    if(this._tdrPadMeters?.isConnected)return;
    const root=document.createElement('div');root.id='tdr-gamepad-pedals';root.dataset.tdrRaceHud='1';
    root.style.cssText='position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:2147482500;display:flex;gap:9px;pointer-events:none;color:#fff;font-family:system-ui';
    root.innerHTML=`<div style="width:54px"><div style="font:900 8px system-ui;text-align:center;margin-bottom:3px">L2 BRAKE</div><div style="height:68px;border:1px solid #ff667a88;background:#18090d;border-radius:9px;overflow:hidden;display:flex;align-items:flex-end"><i data-brake style="display:block;width:100%;height:0%;background:#ff405c;opacity:.82"></i></div></div><div style="width:54px"><div style="font:900 8px system-ui;text-align:center;margin-bottom:3px">R2 GAS</div><div style="height:68px;border:1px solid #52ff9b88;background:#07150d;border-radius:9px;overflow:hidden;display:flex;align-items:flex-end"><i data-gas style="display:block;width:100%;height:0%;background:#32e97d;opacity:.82"></i></div></div>`;
    document.body.appendChild(root);this._tdrPadMeters=root;
  }
  _tdrMeters(gas,brake){const r=this._tdrPadMeters;if(!r)return;const g=r.querySelector('[data-gas]'),b=r.querySelector('[data-brake]');if(g)g.style.height=`${Math.round(gas*100)}%`;if(b)b.style.height=`${Math.round(brake*100)}%`;}
  _tdrReadPad(){
    const p=pad();if(!p)return null;
    const gradual=cfg().gamepadGradualPedals!==false;
    const dl=digital(p,14),dr=digital(p,15); // D-pad has priority while held
    const steer=dl&&!dr?-1:dr&&!dl?1:stick(p.axes?.[0]);
    const rg=analog(p,7),rb=analog(p,6);
    const gas=gradual?rg:(rg>.12?1:0),brake=gradual?rb:(rb>.12?1:0);
    return{steer,gas,brake,handbrake:digital(p,1),options:digital(p,9)};
  }
  _tdrApplyPad(s){
    if(!s||!this.touch)return;
    this.touch.steer=s.steer;this.touch.stickX=s.steer;this.touch.stickY=0;this.touch.targetAngle=null;
    this.touch.leftActive=Math.abs(s.steer)>.001;this.touch.buttonSteer=s.steer;
    this.touch.throttle=s.gas;this.touch.brake=s.brake;this.touch.rightThrottle=s.gas>.01;this.touch.rightBrake=s.brake>.01;
    this.touch.handbrake=s.handbrake;this.touch.handBrake=s.handbrake;
  }
  _tdrHandleOptions(s){
    if(!s)return;const down=!!s.options;
    if(down&&!this._tdrPadPrevOptions){const open=this._tdrPauseMenuOpen===true||!!this._experiencePauseUi?.root?.isConnected;try{open?this._closePauseMenu?.(true):this._openPauseMenu?.();}catch{}}
    this._tdrPadPrevOptions=down;
  }
  update(time,delta){
    const s=this._tdrReadPad();
    if(s){this._tdrApplyPad(s);this._tdrHandleOptions(s);this._tdrMeters(s.gas,s.brake);}
    const result=super.update(time,delta);
    if(s)this._tdrApplyPad(s);
    return result;
  }
  _tdrPadCleanup(){
    for(const ev of ['focus','pageshow','gamepadconnected','gamepaddisconnected'])try{window.removeEventListener(ev,this._tdrPadRefresh);}catch{}
    try{document.removeEventListener('visibilitychange',this._tdrPadRefresh);document.body.classList.remove('tdr-gamepad-active');}catch{}
    this._tdrRemovePadMeters();
  }
  _tdrRemovePadMeters(){try{this._tdrPadMeters?.remove?.();}catch{}this._tdrPadMeters=null;}
}

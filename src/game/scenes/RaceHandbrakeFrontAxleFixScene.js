import { RaceScene as CurrentRaceScene } from './RaceCleanLapScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Experimental shared handbrake model.
// Simplified bicycle dynamics: the front axle keeps lateral authority while
// the rear loses most of it under handbrake. Left/right are the same equations
// with opposite steering sign. No position teleporting and no artificial speed gain.
export class RaceScene extends CurrentRaceScene {
  create(data){
    this._hbBicycleYawRate=0;
    this._tdrPauseMenuOpen=false;
    this._tdrPauseHiddenPhaser=[];
    this._tdrPauseHiddenDom=[];
    this._tdrPauseUiCameraVisible=null;
    const result=super.create(data);

    const updateRaceInfoHud=typeof this._updateRaceInfoHud==='function'
      ? this._updateRaceInfoHud.bind(this)
      : null;
    if(updateRaceInfoHud){
      this._updateRaceInfoHud=(delta=0)=>{
        if(this._tdrPauseMenuOpen)return;
        return updateRaceInfoHud(delta);
      };
    }
    return result;
  }

  _hidePauseHud(){
    // The dedicated UI camera is the authoritative Phaser HUD surface. Turning
    // it off is safer than guessing HUD membership from depth values.
    try{
      if(this.uiCam){
        if(this._tdrPauseUiCameraVisible===null)this._tdrPauseUiCameraVisible=this.uiCam.visible!==false;
        this.uiCam.setVisible?.(false);
        this.uiCam.visible=false;
      }
    }catch{}

    const phaser=this._tdrPauseHiddenPhaser||[];
    const seen=new Set(phaser);
    const hideObj=(obj)=>{
      if(!obj?.scene||obj.visible===false||seen.has(obj))return;
      try{obj.setVisible?.(false);seen.add(obj);phaser.push(obj);}catch{}
    };

    // raceInfoHud is pinned separately and can render outside the usual HUD
    // discovery path. Fixed UI roots cover the upper competition HUD and any
    // future pinned Phaser overlays.
    hideObj(this.raceInfoHud);
    try{for(const obj of this._fixedUiRoots||[])hideObj(obj);}catch{}

    // Fallback for legacy/high-depth HUD objects not registered as fixed roots.
    try{for(const obj of this.children?.list||[]){if(Number(obj?.depth||0)>=1000)hideObj(obj);}}catch{}
    this._tdrPauseHiddenPhaser=phaser;

    if(!this._tdrPauseHiddenDom?.length){
      const dom=[];
      try{
        const pause=this._pauseModal;
        for(const el of document.querySelectorAll('[data-tdr-race-ui="1"]')){
          if(el===pause||pause?.contains?.(el)||el.contains?.(pause))continue;
          dom.push([el,el.style.display]);el.style.display='none';
        }
      }catch{}
      this._tdrPauseHiddenDom=dom;
    }
  }

  _restorePauseHud(){
    try{
      if(this.uiCam&&this._tdrPauseUiCameraVisible!==null){
        this.uiCam.setVisible?.(this._tdrPauseUiCameraVisible);
        this.uiCam.visible=this._tdrPauseUiCameraVisible;
      }
    }catch{}
    this._tdrPauseUiCameraVisible=null;
    try{for(const obj of this._tdrPauseHiddenPhaser||[])if(obj?.scene)obj.setVisible?.(true);}catch{}
    this._tdrPauseHiddenPhaser=[];
    try{for(const [el,display] of this._tdrPauseHiddenDom||[])if(el?.style)el.style.display=display;}catch{}
    this._tdrPauseHiddenDom=[];
  }

  _openPauseMenu(...args){
    if(this._tdrPauseMenuOpen)return this._pauseModal;
    this._tdrPauseMenuOpen=true;
    const result=super._openPauseMenu?.(...args);
    try{this.physics?.world?.pause?.();}catch{}
    this._hidePauseHud();
    return result;
  }

  _closePauseMenu(resume=true,...rest){
    const shouldResume=resume!==false;
    const result=super._closePauseMenu?.(resume,...rest);
    if(shouldResume){
      this._tdrPauseMenuOpen=false;
      this._restorePauseHud();
      try{this.physics?.world?.resume?.();}catch{}
      try{this._updateRaceInfoHud?.(0);}catch{}
    }else{
      this._tdrPauseMenuOpen=true;
      this._hidePauseHud();
    }
    return result;
  }

  update(time,delta){
    if(this._tdrPauseMenuOpen){
      try{this.physics?.world?.pause?.();}catch{}
      this._hidePauseHud();
      return;
    }
    return super.update?.(time,delta);
  }

  _applyHandbrakePhysics(delta){
    const body=this.carBody;
    const vel=body?.body?.velocity;
    if(!body?.scene||!vel)return;
    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    if(!this._tdrHandbrake||!this._raceStarted){this._hbBicycleYawRate*=Math.exp(-dt*8.5);return;}
    const speed=Math.hypot(Number(vel.x)||0,Number(vel.y)||0);if(speed<24)return;
    const rot=Number(body.rotation||0),fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx;
    const u=vel.x*fx+vel.y*fy,v=vel.x*rx+vel.y*ry,absU=Math.max(55,Math.abs(u));
    const steer=clamp(Number(this._steerForHandbrake?.()||0),-1,1);
    const longSide=Math.max(Number(body.displayWidth||0),Number(body.displayHeight||0),54),wheelbase=clamp(longSide*.62,30,64),lf=wheelbase*.47,lr=wheelbase*.53,steerAngle=steer*.36;
    let yawRate=Number(this._hbBicycleYawRate||0);
    const alphaF=Math.atan2(v+lf*yawRate,absU)-steerAngle,alphaR=Math.atan2(v-lr*yawRate,absU);
    const frontForce=clamp(-5.6*alphaF,-1.35,1.35),rearForce=clamp(-.72*alphaR,-.34,.34);
    const maxFwd=Math.max(180,Number(this.maxFwd||this.carParams?.maxFwd||520)),speed01=clamp(speed/maxFwd,0,1);
    const lateralAccel=(frontForce+rearForce)*speed*(.78+.34*speed01),yawAccel=((lf*frontForce)-(lr*rearForce))/wheelbase*(4.0+2.0*speed01);
    yawRate+=yawAccel*dt;yawRate*=Math.exp(-dt*.42);yawRate=clamp(yawRate,-2.8,2.8);this._hbBicycleYawRate=yawRate;
    vel.x+=rx*lateralAccel*dt;vel.y+=ry*lateralAccel*dt;
    const drag=Math.exp(-dt*(.34+.34*speed01));vel.x*=drag;vel.y*=drag;
    const after=Math.hypot(vel.x,vel.y),maxAllowed=speed*1.001;if(after>maxAllowed&&after>1e-6){const k=maxAllowed/after;vel.x*=k;vel.y*=k;}
    body.rotation=rot+yawRate*dt;
    if(this.carRig?.scene){this.carRig.x=body.x;this.carRig.y=body.y;this.carRig.rotation=body.rotation+(this._carVisualRotOffset||0);}
  }
}

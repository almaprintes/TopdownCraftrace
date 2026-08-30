import { RaceScene as CurrentRaceScene } from './RaceCleanLapScene.js';
import { grantRaceLoot, getRaceLootSessionSummary } from '../garage/garageStore.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const BASE=import.meta.env.BASE_URL||'/';

// Final shipping race wrapper. This layer is deliberately the last class loaded by
// game.js, so cross-cutting guards here apply to the real iOS/Android race path.
export class RaceScene extends CurrentRaceScene {
  create(data){
    this._hbBicycleYawRate=0;
    this._tdrPauseMenuOpen=false;
    this._tdrPauseHiddenPhaser=[];
    this._tdrPauseHiddenDom=[];
    this._tdrPauseUiCameraVisible=null;
    this._tdrPauseRaceHudState=null;
    const result=super.create(data);

    // Baseline the actual time-trial history and economy session after every lower
    // race layer has finished create(). This lets the final shipping wrapper detect
    // a valid completed lap that failed to reach the reward pipeline on a device.
    this._tdrRewardHistorySeen=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._tdrRewardExpected=Number(getRaceLootSessionSummary?.()?.laps||0);

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
    // The visible shipping instrument HUD is DOM, created by
    // RaceLapBreakdownProfilerScene as .tdr-race-hud. It has no race-ui data
    // attribute, which is why the previous generic DOM sweep never hid it.
    try{
      const hud=this._raceHudDom||document.querySelector('.tdr-race-hud');
      if(hud?.isConnected){
        if(!this._tdrPauseRaceHudState)this._tdrPauseRaceHudState={el:hud,display:hud.style.display};
        hud.style.setProperty('display','none','important');
      }
    }catch{}

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
    hideObj(this.raceInfoHud);
    try{for(const obj of this._fixedUiRoots||[])hideObj(obj);}catch{}
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
      const state=this._tdrPauseRaceHudState;
      if(state?.el?.style){state.el.style.removeProperty('display');if(state.display)state.el.style.display=state.display;}
    }catch{}
    this._tdrPauseRaceHudState=null;
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

  // RaceLootEconomyScene is the real shipping chest presenter beneath this class.
  // Override its visual here so every platform that reaches the old presenter gets
  // the Season Pass reward-card language instead of the legacy orange CSS chest.
  _showChestOpening(meta,resultRoot=null){
    const result=super._showChestOpening?.(meta,resultRoot);
    const root=this._chestDom;
    if(!root?.isConnected)return result;
    try{
      const lap=Math.max(5,Number(meta?.sessionLap||5));
      const tier=Math.max(5,Math.floor(lap/5)*5);
      const tone=tier>=20?'gold':tier>=15?'purple':tier>=10?'green':'blue';
      const box=root.querySelector('.tdrchest-box');
      if(box){
        box.innerHTML=`<img src="${BASE}assets/season/reward_cards/free_${tone}.svg" alt="Cofre ${tier}" style="display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(0,0,0,.5))">`;
        box.style.width='132px';box.style.height='169px';box.style.filter='none';
      }
      const title=root.querySelector('.tdrchest-card h2');if(title)title.textContent=`COFRE DE ${tier} VUELTAS`;
      const kicker=root.querySelector('.tdrchest-k');if(kicker)kicker.textContent=`BONUS DE SESIÓN · VUELTA ${lap}`;
      const tap=root.querySelector('.tdrchest-tap');if(tap)tap.textContent='TOCA PARA ABRIR';
    }catch{}
    return result;
  }

  _guardCompletedLapRewards(){
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const seen=Math.max(0,Number(this._tdrRewardHistorySeen)||0);
    if(hist.length<=seen)return;
    const rows=hist.slice(seen);
    this._tdrRewardHistorySeen=hist.length;
    const validRows=rows.filter(row=>row?.valid!==false&&row?.invalid!==true&&Number.isFinite(Number(row?.lapMs))&&Number(row.lapMs)>0);
    if(!validRows.length)return;
    this._tdrRewardExpected+=validRows.length;
    const target=this._tdrRewardExpected;

    // Give lower layers time to execute their normal reward path first. Android
    // currently does, so this becomes a no-op there. If iOS recorded the lap in
    // ttHistory but the reward path was skipped, fill only the missing session-lap
    // grants. getRaceLootSessionSummary().laps is incremented by grantRaceLoot,
    // making this guard idempotent instead of blindly duplicating inventory.
    this.time?.delayedCall?.(160,()=>{
      let delivered=Number(getRaceLootSessionSummary?.()?.laps||0);
      if(delivered>=target)return;
      const missing=Math.min(validRows.length,target-delivered);
      const candidates=validRows.slice(validRows.length-missing);
      const trackKey=String(this.trackKey||this.track?.key||this.track?.id||'track01');
      for(const row of candidates){
        delivered=Number(getRaceLootSessionSummary?.()?.laps||0);
        if(delivered>=target)break;
        try{
          const reward=grantRaceLoot({trackKey,lapMs:Number(row.lapMs)});
          this._showRaceLoot?.(reward);
        }catch(err){console.error('[race-reward-guard] fallback grant failed',err);}
      }
    });
  }

  update(time,delta){
    if(this._tdrPauseMenuOpen){
      try{this.physics?.world?.pause?.();}catch{}
      this._hidePauseHud();
      return;
    }
    const result=super.update?.(time,delta);
    this._guardCompletedLapRewards();
    return result;
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

import { RaceScene as CurrentRaceScene } from './RaceTop10ReplayScene.js';

function flattenScene(scene){
  const out=[];
  const seen=new Set();
  const visit=obj=>{
    if(!obj||seen.has(obj))return;
    seen.add(obj);
    out.push(obj);
    if(Array.isArray(obj.list))for(const child of obj.list)visit(child);
  };
  for(const child of scene?.children?.list||[])visit(child);
  return out;
}

export class RaceScene extends CurrentRaceScene{
  _openPauseMenu(...args){
    const alreadyOpen=this._tdrPauseMenuOpen===true||!!this._experiencePauseUi?.root?.isConnected;
    const result=super._openPauseMenu?.(...args);
    if(!alreadyOpen&&!this._tdrPauseClockGuard){
      this._tdrPauseClockGuard={
        timeWasPaused:!!this.time?.paused,
        tweensPaused:true
      };
      // Physics alone is not enough: Phaser Clock events drive the start-light
      // countdown and other race sequencing. Freeze scene time/tweens as well so
      // pausing on red cannot let the race start behind the pause menu.
      try{if(this.time)this.time.paused=true;}catch{}
      try{this.tweens?.pauseAll?.();}catch{}
    }
    return result;
  }

  _closePauseMenu(resume=true){
    const guard=this._tdrPauseClockGuard;
    const result=super._closePauseMenu?.(resume);
    if(resume!==false&&guard){
      try{if(this.time)this.time.paused=guard.timeWasPaused===true;}catch{}
      try{this.tweens?.resumeAll?.();}catch{}
      this._tdrPauseClockGuard=null;
    }
    return result;
  }

  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();

    const keep=new Set([this.car,this.carBody,this.carRig]);
    const hidden=this._tdrStatsReplayHiddenObjects||(this._tdrStatsReplayHiddenObjects=[]);
    const hiddenSet=new Set(hidden);
    const hide=obj=>{
      if(!obj||keep.has(obj)||hiddenSet.has(obj)||obj.visible===false)return;
      try{
        hidden.push(obj);
        hiddenSet.add(obj);
        obj.setVisible?.(false);
      }catch{}
    };

    // Several legacy HUD/control elements live inside Containers, so the old
    // first-level scan missed them. Fixed-camera elements and the high-depth
    // presentation layer are UI, not world scenery. Native replay has input
    // disabled, so any remaining interactive Phaser object is also a gameplay
    // control and must not be visible.
    for(const obj of flattenScene(this)){
      const sx=Number(obj?.scrollFactorX),sy=Number(obj?.scrollFactorY);
      const depth=Number(obj?.depth);
      const interactive=!!obj?.input && obj.input.enabled!==false;
      if((sx===0&&sy===0)||(Number.isFinite(depth)&&depth>=900)||interactive)hide(obj);
    }

    for(const obj of [
      this.bottomBanner,this.touchUI,this.hud,this.ttPanel,this._startModal,
      this._startModalBg,this._ghostSprite,this.minimapUnifiedPanel,
      this.minimapSportFrame,this.minimapWideFrame,this._tdrLiveDeltaUi?.root
    ]) hide(obj);

    // The current mobile driving controls are DOM, not Phaser. Their exact
    // roots are #tdr-race-controls (stick + brake + gas), #tdr-handbrake and,
    // when wheel steering is selected, #tdr-steering-wheel. Keep their normal
    // creation/input code untouched and gate only their visibility in replay.
    try{
      const parent=this.game?.canvas?.parentElement;
      if(parent){
        parent.dataset.tdrNativeReplay='1';
        this._tdrReplayDomParent=parent;
      }
      let style=document.getElementById('tdr-native-replay-clean-style');
      if(!style){
        style=document.createElement('style');
        style.id='tdr-native-replay-clean-style';
        style.textContent=`
          [data-tdr-native-replay="1"] > :not(canvas):not(.br-replay-modal){display:none!important;visibility:hidden!important;pointer-events:none!important}
          [data-tdr-native-replay="1"] > .br-replay-modal{display:flex!important;visibility:visible!important;pointer-events:auto!important}
          body.tdr-native-replay-clean #tdr-static-minimap,
          body.tdr-native-replay-clean #tdr-static-ghost-status,
          body.tdr-native-replay-clean #tdr-race-controls,
          body.tdr-native-replay-clean #tdr-handbrake,
          body.tdr-native-replay-clean #tdr-steering-wheel,
          body.tdr-native-replay-clean [data-tdr-race-ui="1"],
          body.tdr-native-replay-clean [data-tdr-touch-controls],
          body.tdr-native-replay-clean [data-tdr-race-hud]{display:none!important;visibility:hidden!important;pointer-events:none!important}
        `;
        document.head.appendChild(style);
      }
      document.body.classList.add('tdr-native-replay-clean');
    }catch{}
  }

  _cleanupNativeReplayPresentation(){
    try{this._tdrReplayDomParent?.removeAttribute?.('data-tdr-native-replay');}catch{}
    this._tdrReplayDomParent=null;
    try{document.body.classList.remove('tdr-native-replay-clean');}catch{}
  }

  _destroyStatsReplayOverlay(restore=true){
    const result=super._destroyStatsReplayOverlay?.(restore);
    if(restore)this._cleanupNativeReplayPresentation();
    return result;
  }

  _exitStatsNativeReplay(){
    this._cleanupNativeReplayPresentation();
    return super._exitStatsNativeReplay?.();
  }
}

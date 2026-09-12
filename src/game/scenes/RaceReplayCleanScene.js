import { RaceScene as CurrentRaceScene } from './RaceTop10ReplayScene.js';
import { hideRaceUi, restoreRaceUi } from '../ui/raceUiVisibility.js';

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
  _hideStatsReplayGameplayUi(){
    super._hideStatsReplayGameplayUi?.();

    // Use the race's own visibility boundary while the native replay is active.
    // In particular this disables uiCam, which owns the visual brake, gas and
    // handbrake controls. Nothing about their creation/input/position is changed.
    if(!this._tdrNativeReplayRaceUiState){
      try{this._tdrNativeReplayRaceUiState=hideRaceUi(this);}catch{}
    }

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

    // DOM wrappers such as the static minimap deliberately restore themselves
    // during postupdate. A replay-mode CSS gate with !important is therefore
    // the authoritative switch while the native replay is active.
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
          [data-tdr-native-replay="1"] > :not(canvas){display:none!important;visibility:hidden!important;pointer-events:none!important}
          body.tdr-native-replay-clean #tdr-static-minimap,
          body.tdr-native-replay-clean #tdr-static-ghost-status,
          body.tdr-native-replay-clean [data-tdr-race-ui="1"],
          body.tdr-native-replay-clean [data-tdr-touch-controls],
          body.tdr-native-replay-clean [data-tdr-race-controls],
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
    if(this._tdrNativeReplayRaceUiState){
      try{restoreRaceUi(this,this._tdrNativeReplayRaceUiState);}catch{}
      this._tdrNativeReplayRaceUiState=null;
    }
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

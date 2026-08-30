import { RaceScene as CurrentRaceScene } from './RaceHandbrakeFrontAxleFixScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { mountRaceSessionRewards } from '../ui/raceSessionUi.js';
import { mountRacePauseUi } from '../ui/racePauseUi.js';

const BASE=import.meta.env.BASE_URL||'/';

// Shipping authority for race-session UX.
// Physics/vehicle behaviour stays below this boundary. Pause/session/reward UI
// belongs here or in composable DOM modules, never in one-feature FixScene wrappers.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._experiencePauseUi=null;
    this.events.once('shutdown',()=>this._destroyExperienceUi());
    this.events.once('destroy',()=>this._destroyExperienceUi());
    return result;
  }

  _destroyExperienceUi(){
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    try{this._sessionRewardsDom?.remove?.();}catch{}
    this._sessionRewardsDom=null;
  }

  _openPauseMenu(){
    if(this._experiencePauseUi?.root?.isConnected)return this._experiencePauseUi.root;
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    try{this._pauseButton?.style&&(this._pauseButton.style.display='none');}catch{}
    try{this._hidePauseHud?.();}catch{}

    const ui=mountRacePauseUi({
      onContinue:()=>this._closePauseMenu(true),
      onCaptureWorld:()=>this._runPauseCapture('world'),
      onCaptureTechnical:()=>this._runPauseCapture('technical'),
      onFinish:()=>this._finishSessionFromPause(),
      onAbandon:()=>this._abandonSessionFromPause()
    });
    this._experiencePauseUi=ui;
    this._pauseModal=ui?.root||null;
    return ui?.root||null;
  }

  _closePauseMenu(resume=true){
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;

    if(resume!==false){
      this._tdrPauseMenuOpen=false;
      try{this._restorePauseHud?.();}catch{}
      try{this.physics?.world?.resume?.();}catch{}
      try{
        const button=this._pauseButton;
        if(button?.isConnected){
          button.style.removeProperty('display');
          button.style.display='grid';
          button.style.pointerEvents='auto';
        }
      }catch{}
      try{this._updateSimpleRaceHud?.(100);}catch{}
    }
  }

  _runPauseCapture(kind){
    // The capture itself should never include the pause panel. Keep the race
    // frozen/HUD-hidden, temporarily unmount only the panel, then restore it.
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;
    let result;
    try{
      result=kind==='technical'
        ? this.exportTechnicalCapture?.()
        : this.exportCaptureWorld?.();
    }catch(err){
      console.error(`[race-capture] ${kind} failed`,err);
    }
    Promise.resolve(result).catch(()=>{}).finally(()=>{
      setTimeout(()=>{
        if(this.scene?.isActive?.()!==false&&this._tdrPauseMenuOpen)this._openPauseMenu();
      },120);
    });
  }

  _finishSessionFromPause(){
    if(this._sessionFinalizing)return;
    this._sessionFinalizing=true;
    this._closePauseMenu(false);
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    try{if(this._pauseButton)this._pauseButton.style.display='none';}catch{}
    this._showSessionRewards(null,()=>this._openFinalSessionReportClean());
  }

  _openFinalSessionReportClean(){
    this._openSessionReport?.();
    const modal=this._sessionReportModal;
    if(!modal)return;
    const continueBtn=modal.querySelector?.('[data-a="continue"]');
    if(continueBtn)continueBtn.style.display='none';
    const actions=modal.querySelector?.('.actions');
    if(actions)actions.style.gridTemplateColumns='1fr 1fr';
  }

  _abandonSessionFromPause(){
    this._closePauseMenu(false);
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    if(this._testMode&&this._returnSceneKey)this.scene.start(this._returnSceneKey,this._returnSceneData||{});
    else this.scene.start('menu');
  }

  _showChestOpening(meta,resultRoot=null){
    // A chest may be earned mid-run, but presentation never interrupts driving.
    // Lower economy code can keep accounting for it; the session UI owns display.
    try{this._queueSessionChest?.(meta);}catch{}
    if(resultRoot&&this._sessionFinalizing)this._showSessionRewards(resultRoot);
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom?.isConnected)return;
    const summary=getRaceLootSessionSummary?.()||{};
    const laps=Math.max(0,Number(summary.laps)||0);
    const entries=Object.entries(summary.totals||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1]))
      .map(([id,qty])=>({id,qty:Number(qty)||0,name:GARAGE_ITEMS[id]?.name||id,icon:GARAGE_ITEMS[id]?.icon||'◆'}));

    if(!entries.length&&laps<5){
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
      return;
    }
    if(resultRoot)resultRoot.style.display='none';

    const root=mountRaceSessionRewards({
      baseUrl:BASE,
      laps,
      bonusLaps:Number(summary.bonusLaps)||0,
      entries,
      resultLabel:resultRoot?'VER RESULTADOS':'VER INFORME',
      onFinish:()=>{
        if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
        try{this._restoreSessionRewardsInput?.();}catch{}
        try{this._sessionChestQueue=[];this._sessionChestKeys?.clear?.();}catch{}
        if(resultRoot)resultRoot.style.display='';
        onDone?.();
      }
    });
    this._sessionRewardsDom=root;
    if(root)try{this._lockSessionRewardsInput?.(root);}catch{}
  }
}

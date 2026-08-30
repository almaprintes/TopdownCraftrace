import { RaceScene as CurrentRaceScene } from './RaceHandbrakeFrontAxleFixScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { mountRaceSessionRewards } from '../ui/raceSessionUi.js';

const BASE=import.meta.env.BASE_URL||'/';

// Shipping authority for race-session UX.
// Physics/vehicle behaviour stays below this boundary. Pause/session/reward UI
// belongs here or in composable DOM modules, never in one-feature FixScene wrappers.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this.events.once('shutdown',()=>this._destroyExperienceUi());
    this.events.once('destroy',()=>this._destroyExperienceUi());
    return result;
  }

  _destroyExperienceUi(){
    try{this._sessionRewardsDom?.remove?.();}catch{}
    this._sessionRewardsDom=null;
  }

  _closePauseMenu(resume=true,...rest){
    const result=super._closePauseMenu?.(resume,...rest);
    if(resume!==false){
      // Pause owns this control. Restore it explicitly instead of relying on a
      // generic DOM visibility snapshot taken after the base menu hid it.
      try{
        const button=this._pauseButton;
        if(button?.isConnected){
          button.style.removeProperty('display');
          button.style.display='grid';
          button.style.pointerEvents='auto';
        }
      }catch{}
    }
    return result;
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

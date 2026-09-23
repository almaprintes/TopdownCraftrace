import { RaceScene as CurrentRaceScene } from './RaceLootEconomyScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { t } from '../i18n/index.js';
import { isRewardedAdAvailable, showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { REWARDED_PLACEMENTS, verifiedReward } from '../monetization/rewardedActions.js';
import { claimPostRaceDoubleLoot, createPostRaceClaimId, hasClaimedPostRaceDouble } from '../monetization/postRaceDoubleLoot.js';
import { mountRaceSessionRewards } from '../ui/raceSessionUi.js';

const BASE=import.meta.env.BASE_URL||'/';
const SURVIVAL_MAX_REWARDED_LAPS=5;

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._sessionChestQueue=[];this._sessionChestKeys=new Set();this._sessionRewardsDom=null;this._sessionFinalizing=false;this._sessionRewardsInputState=null;this._tdrPostRaceClaimId=createPostRaceClaimId(this.trackKey||this.track?.key||this.track?.id||'race');this._tdrRaceLootDoubled=hasClaimedPostRaceDouble(this._tdrPostRaceClaimId);
    this.events.once('shutdown',()=>this._destroySessionRewardsUi());this.events.once('destroy',()=>this._destroySessionRewardsUi());return result;
  }
  _destroySessionRewardsUi(){try{this._sessionRewardsDom?.remove?.();}catch{}this._sessionRewardsDom=null;this._restoreSessionRewardsInput();this._sessionChestQueue=[];this._sessionChestKeys?.clear?.();}
  _chestKey(meta){const lap=Number(meta?.sessionLap||0),loot=Object.entries(meta?.chestLoot||{}).sort(([a],[b])=>a.localeCompare(b));return `${lap}:${JSON.stringify(loot)}`;}
  _queueSessionChest(meta){if(!meta?.chest)return;const key=this._chestKey(meta);if(this._sessionChestKeys?.has(key))return;this._sessionChestKeys?.add(key);this._sessionChestQueue.push({...meta,chestLoot:{...(meta.chestLoot||{})}});}
  _showRaceLoot(reward){const meta=reward?.meta;if(meta?.chest)this._queueSessionChest(meta);const result=super._showRaceLoot(reward);if(meta?.chest&&this._survivalMode)this._pendingChestMeta=null;return result;}
  _showChestOpening(meta,resultRoot=null){this._queueSessionChest(meta);if(resultRoot&&this._sessionFinalizing)this._showSessionRewards(resultRoot);}
  _openPauseMenu(){const result=super._openPauseMenu?.(),root=this._pauseModal;if(!root)return result;const oldFinish=root.querySelector?.('[data-a="report"]');if(oldFinish){const finish=oldFinish.cloneNode(true);finish.textContent=t('session.finish');oldFinish.replaceWith(finish);finish.addEventListener('click',()=>{this._closePauseMenu?.(false);this._finishSessionWithRewards();});}const oldMenu=root.querySelector?.('[data-a="menu"]');if(oldMenu){const menu=oldMenu.cloneNode(true);menu.textContent=t('session.abandon');oldMenu.replaceWith(menu);menu.addEventListener('click',()=>{this._closePauseMenu?.(false);if(this._testMode&&this._returnSceneKey)this.scene.start(this._returnSceneKey,this._returnSceneData||{});else this.scene.start('menu');});}return result;}
  _finishSessionWithRewards(){if(this._sessionFinalizing)return;this._sessionFinalizing=true;try{this.physics?.world?.pause?.();}catch{}if(this._pauseButton)this._pauseButton.style.display='none';this._showSessionRewards(null,()=>this._openFinalSessionReport());}
  _openFinalSessionReport(){this._openSessionReport?.();const modal=this._sessionReportModal;if(!modal)return;const continueBtn=modal.querySelector?.('[data-a="continue"]');if(continueBtn)continueBtn.style.display='none';const actions=modal.querySelector?.('.actions');if(actions)actions.style.gridTemplateColumns='1fr 1fr';if(this._pauseButton)this._pauseButton.style.display='none';}
  _showSurvivalResults(){const result=super._showSurvivalResults?.();this._sessionFinalizing=true;if(this._pendingChestMeta){this._queueSessionChest(this._pendingChestMeta);this._pendingChestMeta=null;}setTimeout(()=>this._showSessionRewards(this._survivalResultDom),90);return result;}
  _lockSessionRewardsInput(root){if(this._sessionRewardsInputState)return;const canvas=this.game?.canvas||null,state={inputEnabled:this.input?.enabled,canvas,canvasPointerEvents:canvas?.style?.pointerEvents||'',hiddenDom:[]};try{if(this.input)this.input.enabled=false;}catch{}try{if(canvas?.style)canvas.style.pointerEvents='none';}catch{}try{for(const el of document.querySelectorAll('[data-tdr-race-ui="1"]')){if(el===root||root?.contains?.(el))continue;state.hiddenDom.push([el,el.style.display]);el.style.display='none';}}catch{}this._sessionRewardsInputState=state;}
  _restoreSessionRewardsInput(){const state=this._sessionRewardsInputState;if(!state)return;try{if(this.input)this.input.enabled=state.inputEnabled!==false;}catch{}try{if(state.canvas?.style)state.canvas.style.pointerEvents=state.canvasPointerEvents;}catch{}try{for(const [el,display] of state.hiddenDom||[])if(el?.style)el.style.display=display;}catch{}this._sessionRewardsInputState=null;}
  _sessionChestCard(tier){const tone=tier>=20?'gold':tier>=15?'purple':tier>=10?'green':'blue';return `<div class="tdrsr-season-card ${tone}"><div class="tdrsr-card-kicker">${t('session.free')}</div><div class="tdrsr-chest-mark"><span class="lid"></span><span class="body"></span><span class="lock"></span></div><div class="tdrsr-tier">${t('session.chest')} ${tier}</div></div>`;}
  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom)return;
    const summary=getRaceLootSessionSummary?.()||{};
    const rawRewardedLaps=Math.max(0,Number(summary?.laps||0));
    const rewardedLaps=this._survivalMode?Math.min(SURVIVAL_MAX_REWARDED_LAPS,rawRewardedLaps):rawRewardedLaps;
    const entries=Object.entries(summary?.totals||{}).filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0).sort((a,b)=>Number(b[1])-Number(a[1])).map(([id,qty])=>({id,qty:Number(qty)||0,name:GARAGE_ITEMS[id]?.name||id,icon:GARAGE_ITEMS[id]?.icon||'◆',asset:GARAGE_ITEMS[id]?.asset||null}));
    const chestTier=rewardedLaps>=5?Math.floor(rewardedLaps/5)*5:0;
    if(!entries.length&&chestTier<5){if(resultRoot)resultRoot.style.display='';onDone?.();return;}
    if(resultRoot)resultRoot.style.display='none';
    const claimId=this._tdrPostRaceClaimId||(this._tdrPostRaceClaimId=createPostRaceClaimId(summary.trackKey||this.trackKey||'race'));
    const canDouble=entries.length>0&&!this._tdrRaceLootDoubled&&!hasClaimedPostRaceDouble(claimId)&&isRewardedAdAvailable();
    const root=mountRaceSessionRewards({
      baseUrl:BASE,laps:rewardedLaps,bonusLaps:Number(summary?.bonusLaps)||0,entries,
      resultLabel:resultRoot?t('session.viewResults'):t('session.viewReport'),
      canDouble,
      onDouble:async()=>{
        if(this._tdrRaceLootDoubled||hasClaimedPostRaceDouble(claimId))return{ok:false,reason:'already_claimed'};
        const ad=await showRewardedAd(this,{title:'×2 BOTÍN · ANUNCIO RECOMPENSADO',placement:REWARDED_PLACEMENTS.POST_RACE_DOUBLE_LOOT,claimId});
        if(!verifiedReward(ad))return{ok:false,reason:ad?.reason||'ad_not_verified'};
        const claim=claimPostRaceDoubleLoot({claimId,entries});
        if(claim?.ok)this._tdrRaceLootDoubled=true;
        return claim;
      },
      onFinish:()=>{
        if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
        this._restoreSessionRewardsInput();
        this._sessionChestQueue=[];this._sessionChestKeys?.clear?.();
        if(resultRoot)resultRoot.style.display='';
        onDone?.();
      }
    });
    if(!root){if(resultRoot)resultRoot.style.display='';onDone?.();return;}
    this._sessionRewardsDom=root;
    this._lockSessionRewardsInput(root);
  }

}

// DEV 1.1.172: restore the canonical cinematic post-race x2 rewarded action.

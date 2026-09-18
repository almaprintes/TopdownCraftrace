import { RaceScene as CurrentRaceScene } from './RaceHandbrakePhysicsScene.js';
import { grantRaceLoot, getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { isRewardedAdAvailable, showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { claimPostRaceDoubleLoot, createPostRaceClaimId, hasClaimedPostRaceDouble } from '../monetization/postRaceDoubleLoot.js';
import { mountRaceSessionRewards } from '../ui/raceSessionUi.js';
import { mountRacePauseUi } from '../ui/racePauseUi.js';
import { hideRaceUi, restoreRaceUi } from '../ui/raceUiVisibility.js';

const BASE=import.meta.env.BASE_URL||'/';

function fmtEngineerLap(ms){
  const value=Number(ms);
  if(!Number.isFinite(value)||value<=0)return'';
  const min=Math.floor(value/60000);
  const sec=(value-min*60000)/1000;
  return`${min}:${sec.toFixed(3).padStart(6,'0')}`;
}

function validSessionRows(history){
  return(Array.isArray(history)?history:[]).filter(row=>row?.valid!==false&&row?.invalid!==true&&Number.isFinite(Number(row?.lapMs))&&Number(row.lapMs)>0);
}

function buildSessionReading(history){
  const rows=validSessionRows(history);
  if(!rows.length)return'No hay suficientes vueltas válidas para analizar la tanda todavía.';
  const times=rows.map(row=>Number(row.lapMs));
  const bestMs=Math.min(...times),worstMs=Math.max(...times);
  const bestIndex=times.indexOf(bestMs);
  const first=times[0],last=times[times.length-1];
  const spreadPct=bestMs>0?(worstMs-bestMs)/bestMs:0;
  const trendPct=first>0?(last-first)/first:0;
  const knownClean=rows.filter(row=>typeof row?.tdrCleanLap==='boolean');
  const dirtyCount=knownClean.filter(row=>row.tdrCleanLap===false).length;
  const allKnownClean=knownClean.length===rows.length&&dirtyCount===0;
  const bestLabel=`V${bestIndex+1} (${fmtEngineerLap(bestMs)})`;

  if(rows.length===1){
    if(allKnownClean)return`Primera referencia de la tanda: ${bestLabel}. Vuelta limpia; ahora toca construir ritmo sobre ella.`;
    return`Primera referencia de la tanda: ${bestLabel}. Necesitamos más vueltas para leer la evolución del ritmo.`;
  }

  // Off-track advice is only legal when clean-lap telemetry explicitly marked it.
  if(dirtyCount>0){
    const word=dirtyCount===1?'una vuelta registró una salida de pista':`${dirtyCount} vueltas registraron salidas de pista`;
    return`Tu mejor referencia fue ${bestLabel}, pero ${word}. Hay tiempo disponible simplemente manteniendo el coche dentro de pista.`;
  }

  if(allKnownClean&&spreadPct<=0.025){
    const delta=((worstMs-bestMs)/1000).toFixed(3);
    return`Tanda muy sólida y limpia. Solo ${delta} s separan tu mejor y tu peor vuelta; estás construyendo una base de ritmo muy consistente.`;
  }

  if(bestIndex===rows.length-1&&trendPct<=-0.025){
    return`Has ido de menos a más y cerraste con tu mejor vuelta: ${bestLabel}. Buena progresión; la siguiente tanda empieza con una referencia más alta.`;
  }

  if(bestIndex===0&&trendPct>=0.07&&rows.length>=3){
    return`Saliste muy fuerte: ${bestLabel} fue tu mejor vuelta. Después el ritmo cayó progresivamente; intenta repetir la precisión de esa primera vuelta.`;
  }

  if(trendPct<=-0.045&&rows.length>=3){
    return`La tanda fue mejorando vuelta a vuelta. Terminaste un ${Math.abs(trendPct*100).toFixed(1)}% más rápido que empezaste; sigue afinando esa progresión.`;
  }

  if(spreadPct<=0.045){
    return`Buen nivel de consistencia. Tu mejor referencia fue ${bestLabel} y las vueltas se mantuvieron en una ventana pequeña; ahora toca buscar décimas sin romper ese ritmo.`;
  }

  if(bestIndex===0&&rows.length>=3){
    return`La velocidad estaba desde el principio: ${bestLabel} fue la referencia. El reto está en sostener ese nivel durante toda la tanda.`;
  }

  if(bestIndex===rows.length-1){
    return`Terminaste encontrando tu mejor ritmo: ${bestLabel}. Buena señal; estabas entendiendo mejor el circuito conforme avanzaba la tanda.`;
  }

  return`Tu mejor vuelta fue ${bestLabel}. Hay rendimiento, pero todavía existe variación entre vueltas; el siguiente paso es convertir esa vuelta rápida en ritmo repetible.`;
}

function normalizedText(value){
  return String(value||'').replace(/\s+/g,' ').trim().toUpperCase();
}

// Shipping authority for race-session UX.
// Physics/vehicle behaviour stays below this boundary. Pause/session/reward UI
// belongs here or in composable DOM modules, never in one-feature FixScene wrappers.
export class RaceScene extends CurrentRaceScene {
  init(data){
    this._tdrTrackStudioTest=data?.trackStudioTest===true;
    return super.init?.(data);
  }

  create(data){
    let savedStudioProject=null;
    let hadStudioProject=false;
    if(!this._tdrTrackStudioTest){
      try{
        savedStudioProject=localStorage.getItem('trackstudio_project');
        hadStudioProject=savedStudioProject!==null;
        if(hadStudioProject)localStorage.removeItem('trackstudio_project');
      }catch{}
    }
    let result;
    try{result=super.create(data);}
    finally{
      if(!this._tdrTrackStudioTest&&hadStudioProject){
        try{localStorage.setItem('trackstudio_project',savedStudioProject);}catch{}
      }
    }
    this._tdrPauseMenuOpen=false;
    this._sessionFinalizing=false;
    this._experiencePauseUi=null;
    this._experienceHiddenUi=null;
    this._setSharedRaceControlsVisible(true);
    this._tdrRewardHistorySeen=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._tdrRewardExpected=Number(getRaceLootSessionSummary?.()?.laps||0);
    this._tdrPostRaceClaimId=createPostRaceClaimId(this.trackKey||this.track?.key||this.track?.id||'race');
    this._tdrRaceLootDoubled=hasClaimedPostRaceDouble(this._tdrPostRaceClaimId);
    this.events.once('shutdown',()=>this._destroyExperienceUi());
    this.events.once('destroy',()=>this._destroyExperienceUi());
    return result;
  }

  _setSharedRaceControlsVisible(visible){
    if(typeof document==='undefined')return;
    try{
      const root=document.getElementById('tdr-race-controls');
      if(!root?.style)return;
      root.style.setProperty('display',visible?'block':'none','important');
      root.style.pointerEvents='none';
    }catch{}
  }

  _destroyExperienceUi(){
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;
    // Never restore a paused race snapshot while the scene is shutting down.
    // The shared DOM control root is app-owned and must survive, but remain
    // hidden in the lobby until the next race explicitly reveals it.
    this._experienceHiddenUi=null;
    this._setSharedRaceControlsVisible(false);
    try{this._sessionRewardsDom?.remove?.();}catch{}
    this._sessionRewardsDom=null;
  }

  _openPauseMenu(){
    if(this._experiencePauseUi?.root?.isConnected)return this._experiencePauseUi.root;
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    if(!this._experienceHiddenUi)this._experienceHiddenUi=hideRaceUi(this);
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
      // Resume simulation first. UI restoration must never hold the car frozen.
      this._tdrPauseMenuOpen=false;
      try{this.physics?.world?.resume?.();}catch{}

      if(this._experienceHiddenUi){
        try{restoreRaceUi(this,this._experienceHiddenUi);}catch{}
        this._experienceHiddenUi=null;
      }
      this._setSharedRaceControlsVisible(true);
      // Historical fix only needs the pause button restored explicitly. Do not
      // call the legacy _restorePauseHud path here; it duplicates pause teardown
      // and can introduce a long resume delay on iOS.
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
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;
    let result;
    try{result=kind==='technical'?this.exportTechnicalCapture?.():this.exportCaptureWorld?.();}
    catch(err){console.error(`[race-capture] ${kind} failed`,err);}
    Promise.resolve(result).catch(()=>{}).finally(()=>{
      setTimeout(()=>{if(this.scene?.isActive?.()!==false&&this._tdrPauseMenuOpen)this._openPauseMenu();},120);
    });
  }

  _finishSessionFromPause(){
    if(this._sessionFinalizing)return;
    this._sessionFinalizing=true;
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    this._showSessionRewards(null,()=>this._openFinalSessionReportClean());
  }

  _patchSessionReading(){
    const modal=this._sessionReportModal;
    if(!modal?.querySelectorAll)return false;
    const reading=buildSessionReading(this.ttHistory);
    const leaves=[...modal.querySelectorAll('*')].filter(el=>!el.children?.length);
    const heading=leaves.find(el=>normalizedText(el.textContent)==='LECTURA DE LA TANDA');
    if(!heading)return false;
    let scope=heading.parentElement;
    for(let depth=0;scope&&depth<4;depth++,scope=scope.parentElement){
      const candidates=[...scope.querySelectorAll('*')]
        .filter(el=>!el.children?.length&&el!==heading)
        .map(el=>({el,text:String(el.textContent||'').trim()}))
        .filter(row=>row.text.length>=20&&normalizedText(row.text)!=='LECTURA DE LA TANDA')
        .sort((a,b)=>b.text.length-a.text.length);
      if(candidates.length){
        candidates[0].el.textContent=reading;
        candidates[0].el.dataset.tdrDynamicSessionReading='1';
        return true;
      }
    }
    return false;
  }

  _openSessionReport(...args){
    const result=super._openSessionReport?.(...args);
    try{this._patchSessionReading();}catch(error){console.warn('[session-engineer] immediate patch failed',error);}
    // Some legacy report builders finish their DOM synchronously one tick later.
    setTimeout(()=>{try{this._patchSessionReading();}catch{}},0);
    setTimeout(()=>{try{this._patchSessionReading();}catch{}},80);
    return result;
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
    try{this._experiencePauseUi?.destroy?.();}catch{}
    this._experiencePauseUi=null;
    this._pauseModal=null;
    this._tdrPauseMenuOpen=true;
    try{this.physics?.world?.pause?.();}catch{}
    this._experienceHiddenUi=null;
    this._setSharedRaceControlsVisible(false);
    if(this._testMode&&this._returnSceneKey)this.scene.start(this._returnSceneKey,this._returnSceneData||{});
    else this.scene.start('menu');
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults?.();
    const root=this._survivalResultDom;
    if(root){
      const buttons=[...root.querySelectorAll('button')];
      const retry=buttons.find(btn=>String(btn.textContent||'').trim().toUpperCase()==='REPETIR');
      if(retry)retry.remove();
      const actions=buttons[0]?.parentElement;
      if(actions&&actions.contains(buttons[0]))actions.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
    }
    return result;
  }

  _showChestOpening(meta,resultRoot=null){
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
      .map(([id,qty])=>({id,qty:Number(qty)||0,name:GARAGE_ITEMS[id]?.name||id,icon:GARAGE_ITEMS[id]?.icon||'◆',asset:GARAGE_ITEMS[id]?.asset||null}));
    if(!entries.length&&laps<5){if(resultRoot)resultRoot.style.display='';onDone?.();return;}
    if(resultRoot)resultRoot.style.display='none';

    const claimId=this._tdrPostRaceClaimId||(this._tdrPostRaceClaimId=createPostRaceClaimId(summary.trackKey||this.trackKey||'race'));
    const canDouble=entries.length>0&&!this._tdrRaceLootDoubled&&!hasClaimedPostRaceDouble(claimId)&&isRewardedAdAvailable();
    const root=mountRaceSessionRewards({
      baseUrl:BASE,laps,bonusLaps:Number(summary.bonusLaps)||0,entries,
      resultLabel:resultRoot?'VER RESULTADOS':'VER INFORME',
      canDouble,
      onDouble:async()=>{
        if(this._tdrRaceLootDoubled||hasClaimedPostRaceDouble(claimId))return{ok:false,reason:'already_claimed'};
        const ad=await showRewardedAd(this,{title:'×2 BOTÍN · ANUNCIO RECOMPENSADO',placement:'post_race_double_loot',claimId});
        if(ad?.completed!==true||ad?.verified!==true)return{ok:false,reason:ad?.reason||'ad_not_verified'};
        const claim=claimPostRaceDoubleLoot({claimId,entries});
        if(claim?.ok)this._tdrRaceLootDoubled=true;
        return claim;
      },
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
    this.time?.delayedCall?.(160,()=>{
      let delivered=Number(getRaceLootSessionSummary?.()?.laps||0);
      if(delivered>=target)return;
      const missing=Math.min(validRows.length,target-delivered);
      const candidates=validRows.slice(validRows.length-missing);
      const trackKey=String(this.trackKey||this.track?.key||this.track?.id||'track01');
      for(const row of candidates){
        delivered=Number(getRaceLootSessionSummary?.()?.laps||0);
        if(delivered>=target)break;
        try{const reward=grantRaceLoot({trackKey,lapMs:Number(row.lapMs)});this._showRaceLoot?.(reward);}
        catch(err){console.error('[race-reward-integrity] fallback grant failed',err);}
      }
    });
  }

  update(time,delta){
    if(this._tdrPauseMenuOpen){try{this.physics?.world?.pause?.();}catch{}return;}
    const result=super.update?.(time,delta);
    this._guardCompletedLapRewards();
    return result;
  }
}

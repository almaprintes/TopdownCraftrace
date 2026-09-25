import { RaceScene as CurrentRaceScene } from './RaceSteeringSensitivityScene.js';
import { recordCompletedLapClean } from '../seasons/cleanLapTelemetry.js';
import { showRaceFeedback, showCleanLapFeedback } from '../ui/raceFeedbackUi.js';
import { loadGarage, saveGarage } from '../garage/garageStore.js';

const CLEAN_SAMPLE_MS=100;
const FEEDBACK_HOLD_MS=4800;
const SESSION_LAP_CAP=20;
const cleanComboCoins=combo=>{const n=Math.max(0,Math.min(SESSION_LAP_CAP,Math.floor(Number(combo)||0)));if(n<2)return 0;if(n>=20)return 100;return Math.min(90,(n-1)*5);};

function fmtLap(ms){
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'--:--.--';
  const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;
  return`${m}:${s.toFixed(2).padStart(5,'0')}`;
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._cleanLapTrackId=String(this.trackKey||data?.trackKey||this.track?.id||this.track?.key||'').trim();
    this._cleanLapSeenHistory=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._currentLapClean=true;
    this._cleanLapAccum=CLEAN_SAMPLE_MS;
    this._liveHudClosedForSessionEnd=false;
    this._feedbackBestLapMs=Number.isFinite(Number(this.ttBest?.lapMs))?Number(this.ttBest.lapMs):null;
    this._feedbackSessionBestMs=null;
    this._cleanLapCombo=0;
    this._cleanLapBestCombo=0;
    this._sessionLapCap=SESSION_LAP_CAP;
    this._cleanComboCoinsGranted=false;
    this._cleanComboCoinReward=0;
    this._sessionLapCapTriggered=false;
    this._retireLegacyDeltaHud();
    return result;
  }

  _grantCleanComboCoins(){
    if(this._cleanComboCoinsGranted)return Number(this._cleanComboCoinReward)||0;
    this._cleanComboCoinsGranted=true;
    const amount=cleanComboCoins(this._cleanLapBestCombo);
    this._cleanComboCoinReward=amount;
    if(amount<=0)return 0;
    try{const s=loadGarage();s.coins=Math.max(0,Number(s.coins)||0)+amount;saveGarage(s);}catch{return 0;}
    return amount;
  }

  _finishSessionWithRewards(){
    if(this._sessionFinalizing)return;
    this._grantCleanComboCoins();
    return super._finishSessionWithRewards?.();
  }

  _reportInnerHtml(r){
    let html=super._reportInnerHtml?.(r)||'';
    const combo=Math.max(0,Number(this._cleanLapBestCombo)||0),coins=Math.max(0,Number(this._cleanComboCoinReward)||0);
    if(combo<2||coins<=0)return html;
    const reward=`<div class="insight"><b>MEJOR CLEAN COMBO ×${combo}</b><span>+${coins} 🪙</span></div>`;
    const at=html.indexOf('<div class="insight">');
    return at>=0?`${html.slice(0,at)}${reward}${html.slice(at)}`:`${html}${reward}`;
  }

  _retireLegacyDeltaHud(){
    try{
      const flat=[];
      const visit=node=>{
        if(!node)return;
        flat.push(node);
        if(Array.isArray(node.list))for(const child of node.list)visit(child);
      };
      for(const child of this.children?.list||[])visit(child);
      const labels=flat.filter(child=>String(child?.text||'').trim().toUpperCase()==='DELTA');
      for(const label of labels){
        const lx=Number(label?.x),ly=Number(label?.y);
        try{label.setVisible?.(false);}catch{}
        for(const candidate of flat){
          if(candidate===label||typeof candidate?.text!=='string')continue;
          const x=Number(candidate?.x),y=Number(candidate?.y);
          if(![lx,ly,x,y].every(Number.isFinite))continue;
          if(Math.abs(x-lx)<=44&&y>ly&&y-ly<=34){
            try{candidate.setVisible?.(false);}catch{}
          }
        }
      }
    }catch{}
  }

  _closeLiveHudForSessionEnd(){
    if(this._liveHudClosedForSessionEnd)return;
    const reportOpen=!!this._sessionReportModal?.isConnected;
    const survivalResultsOpen=!!this._survivalResultDom?.isConnected;
    const rewardsOpen=!!this._sessionRewardsDom?.isConnected;
    const sessionEnding=this._sessionFinalizing===true||reportOpen||survivalResultsOpen||rewardsOpen;
    if(!sessionEnding)return;
    this._liveHudClosedForSessionEnd=true;
    try{this._raceHudDom?.remove?.();}catch{}
    this._raceHudDom=null;
    this._updateSimpleRaceHud=()=>{};
    try{
      const panel=document.getElementById('tdr-live-delta-panel');
      const toggle=document.getElementById('tdr-live-delta-toggle');
      if(panel)panel.style.setProperty('visibility','hidden','important');
      if(toggle)toggle.style.setProperty('display','none','important');
    }catch{}
  }

  _retireLegacyRecordNotice(){
    try{
      const topLimit=(Number(this.scale?.height)||0)*0.42;
      for(const child of [...(this.children?.list||[])]){
        const text=String(child?.text||'').toUpperCase();
        if(!text.includes('RÉCORD')&&!text.includes('RECORD'))continue;
        const y=Number(child?.y||0);
        if(!topLimit||y<topLimit)child?.destroy?.();
      }
    }catch{}
  }

  _showLapMilestone(row){
    if(this._survivalMode)return;
    const ms=Number(row?.lapMs);
    if(!Number.isFinite(ms)||ms<=1000)return;
    const previousRecord=this._feedbackBestLapMs;
    const previousSessionBest=this._feedbackSessionBestMs;
    const isRecord=!Number.isFinite(previousRecord)||ms<previousRecord-0.5;
    const isSessionFast=!Number.isFinite(previousSessionBest)||ms<previousSessionBest-0.5;
    if(isRecord){
      this._retireLegacyRecordNotice();
      this.time?.delayedCall?.(80,()=>this._retireLegacyRecordNotice());
      showRaceFeedback(this,{type:'record',eyebrow:'🏆 NUEVO RÉCORD',title:fmtLap(ms),detail:'RÉCORD DEL CIRCUITO',holdMs:FEEDBACK_HOLD_MS});
    }else if(isSessionFast){
      showRaceFeedback(this,{type:'fast',eyebrow:'VUELTA RÁPIDA',title:fmtLap(ms),detail:'MEJOR DE LA SESIÓN',holdMs:FEEDBACK_HOLD_MS});
    }
    if(isRecord)this._feedbackBestLapMs=ms;
    if(isSessionFast)this._feedbackSessionBestMs=ms;
  }

  update(time,delta){
    super.update?.(time,delta);
    this._retireLegacyDeltaHud();
    this._closeLiveHudForSessionEnd();
    this._cleanLapAccum+=Math.max(0,Number(delta)||0);
    if(this._cleanLapAccum<CLEAN_SAMPLE_MS)return;
    this._cleanLapAccum=0;
    try{
      const body=this.carBody;
      const x=Number(body?.x),y=Number(body?.y);
      if(this._currentLapClean&&Number.isFinite(x)&&Number.isFinite(y)){
        // Surface profiles can temporarily replace _isOnTrack with ()=>true while
        // their physics update runs. Clean-lap telemetry must use the preserved
        // geometric detector instead, otherwise an off-track lap can count clean.
        const rawOnTrack=typeof this._tdrOriginalIsOnTrack==='function'
          ? this._tdrOriginalIsOnTrack
          : this._isOnTrack;
        if(typeof rawOnTrack==='function'&&!rawOnTrack.call(this,x,y))this._currentLapClean=false;
      }
      const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
      const seen=Math.max(0,Number(this._cleanLapSeenHistory)||0);
      if(hist.length>seen){
        for(let i=seen;i<hist.length;i++){
          const row=hist[i]||{};
          const valid=row.valid!==false&&row.invalid!==true;
          if(valid){
            const clean=this._currentLapClean===true;
            try{row.tdrCleanLap=clean;}catch{}
            recordCompletedLapClean(this._cleanLapTrackId,clean);
            // Celebrate a genuinely clean lap without surfacing dirty-lap diagnostics.
            if(clean){
              this._cleanLapCombo=Math.max(0,Number(this._cleanLapCombo)||0)+1;
              this._cleanLapBestCombo=Math.max(Number(this._cleanLapBestCombo)||0,this._cleanLapCombo);
              showCleanLapFeedback(this,{holdMs:1350,combo:this._cleanLapCombo});
            }else{
              this._cleanLapCombo=0;
            }
            this._showLapMilestone(row);
          }
          this._currentLapClean=true;
        }
        this._cleanLapSeenHistory=hist.length;
        const sessionBase=Math.max(0,Number(this._sessionLapBaseline)||0);
        const completed=Math.max(0,hist.length-sessionBase);
        if(!this._survivalMode&&!this._sessionLapCapTriggered&&completed>=this._sessionLapCap){
          this._sessionLapCapTriggered=true;
          this.time?.delayedCall?.(180,()=>this._finishSessionWithRewards());
        }
      }
    }catch{}
  }
}

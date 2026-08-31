import { RaceScene as CurrentRaceScene } from './RaceGraphicsPresetScene.js';
import { recordCompletedLapClean } from '../seasons/cleanLapTelemetry.js';
import { showRaceFeedback } from '../ui/raceFeedbackUi.js';

const CLEAN_SAMPLE_MS=100;

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
    return result;
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
  }

  _showLapMilestone(row){
    const ms=Number(row?.lapMs);
    if(!Number.isFinite(ms)||ms<=1000)return;
    const previousRecord=this._feedbackBestLapMs;
    const previousSessionBest=this._feedbackSessionBestMs;
    const isRecord=!Number.isFinite(previousRecord)||ms<previousRecord-0.5;
    const isSessionFast=!Number.isFinite(previousSessionBest)||ms<previousSessionBest-0.5;
    if(isRecord){
      showRaceFeedback(this,{type:'record',eyebrow:'NUEVO RÉCORD',title:fmtLap(ms),detail:'RÉCORD DE VUELTA',holdMs:1000});
    }else if(isSessionFast){
      showRaceFeedback(this,{type:'fast',eyebrow:'VUELTA RÁPIDA',title:fmtLap(ms),detail:'MEJOR DE LA SESIÓN',holdMs:1000});
    }
    if(isRecord)this._feedbackBestLapMs=ms;
    if(isSessionFast)this._feedbackSessionBestMs=ms;
  }

  update(time,delta){
    super.update?.(time,delta);
    this._closeLiveHudForSessionEnd();
    this._cleanLapAccum+=Math.max(0,Number(delta)||0);
    if(this._cleanLapAccum<CLEAN_SAMPLE_MS)return;
    this._cleanLapAccum=0;
    try{
      const body=this.carBody;
      const x=Number(body?.x),y=Number(body?.y);
      if(this._currentLapClean&&Number.isFinite(x)&&Number.isFinite(y)&&typeof this._isOnTrack==='function'){
        if(!this._isOnTrack(x,y))this._currentLapClean=false;
      }
      const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
      const seen=Math.max(0,Number(this._cleanLapSeenHistory)||0);
      if(hist.length>seen){
        for(let i=seen;i<hist.length;i++){
          const row=hist[i]||{};
          const valid=row.valid!==false&&row.invalid!==true;
          if(valid){
            recordCompletedLapClean(this._cleanLapTrackId,this._currentLapClean===true);
            this._showLapMilestone(row);
          }
          this._currentLapClean=true;
        }
        this._cleanLapSeenHistory=hist.length;
      }
    }catch{}
  }
}

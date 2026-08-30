import { RaceScene as CurrentRaceScene } from './RaceGraphicsPresetScene.js';
import { recordCompletedLapClean } from '../seasons/cleanLapTelemetry.js';

const CLEAN_SAMPLE_MS=100;

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._cleanLapTrackId=String(this.trackKey||data?.trackKey||this.track?.id||this.track?.key||'').trim();
    this._cleanLapSeenHistory=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._currentLapClean=true;
    this._cleanLapAccum=CLEAN_SAMPLE_MS;
    this._liveHudClosedForSessionEnd=false;
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
          if(valid)recordCompletedLapClean(this._cleanLapTrackId,this._currentLapClean===true);
          this._currentLapClean=true;
        }
        this._cleanLapSeenHistory=hist.length;
      }
    }catch{}
  }
}

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
    this._retireLegacyDeltaHud();
    return result;
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
        // Retire the value immediately beneath the legacy DELTA heading while
        // leaving LAST/BEST and unrelated HUD text untouched.
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
            const clean=this._currentLapClean===true;
            // Keep the clean/dirty result on the actual history row so the final
            // session report can only mention an off-track excursion when the
            // race telemetry really observed one.
            try{row.tdrCleanLap=clean;}catch{}
            recordCompletedLapClean(this._cleanLapTrackId,clean);
          }
          this._currentLapClean=true;
        }
        this._cleanLapSeenHistory=hist.length;
      }
    }catch{}
  }
}
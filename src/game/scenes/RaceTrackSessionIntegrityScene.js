import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const SURVIVAL_MAX_LAPS = 5;

export class RaceScene extends CurrentRaceScene {
  init(data){
    // Session integrity must never rewrite authored race geometry. Finish line,
    // checkpoints and start/grid remain owned exclusively by the track registry.
    super.init(data);
    this._tdrRestoreTrackIdentity();
    this._tdrSurvivalLapRows=[];
  }

  create(data){
    super.create(data);
    this._tdrRestoreTrackIdentity();
  }

  _tdrTrackKey(){
    return String(this.trackKey||this.selectedTrackKey||this.track?.key||this.track?.id||'').trim();
  }

  _tdrRestoreTrackIdentity(){
    const key=this._tdrTrackKey();
    if(!key)return;
    const registered=TRACK_REGISTRY[key];
    const name=getTrackPublicName(key)||registered?.name||this.track?.name||key;
    if(this.track&&typeof this.track==='object'){
      this.track.id=key;
      this.track.key=key;
      this.track.name=name;
      this.track.meta={...(this.track.meta||{}),publicName:name};
    }
    this.trackId=key;
    this.selectedTrackKey=key;
  }

  _tdrFixReportIdentity(report){
    if(!report||typeof report!=='object')return report;
    const key=this._tdrTrackKey();
    if(!key)return report;
    const name=getTrackPublicName(key)||TRACK_REGISTRY[key]?.name||key;
    report.trackId=key;
    report.trackKey=key;
    report.trackName=name;
    if(report.track&&typeof report.track==='object') report.track={...report.track,id:key,key,name};
    else report.track={id:key,key,name};
    return report;
  }

  _buildReport(...args){
    return this._tdrFixReportIdentity(super._buildReport?.(...args));
  }

  _tdrCaptureSurvivalLap(racer){
    if(!this._survivalMode||racer!==this._survivalPlayer)return;
    const lap=Number(racer?.completedLaps||0);
    if(!(lap>=1&&lap<=SURVIVAL_MAX_LAPS))return;

    const authoritative=this._survivalAuthoritativePlayerTimes?.()||[];
    const lapMs=Number(authoritative[lap-1]??racer?._survivalLapTimesMs?.[lap-1]);
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    let source=null;
    if(Number.isFinite(lapMs)){
      for(let i=history.length-1;i>=0;i--){
        const ms=Number(history[i]?.lapMs);
        if(Number.isFinite(ms)&&Math.abs(ms-lapMs)<5){source=history[i];break;}
      }
    }
    if(!source&&history.length)source=history[history.length-1];
    const row={...(source&&typeof source==='object'?source:{}),...(Number.isFinite(lapMs)?{lapMs}:{})};
    if(!Number.isFinite(Number(row.lapMs)))return;
    this._tdrSurvivalLapRows??=[];
    this._tdrSurvivalLapRows[lap-1]=row;
  }

  _registerFinishCross(racer){
    const completed=super._registerFinishCross(racer);
    if(completed)this._tdrCaptureSurvivalLap(racer);
    return completed;
  }

  _tdrSurvivalReportRows(){
    const authoritative=this._survivalAuthoritativePlayerTimes?.()||[];
    if(!authoritative.length)return null;
    const captured=Array.isArray(this._tdrSurvivalLapRows)?this._tdrSurvivalLapRows:[];
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];

    return authoritative.slice(0,SURVIVAL_MAX_LAPS).map((rawMs,i)=>{
      const lapMs=Number(rawMs);
      let source=captured[i]||null;
      if(!source){
        for(let j=history.length-1;j>=0;j--){
          const ms=Number(history[j]?.lapMs);
          if(Number.isFinite(ms)&&Math.abs(ms-lapMs)<5){source=history[j];break;}
        }
      }
      return {...(source&&typeof source==='object'?source:{}),lapMs};
    }).filter(row=>Number.isFinite(Number(row.lapMs))&&Number(row.lapMs)>0);
  }

  _showSurvivalSessionInfo(...args){
    const reportRows=this._tdrSurvivalReportRows();
    const originalHistory=this.ttHistory;
    if(reportRows?.length)this.ttHistory=reportRows;
    let out;
    try{
      out=super._showSurvivalSessionInfo?.(...args);
    }finally{
      this.ttHistory=originalHistory;
    }
    this._tdrRestoreTrackIdentity();
    this._tdrFixReportIdentity(out);
    this._tdrRepairSessionReportDom();
    try{ this.time?.delayedCall?.(0,()=>this._tdrRepairSessionReportDom()); }catch{}
    return out;
  }

  _tdrRepairSessionReportDom(){
    if(typeof document==='undefined')return;
    const key=this._tdrTrackKey();
    if(!key)return;
    const correct=String(getTrackPublicName(key)||TRACK_REGISTRY[key]?.name||key).toUpperCase();
    for(const el of document.querySelectorAll('h1,h2,h3,div,span')){
      const text=String(el.textContent||'').trim().toUpperCase();
      if(text==='CIRCUITO ATLÁNTICO' && correct!=='CIRCUITO ATLÁNTICO') el.textContent=correct;
    }
  }
}

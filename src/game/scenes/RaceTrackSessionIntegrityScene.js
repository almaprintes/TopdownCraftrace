import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const SURVIVAL_MAX_LAPS = 5;

function timingRowScore(row){
  if(!row||typeof row!=='object')return 0;
  const sectors=Array.isArray(row.sectors)?row.sectors:[];
  const values=[row.s1??sectors[0],row.s2??sectors[1],row.s3??sectors[2]];
  return values.reduce((n,v)=>n+(Number.isFinite(Number(v))&&Number(v)>0?1:0),0);
}

function cloneTimingRow(row){
  if(!row||typeof row!=='object')return null;
  const out={...row};
  if(Array.isArray(row.sectors))out.sectors=[...row.sectors];
  return out;
}

export class RaceScene extends CurrentRaceScene {
  init(data){
    // Session integrity must never rewrite authored race geometry. Finish line,
    // checkpoints and start/grid remain owned exclusively by the track registry.
    super.init(data);
    this._tdrRestoreTrackIdentity();
    this._tdrSurvivalLapRows=[];
    this._tdrSeenTimingRows=new Set();
    this._tdrSurvivalAuthoritativeTimes=[];
  }

  create(data){
    super.create(data);
    this._tdrRestoreTrackIdentity();
    this._tdrCaptureSurvivalTiming();
  }

  update(time,delta){
    // Capture both sides of the inherited update. Automatic Survival finish can
    // replace/clear its live state in the same frame that it opens results, so
    // completed timing must already exist in our session-owned snapshot.
    this._tdrCaptureSurvivalTiming();
    const out=super.update?.(time,delta);
    this._tdrCaptureSurvivalTiming();
    return out;
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

  _tdrTimingSignature(row){
    const sectors=Array.isArray(row?.sectors)?row.sectors:[];
    const lapMs=Number(row?.lapMs);
    const s1=Number(row?.s1??sectors[0]);
    const s2=Number(row?.s2??sectors[1]);
    const s3=Number(row?.s3??sectors[2]);
    const f=v=>Number.isFinite(v)?Math.round(v*1000)/1000:'-';
    return `${f(lapMs)}|${f(s1)}|${f(s2)}|${f(s3)}`;
  }

  _tdrCaptureTimingHistory(){
    if(!this._survivalMode)return;
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(!history.length)return;
    this._tdrSurvivalLapRows??=[];
    this._tdrSeenTimingRows??=new Set();

    for(const raw of history){
      const lapMs=Number(raw?.lapMs);
      if(!(Number.isFinite(lapMs)&&lapMs>0))continue;
      const row=cloneTimingRow(raw);
      if(!row)continue;
      const sig=this._tdrTimingSignature(row);
      if(this._tdrSeenTimingRows.has(sig))continue;
      this._tdrSeenTimingRows.add(sig);
      this._tdrSurvivalLapRows.push(row);
      if(this._tdrSurvivalLapRows.length>SURVIVAL_MAX_LAPS*4){
        this._tdrSurvivalLapRows.splice(0,this._tdrSurvivalLapRows.length-SURVIVAL_MAX_LAPS*4);
      }
    }
  }

  _tdrCaptureAuthoritativeTimes(){
    if(!this._survivalMode)return;
    let live=[];
    try{live=this._survivalAuthoritativePlayerTimes?.()||[];}catch{}
    const clean=Array.isArray(live)?live.map(Number).filter(v=>Number.isFinite(v)&&v>0).slice(0,SURVIVAL_MAX_LAPS):[];
    // Never replace a richer snapshot with the empty/transient state produced
    // while automatic victory/elimination tears Survival down.
    if(clean.length>=(this._tdrSurvivalAuthoritativeTimes?.length||0)){
      this._tdrSurvivalAuthoritativeTimes=[...clean];
    }
  }

  _tdrCaptureSurvivalTiming(){
    this._tdrCaptureTimingHistory();
    this._tdrCaptureAuthoritativeTimes();
  }

  _tdrBestTimingRowFor(lapMs){
    const pools=[
      ...(Array.isArray(this._tdrSurvivalLapRows)?this._tdrSurvivalLapRows:[]),
      ...(Array.isArray(this.ttHistory)?this.ttHistory:[])
    ];
    let best=null;
    let bestScore=-1;
    let bestDiff=Infinity;
    for(const row of pools){
      const ms=Number(row?.lapMs);
      if(!Number.isFinite(ms))continue;
      const diff=Math.abs(ms-lapMs);
      if(diff>=5)continue;
      const score=timingRowScore(row);
      if(score>bestScore||(score===bestScore&&diff<bestDiff)){
        best=row;
        bestScore=score;
        bestDiff=diff;
      }
    }
    return best;
  }

  _tdrSurvivalReportRows(){
    this._tdrCaptureSurvivalTiming();
    let live=[];
    try{live=this._survivalAuthoritativePlayerTimes?.()||[];}catch{}
    const current=Array.isArray(live)?live.map(Number).filter(v=>Number.isFinite(v)&&v>0):[];
    const saved=Array.isArray(this._tdrSurvivalAuthoritativeTimes)?this._tdrSurvivalAuthoritativeTimes:[];
    const authoritative=current.length>=saved.length?current:saved;
    if(!authoritative.length){
      // Last-resort report path: timing rows themselves are already completed
      // laps, so automatic finish must never display zero if those rows survived.
      const rows=(this._tdrSurvivalLapRows||[]).slice(0,SURVIVAL_MAX_LAPS).map(cloneTimingRow).filter(Boolean);
      return rows.length?rows:null;
    }

    return authoritative.slice(0,SURVIVAL_MAX_LAPS).map(rawMs=>{
      const lapMs=Number(rawMs);
      if(!(Number.isFinite(lapMs)&&lapMs>0))return null;
      const source=this._tdrBestTimingRowFor(lapMs);
      return {...(cloneTimingRow(source)||{}),lapMs};
    }).filter(Boolean);
  }

  _showSurvivalSessionInfo(...args){
    // Snapshot first: automatic victory/elimination is allowed to tear down its
    // live race state only after completed laps are safe in this scene-owned copy.
    this._tdrCaptureSurvivalTiming();
    const reportRows=this._tdrSurvivalReportRows();
    const originalHistory=this.ttHistory;
    const originalPlayerTimes=Array.isArray(this._survivalPlayer?._survivalLapTimesMs)
      ?[...this._survivalPlayer._survivalLapTimesMs]:null;
    const originalSessionTimes=Array.isArray(this._survivalPlayerLapTimes)
      ?[...this._survivalPlayerLapTimes]:null;

    if(reportRows?.length){
      this.ttHistory=reportRows;
      // RaceSurvivalPolish rebuilds ttHistory from these legacy player arrays
      // while opening the automatic report. Feed it the already-preserved laps
      // so that an empty teardown state cannot overwrite the report with [].
      const lapTimes=reportRows.map(row=>Number(row?.lapMs)).filter(ms=>Number.isFinite(ms)&&ms>0);
      if(lapTimes.length){
        if(this._survivalPlayer)this._survivalPlayer._survivalLapTimesMs=[...lapTimes];
        this._survivalPlayerLapTimes=[...lapTimes];
      }
    }

    let out;
    try{
      out=super._showSurvivalSessionInfo?.(...args);
    }finally{
      this.ttHistory=originalHistory;
      if(this._survivalPlayer){
        if(originalPlayerTimes)this._survivalPlayer._survivalLapTimesMs=originalPlayerTimes;
        else delete this._survivalPlayer._survivalLapTimesMs;
      }
      if(originalSessionTimes)this._survivalPlayerLapTimes=originalSessionTimes;
      else this._survivalPlayerLapTimes=[];
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

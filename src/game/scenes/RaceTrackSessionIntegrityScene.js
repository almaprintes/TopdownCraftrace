import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const TIMING_SEAM_TRACKS = new Set(['track01', 'santa-cruz']);
const SURVIVAL_MAX_LAPS = 5;

function wrapPi(a){ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; }
function gateAt(point,width){
  const half=Math.max(30,(Number(width)||80)*0.60);
  const px=-Math.sin(point.r), py=Math.cos(point.r);
  return {
    a:{x:point.x-px*half,y:point.y-py*half},
    b:{x:point.x+px*half,y:point.y+py*half},
    normal:{x:Math.cos(point.r),y:Math.sin(point.r)}
  };
}
function loopMetrics(center){
  const seg=[]; let total=0;
  for(let i=0;i<center.length;i++){
    const a=center[i], b=center[(i+1)%center.length];
    const len=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
    seg.push(len); total+=len;
  }
  return {seg,total};
}
function pointAt(center,metrics,distance){
  let d=((distance%metrics.total)+metrics.total)%metrics.total;
  for(let i=0;i<center.length;i++){
    const len=metrics.seg[i];
    if(d<=len || i===center.length-1){
      const a=center[i], b=center[(i+1)%center.length];
      const t=len>1e-6?d/len:0;
      return {
        x:Number(a.x)+(Number(b.x)-Number(a.x))*t,
        y:Number(a.y)+(Number(b.y)-Number(a.y))*t,
        r:Math.atan2(Number(b.y)-Number(a.y),Number(b.x)-Number(a.x)),
        width:Number(a.width)||Number(b.width)||80
      };
    }
    d-=len;
  }
  return null;
}
function canonicalTimingSeam(track){
  const center=Array.isArray(track?.centerline)?track.centerline.filter(p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y))):[];
  if(center.length<8)return false;

  const first=center[0], prev=center[center.length-1], next=center[1];
  let dx=Number(next.x)-Number(prev.x), dy=Number(next.y)-Number(prev.y);
  if(Math.hypot(dx,dy)<1){ dx=Number(next.x)-Number(first.x); dy=Number(next.y)-Number(first.y); }
  const r=wrapPi(Math.atan2(dy,dx));
  const width=Number(first.width)||Number(track.trackWidth)||Number(track?.meta?.trackWidth)||80;
  const anchor={x:Number(first.x),y:Number(first.y),r};
  const finish=gateAt(anchor,width);
  const metrics=loopMetrics(center);
  if(!(metrics.total>1))return false;

  const cp1=pointAt(center,metrics,metrics.total/3);
  const cp2=pointAt(center,metrics,metrics.total*2/3);
  const checkpoints=[cp1,cp2].filter(Boolean).map(p=>gateAt(p,p.width||width));

  track.finishAnchor={...anchor};
  track.finishLine=finish;
  track.finish=finish;
  track.checkpoints=checkpoints;
  track.checkpointFractions=[1/3,2/3];
  track.start={
    x:anchor.x-Math.cos(r)*Math.max(110,width*.82),
    y:anchor.y-Math.sin(r)*Math.max(110,width*.82),
    r
  };
  return {finish,checkpoints};
}

export class RaceScene extends CurrentRaceScene {
  init(data){
    // XLV installed the canonical seam after super.init(). That was too late for
    // the base scene: spawn/grid state had already been derived from the previous
    // finish/start, so Santa Cruz could record a short V1 before any sector gate.
    // Prepare the registry entry first so spawn, finish and sectors are born from
    // one geometry on the very first frame of the session.
    let requested=String(data?.trackKey||data?.trackId||'').trim();
    if(!requested){ try{requested=String(localStorage.getItem('tdr2:trackKey')||'').trim();}catch{} }
    if(TIMING_SEAM_TRACKS.has(requested)&&TRACK_REGISTRY[requested]) canonicalTimingSeam(TRACK_REGISTRY[requested]);

    super.init(data);
    this._tdrRestoreTrackIdentity();
    this._tdrInstallCanonicalTimingSeam();
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

  _tdrInstallCanonicalTimingSeam(){
    const key=this._tdrTrackKey();
    if(!TIMING_SEAM_TRACKS.has(key))return;
    const timing=canonicalTimingSeam(this.track);
    if(!timing)return;

    // Older timing layers also cache these fields directly on the scene.
    this.finishLine=timing.finish;
    this.checkpoints=timing.checkpoints;
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
    // Survival's race authority keeps the player lap times across all five rounds,
    // while legacy ttHistory can be replaced/reset during round transitions. Build
    // the report from the authoritative five-lap sequence, enriching each row with
    // sector data captured when that lap finished. This prevents a champion report
    // from ending with VUELTAS 0 after a complete five-lap race.
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

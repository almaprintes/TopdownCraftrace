import { RaceScene as CurrentRaceScene } from './RaceExperienceScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const TIMING_SEAM_TRACKS = new Set(['track01', 'santa-cruz']);

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

export class RaceScene extends CurrentRaceScene {
  init(data){
    super.init(data);
    this._tdrRestoreTrackIdentity();
    this._tdrInstallCanonicalTimingSeam();
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
    const track=this.track;
    const center=Array.isArray(track?.centerline)?track.centerline.filter(p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y))):[];
    if(center.length<8)return;

    // These imported circuits had no authored finishSegment. The registry therefore
    // picked whichever straight happened to score longest, while the session timer,
    // sectors and authored start semantics expected the centerline seam. Pin all timing
    // geometry to that seam so first-lap arming is deterministic on every load.
    const first=center[0], prev=center[center.length-1], next=center[1];
    let dx=Number(next.x)-Number(prev.x), dy=Number(next.y)-Number(prev.y);
    if(Math.hypot(dx,dy)<1){ dx=Number(next.x)-Number(first.x); dy=Number(next.y)-Number(first.y); }
    const r=wrapPi(Math.atan2(dy,dx));
    const width=Number(first.width)||Number(track.trackWidth)||Number(track?.meta?.trackWidth)||80;
    const anchor={x:Number(first.x),y:Number(first.y),r};
    const finish=gateAt(anchor,width);

    const metrics=loopMetrics(center);
    if(!(metrics.total>1))return;
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

    // Some older timing layers cache these fields directly on the scene.
    this.finishLine=finish;
    this.checkpoints=checkpoints;
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

  _showSurvivalSessionInfo(...args){
    const out=super._showSurvivalSessionInfo?.(...args);
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

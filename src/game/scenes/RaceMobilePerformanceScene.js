import { RaceScene as CurrentRaceScene } from './RaceKerbFeedbackScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Performance layer for the shipping race scene.
// The legacy minimap projection scanned the entire centerline every rendered frame.
// On dense tracks that becomes one of the hottest CPU paths on mid-range Android.
// This version keeps a segment cache and searches locally, falling back to a global
// scan only after a teleport/reset. Geometry and timing results are unchanged.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._projPerfIndex=Number(this._ttCl?.startIdx||0);
    this._projPerfReady=false;
    this._perfFrameAccum=0;
    this._perfFrameCount=0;
    this._perfSlowWindows=0;
    return result;
  }

  _computeCenterlineProjection(px,py){
    const cl=this.track?.meta?.centerline;
    const n=cl?.length||0;
    if(n<2||!Number.isFinite(px)||!Number.isFinite(py)){
      return {progress01:0,segIndex:0,segT:0,x:px,y:py};
    }

    const cum=this._ttCl?.cum;
    const total=this._ttCl?.total||1;
    const startDist=this._ttCl?.startDist||0;
    const segCount=n-1;

    let hasBest=false;
    let bestD2=Infinity;
    let bestIndex=0;
    let bestT=0;
    let bestX=px;
    let bestY=py;
    let bestDistAlong=0;

    const test=(rawIndex)=>{
      const i=((rawIndex%segCount)+segCount)%segCount;
      const p1=cl[i],p2=cl[i+1];
      const x1=Number(Array.isArray(p1)?p1[0]:p1?.x);
      const y1=Number(Array.isArray(p1)?p1[1]:p1?.y);
      const x2=Number(Array.isArray(p2)?p2[0]:p2?.x);
      const y2=Number(Array.isArray(p2)?p2[1]:p2?.y);
      if(!Number.isFinite(x1)||!Number.isFinite(y1)||!Number.isFinite(x2)||!Number.isFinite(y2))return;

      const vx=x2-x1,vy=y2-y1,len2=vx*vx+vy*vy;
      if(len2<1e-9)return;
      const t=clamp(((px-x1)*vx+(py-y1)*vy)/len2,0,1);
      const qx=x1+vx*t,qy=y1+vy*t;
      const dx=px-qx,dy=py-qy,d2=dx*dx+dy*dy;
      if(!hasBest||d2<bestD2){
        hasBest=true;
        bestD2=d2;
        bestIndex=i;
        bestT=t;
        bestX=qx;
        bestY=qy;
        bestDistAlong=Number(cum?.[i]||0)+Math.sqrt(len2)*t;
      }
    };

    if(!this._projPerfReady){
      for(let i=0;i<segCount;i++)test(i);
      this._projPerfReady=true;
    }else{
      const base=this._projPerfIndex||0;
      const radius=Math.min(64,Math.max(24,Math.ceil(n*.035)));
      for(let o=-radius;o<=radius;o++)test(base+o);
      if(!hasBest||bestD2>260*260){
        hasBest=false;
        bestD2=Infinity;
        for(let i=0;i<segCount;i++)test(i);
      }
    }

    if(!hasBest)return {progress01:0,segIndex:0,segT:0,x:px,y:py};
    this._projPerfIndex=bestIndex;
    let d=bestDistAlong-startDist;
    d%=total;if(d<0)d+=total;
    return {progress01:d/total,segIndex:bestIndex,segT:bestT,x:bestX,y:bestY};
  }

  update(time,delta){
    super.update(time,delta);

    const d=Math.max(0,Number(delta)||0);
    this._perfFrameAccum+=d;
    this._perfFrameCount++;
    if(this._perfFrameAccum>=1200){
      const avg=this._perfFrameAccum/Math.max(1,this._perfFrameCount);
      this._perfSlowWindows=avg>42?this._perfSlowWindows+1:0;
      if(this._perfSlowWindows>=2&&!this._perfEmergencyTrimmed){
        this._perfEmergencyTrimmed=true;
        for(const o of this.children?.list||[]){
          const name=String(o?.constructor?.name||'').toLowerCase();
          if(name.includes('particle')){
            try{o.stop?.();}catch{}
            try{o.setVisible?.(false);}catch{}
          }
        }
      }
      this._perfFrameAccum=0;
      this._perfFrameCount=0;
    }
  }
}

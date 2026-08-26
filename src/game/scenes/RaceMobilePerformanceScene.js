import { RaceScene as CurrentRaceScene } from './RaceKerbHapticsScene.js';

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

    const getXY=(p)=>Array.isArray(p)?[Number(p[0]),Number(p[1])]:[Number(p?.x),Number(p?.y)];
    const cum=this._ttCl?.cum;
    const total=this._ttCl?.total||1;
    const startDist=this._ttCl?.startDist||0;

    let best=null;
    const test=(i)=>{
      i=((i%(n-1))+(n-1))%(n-1);
      const [x1,y1]=getXY(cl[i]);
      const [x2,y2]=getXY(cl[i+1]);
      if(![x1,y1,x2,y2].every(Number.isFinite))return;
      const vx=x2-x1,vy=y2-y1,len2=vx*vx+vy*vy;
      if(len2<1e-9)return;
      const t=clamp(((px-x1)*vx+(py-y1)*vy)/len2,0,1);
      const qx=x1+vx*t,qy=y1+vy*t;
      const dx=px-qx,dy=py-qy,d2=dx*dx+dy*dy;
      if(!best||d2<best.d2){
        const segLen=Math.sqrt(len2);
        const base=Number(cum?.[i]||0);
        best={d2,segIndex:i,segT:t,x:qx,y:qy,distAlong:base+segLen*t};
      }
    };

    if(!this._projPerfReady){
      for(let i=0;i<n-1;i++)test(i);
      this._projPerfReady=true;
    }else{
      const base=this._projPerfIndex||0;
      const radius=Math.min(64,Math.max(24,Math.ceil(n*.035)));
      for(let o=-radius;o<=radius;o++)test(base+o);
      // Teleports, restarts and exceptional crossings get one exact global recovery.
      if(!best||best.d2>260*260){
        best=null;
        for(let i=0;i<n-1;i++)test(i);
      }
    }

    if(!best)return {progress01:0,segIndex:0,segT:0,x:px,y:py};
    this._projPerfIndex=best.segIndex;
    let d=best.distAlong-startDist;
    d%=total;if(d<0)d+=total;
    return {progress01:d/total,segIndex:best.segIndex,segT:best.segT,x:best.x,y:best.y};
  }

  update(time,delta){
    super.update(time,delta);

    // If a device spends several seconds beyond the 50 ms/frame danger zone,
    // remove non-essential particle emitters. The core race, physics, geometry and
    // timing remain untouched. This is deliberately conservative and reversible on
    // the next race load.
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

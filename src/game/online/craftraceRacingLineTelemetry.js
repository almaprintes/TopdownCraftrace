// Read-only DEV Realizador telemetry. Distances are measured against the
// nearest CENTERLINE SEGMENT, never the nearest sparse vertex.
// Ratios use the optimizer's estimated safe half-corridor, not real kerb width.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function measureLateralUse(line,x,y,guessIndex=null){
 const pts=line?.centerline,limits=line?.limits;
 if(!Array.isArray(pts)||pts.length<4||!Array.isArray(limits)||
    limits.length!==pts.length||!Number.isFinite(x)||!Number.isFinite(y))
   return null;
 const n=pts.length,near=Number.isInteger(guessIndex),range=near?Math.min(40,n):n;
 let best=null,bestSq=Infinity;
 for(let step=0;step<(near?2*range+1:n);step++){
   const i=near?(guessIndex-range+step+n*3)%n:step;
   const a=pts[i],b=pts[(i+1)%n],vx=b.x-a.x,vy=b.y-a.y;
   const lengthSq=vx*vx+vy*vy;
   if(lengthSq<1e-6)continue;
   const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/lengthSq,0,1);
   const px=a.x+t*vx,py=a.y+t*vy;
   const dx=x-px,dy=y-py,d=dx*dx+dy*dy;
   if(d>=bestSq)continue;
   const length=Math.sqrt(lengthSq);
   const limit=Math.max(1,Number(limits[i])*(1-t)+Number(limits[(i+1)%n])*t);
   const signed=(dx*(-vy)+dy*vx)/length;
   bestSq=d;best={index:i,segmentT:t,lateralPx:signed,
     fraction:signed/limit,absoluteFraction:Math.abs(signed/limit),
     distanceToReference:Math.sqrt(d)};
 }
 return best;
}
export function summarizeLateralUse(series){
 const s=Array.isArray(series)?series.filter(v=>Number.isFinite(v?.absoluteFraction)):[];
 if(!s.length)return{samples:0,meanPct:0,maxPct:0,nearEdgePct:0};
 const values=s.map(v=>v.absoluteFraction);
 return{samples:values.length,meanPct:Math.round(values.reduce((a,b)=>a+b,0)/values.length*100),
  maxPct:Math.round(Math.max(...values)*100),
  nearEdgePct:Math.round(values.filter(v=>v>=.7).length/values.length*100)};
}

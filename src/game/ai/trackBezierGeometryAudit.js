// Geometry audit for the authored Track Studio Bézier.
// A failure of greedy centerline matching is NOT evidence of a geometric
// crossing, especially beside parallel hairpin legs. Keep the two distinct.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const sq=(p,q)=>(p.x-q.x)**2+(p.y-q.y)**2;

export function findBezierSelfIntersection(points,samplesPerNode=30){
 if(!Array.isArray(points)||points.length<4)return null;
 const n=points.length,eps=1e-7;
 for(let i=0;i<n;i++){
  const a=points[i],b=points[(i+1)%n];
  if(sq(a,b)<eps*eps)continue;
  const abx=b.x-a.x,aby=b.y-a.y;
  const minAX=Math.min(a.x,b.x),maxAX=Math.max(a.x,b.x);
  const minAY=Math.min(a.y,b.y),maxAY=Math.max(a.y,b.y);
  for(let j=i+2;j<n;j++){
   if(i===0&&j===n-1)continue;
   const c=points[j],d=points[(j+1)%n];
   if(sq(c,d)<eps*eps||maxAX<Math.min(c.x,d.x)-eps||
      Math.max(c.x,d.x)<minAX-eps||maxAY<Math.min(c.y,d.y)-eps||
      Math.max(c.y,d.y)<minAY-eps)continue;
   const cdx=d.x-c.x,cdy=d.y-c.y;
   const den=cross(abx,aby,cdx,cdy);
   if(Math.abs(den)<1e-10)continue;
   const acx=c.x-a.x,acy=c.y-a.y;
   const t=cross(acx,acy,cdx,cdy)/den;
   const u=cross(acx,acy,abx,aby)/den;
   // Exclude only a shared vertex of directly adjacent samples (handled
   // above); a crossing at nonadjacent Bézier sections remains invalid.
   if(t>=-eps&&t<=1+eps&&u>=-eps&&u<=1+eps){
    return {point:{x:a.x+t*abx,y:a.y+t*aby},
     sampleA:i,sampleB:j,
     nodeA:Math.floor(i/samplesPerNode),
     nodeB:Math.floor(j/samplesPerNode)};
   }
  }
 }
 return null;
}

// Banded, forward-only alignment of two uniformly sampled closed loops.
// Unlike a greedy nearest point, alignment cannot jump across the opposite
// leg of a tight hairpin because the sequence must remain globally ordered.
// Called ONLY if legacy fast path reports a dubious progress count.
export function alignForwardRoadOrder(path,centerline){
 const n=path?.length||0;
 if(n<24||centerline?.length!==n)return null;
 const band=Math.min(220,Math.max(28,Math.ceil(n*.16)));
 const width=band*2+1;
 const maxStep=Math.min(15,Math.max(5,Math.ceil(n*.018)));
 const INF=Number.POSITIVE_INFINITY;
 let prev=new Float64Array(width).fill(INF);
 const parents=new Int16Array(n*width).fill(-1);
 const progressCost=(p,j)=>sq(p,centerline[((j%n)+n)%n]);
 for(let shift=-band;shift<=band;shift++){
  const pos=shift+band;
  prev[pos]=progressCost(path[0],shift)+Math.pow(shift*1.5,2);
 }
 for(let i=1;i<n;i++){
  const next=new Float64Array(width).fill(INF);
  for(let shift=-band;shift<=band;shift++){
   const slot=shift+band;
   let best=INF,bestPrev=-1;
   // j advances 0..maxStep centerline samples in one route sample.
   // If shift changes, the unwrapped index is n+i+shift.
   for(let step=0;step<=maxStep;step++){
    const prevShift=shift+1-step;
    if(prevShift< -band||prevShift>band)continue;
    const previous=prev[prevShift+band];
    if(!Number.isFinite(previous))continue;
    const penalty=(step-1)*(step-1)*4;
    const cost=previous+penalty;
    if(cost<best){best=cost;bestPrev=prevShift+band;}
   }
   if(bestPrev<0)continue;
   next[slot]=best+progressCost(path[i],i+shift);
   parents[i*width+slot]=bestPrev;
  }
  prev=next;
 }
 let end=-1,best=INF;
 for(let shift=-band;shift<=band;shift++){
  const slot=shift+band;
  // A complete lap must finish near the point where it started.
  const cost=prev[slot]+Math.pow(shift*1.5,2);
  if(cost<best){best=cost;end=slot;}
 }
 if(end<0||!Number.isFinite(best))return null;
 const raw=new Array(n);let slot=end;
 for(let i=n-1;i>=0;i--){
  raw[i]=i+slot-band;
  if(i>0)slot=parents[i*width+slot];
  if(slot<0)return null;
 }
 const travel=raw[n-1]-raw[0];
 if(travel<n*.78||travel>n*1.22)return null;
 const matches=raw.map(j=>((j%n)+n)%n);
 let maxMismatch=0;
 for(let i=0;i<n;i++){
  const d=Math.sqrt(sq(path[i],centerline[matches[i]]));
  if(d>maxMismatch)maxMismatch=d;
 }
 return {matches,travel,maxMismatch,confidence:'forward-banded'};
}

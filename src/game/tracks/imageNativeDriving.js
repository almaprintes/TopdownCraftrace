// Image-native preview: preserve world/image pixel coordinates, adapt physics
// to a small authored map instead of stretching its geometry.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const vec=p=>({x:Number(p?.x),y:Number(p?.y)});
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

/**
 * Position the kart an authored distance BEFORE the finish gate along the
 * centerline (travel direction). For a closed loop this also handles a finish
 * close to node 0 without changing or reordering the original points.
 */
export function spawnUpstreamOfFinish(centerline,gate,distance=65,options={}) {
  const pts=(Array.isArray(centerline)?centerline:[])
    .map(vec).filter(p=>finite(p.x)&&finite(p.y));
  if(pts.length<3||!gate?.a||!gate?.b)return null;
  if(length(pts[0],pts[pts.length-1])<.01)pts.pop();
  if(pts.length<3)return null;
  const mid={x:(Number(gate.a.x)+Number(gate.b.x))*.5,
             y:(Number(gate.a.y)+Number(gate.b.y))*.5};
  if(!finite(mid.x)||!finite(mid.y))return null;
  const segments=[],n=pts.length;
  let total=0,best=null;
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
    if(l2<1e-6)continue;
    const len=Math.sqrt(l2),t=clamp(((mid.x-a.x)*dx+(mid.y-a.y)*dy)/l2,0,1);
    const x=a.x+t*dx,y=a.y+t*dy,d2=(x-mid.x)**2+(y-mid.y)**2;
    segments.push({index:i,a,b,len,from:total,to:total+len});
    if(!best||d2<best.d2)best={d2,along:total+len*t,x,y};
    total+=len;
  }
  // Fail safely instead of spawning at an unrelated section of a tight track.
  const span=Math.hypot(Number(gate.b.x)-Number(gate.a.x),
                        Number(gate.b.y)-Number(gate.a.y));
  if(!best||total<=0||best.d2>Math.max(25,span*.75)**2)return null;
  // Inverted races may use an explicitly shorter staging distance when the
  // authored painted stripe is wider than the actual road's center section.
  // Calls without options keep their original spawn calculation unchanged.
  const minDistancePx=Number(options?.minDistancePx);
  const minimum=Number.isFinite(minDistancePx)&&minDistancePx>0?Math.max(10,minDistancePx):Math.max(10,span*.55);
  const desired=clamp(Number(distance)||65,minimum,Math.min(160,total*.18));
  let s=((best.along-desired)%total+total)%total;
  for(const edge of segments){
    if(s>edge.to+1e-6)continue;
    const t=clamp((s-edge.from)/edge.len,0,1);
    const x=edge.a.x+(edge.b.x-edge.a.x)*t;
    const y=edge.a.y+(edge.b.y-edge.a.y)*t;
    const r=Math.atan2(edge.b.y-edge.a.y,edge.b.x-edge.a.x);
    const gateNormal=gate.normal;
    const facing=Number(gateNormal?.x)*Math.cos(r)+Number(gateNormal?.y)*Math.sin(r);
    // The normal is optional; authored gates may not store it.
    if(finite(facing)&&facing<-.2)return null;
    return {x,y,r,distanceBeforeFinish:desired};
  }
  return null;
}

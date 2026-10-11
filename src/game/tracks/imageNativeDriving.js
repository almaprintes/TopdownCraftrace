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
export function spawnUpstreamOfFinish(centerline,gate,distance=65) {
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
  const desired=clamp(Number(distance)||65,Math.max(10,span*.55),Math.min(160,total*.18));
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

/** Mild and reversible driving normalization for small authored maps only. */
export function imageNativeDrivingProfile(params,track){
  if(!track||!finite(Number(track.worldW))||!finite(Number(track.worldH))||!params)return params;
  const w=Number(track.worldW),h=Number(track.worldH);
  if(w<=0||h<=0)return params;
  // Physical pixels on a 1672x941 photo represent more real distance than
  // pixels in the legacy 8000x5000 game world. A fifth-power curve avoids an
  // unusably low literal 0.20x speed and still eases tight corners.
  const relative=Math.sqrt((w*h)/(8000*5000));
  const velocityScale=clamp(Math.pow(relative,.20),.55,1);
  const yawBoost=clamp(1.12/velocityScale,1,1.65);
  const steering=params.steering||{};
  return {
    ...params,
    accel:params.accel*velocityScale,
    maxFwd:params.maxFwd*velocityScale,
    maxRev:params.maxRev*velocityScale,
    brakeForce:params.brakeForce*velocityScale,
    engineBrake:params.engineBrake*velocityScale,
    turnRate:params.turnRate*yawBoost,
    steering:{
      ...steering,
      yawSpeedMin:Math.max(4,(steering.yawSpeedMin??12)*velocityScale),
      lowSpeedSteer:Math.max(.43,steering.lowSpeedSteer??.35)
    },
    imageNativeDriving:{velocityScale,yawBoost}
  };
}

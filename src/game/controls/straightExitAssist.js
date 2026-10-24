// Bounded exit-of-corner heading aid for the horizontal touch method only.
// It reads the circuit's existing authored centerline; it never moves the car,
// changes velocity, or engages in corners, reverse recovery or open rally stages.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function point(p){
  if(Array.isArray(p))return {x:Number(p[0]),y:Number(p[1])};
  return {x:Number(p?.x),y:Number(p?.y)};
}
function sample(points,from,t,side,length){
  const a=point(points[from]),b=point(points[from+1]);
  let x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  let i=side>0?from+1:from,remain=length;
  for(let tries=0;tries<120&&i>=0&&i<points.length;tries++,i+=side){
    const next=point(points[i]);
    if(!Number.isFinite(next.x)||!Number.isFinite(next.y))return null;
    const dist=Math.hypot(next.x-x,next.y-y);
    if(dist>=remain&&dist>1e-6){
      const k=remain/dist;
      return {x:x+(next.x-x)*k,y:y+(next.y-y)*k};
    }
    remain-=dist;
    x=next.x;y=next.y;
  }
  return null;
}
export function straightExitCorrection({
  centerline,x,y,heading,speed,trackWidth,onTrack,releaseAgeMs,deltaMs,
  handbrake=false,isStage=false
}={}){
  if(!Array.isArray(centerline)||centerline.length<3||
     ![x,y,heading,speed,deltaMs,releaseAgeMs].every(Number.isFinite)||
     !onTrack||handbrake||isStage||speed<75||
     releaseAgeMs<0||releaseAgeMs>1150||deltaMs<=0)return 0;
  const width=Number.isFinite(trackWidth)&&trackWidth>0?trackWidth:180;
  let bestDist=Infinity,bestI=-1,bestT=0,bestX=0,bestY=0;
  // Only called for a short period after pointer release; no extra raf/timer.
  for(let i=0;i<centerline.length-1;i++){
    const a=point(centerline[i]),b=point(centerline[i+1]);
    if(![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
    const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
    if(len2<1e-5)continue;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/len2,0,1);
    const qx=a.x+dx*t,qy=a.y+dy*t;
    const d2=(x-qx)**2+(y-qy)**2;
    if(d2<bestDist){
      bestDist=d2;bestI=i;bestT=t;bestX=qx;bestY=qy;
    }
  }
  if(bestI<0||bestDist>(width*.35)**2)return 0;
  // Estimate road tangent and reject places where the line is still curved.
  const behind=sample(centerline,bestI,bestT,-1,38);
  const ahead=sample(centerline,bestI,bestT,1,38);
  if(!behind||!ahead)return 0;
  const v1x=bestX-behind.x,v1y=bestY-behind.y;
  const v2x=ahead.x-bestX,v2y=ahead.y-bestY;
  const bend=Math.abs(wrap(Math.atan2(v2y,v2x)-Math.atan2(v1y,v1x)));
  if(bend>.11)return 0;
  const axis=Math.atan2(ahead.y-behind.y,ahead.x-behind.x);
  // Both directions share the same physical centerline; align its sign to the
  // current car heading so inverse tracks are supported without ID exceptions.
  const roadHeading=wrap(axis+ (Math.cos(axis-heading)<0?Math.PI:0));
  if(Math.abs(wrap(roadHeading-heading))>.38)return 0;
  const rx=Math.cos(roadHeading),ry=Math.sin(roadHeading);
  const lateral=rx*(y-bestY)-ry*(x-bestX);
  // Bias the target slightly toward the road center WITHOUT teleportation,
  // lane snapping or steering into a hairpin.
  const bias=Math.atan2(-clamp(lateral,-width*.2,width*.2)*.30,100);
  const error=wrap(roadHeading+bias-heading);
  if(Math.abs(error)>.43)return 0;
  const fade=clamp((1150-releaseAgeMs)/1150,0,1);
  const dt=clamp(deltaMs/1000,0,.05);
  const maxRate=.62*fade;  // at most 35 degrees/sec initially, then fades.
  const step=Math.sign(error)*Math.min(Math.abs(error),Math.abs(error)*2.7*dt,maxRate*dt);
  return Number.isFinite(step)?step:0;
}

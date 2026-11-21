// EXPERIMENTAL: soft author apex hints for the local four-AI Realizador only.
// This module does not affect online races, lap records or physical car limits.
// The road mask is the very same authored Bézier-road mask used by native-photo
// driving; unlike intersecting a tangent with arbitrary neighbouring hairpins,
// it can validate the actual asphalt at each proposed car position.
import {normalizeAiLineGuides} from '../studio/trackAiLineGuides.js';
import {shapeIsValid} from '../studio/trackShapeGeometry.js';
import {makeKartingShapeMask} from '../tracks/localKartingPreview.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function lineCurvature(points){
 const n=points.length;
 return points.map((p,i)=>{
  const prev=points[(i-1+n)%n],next=points[(i+1)%n];
  return wrapAngle(Math.atan2(next.y-p.y,next.x-p.x)-
   Math.atan2(p.y-prev.y,p.x-prev.x));
 });
}
function frames(points){
 const n=points.length;
 return points.map((p,i)=>{
  const a=points[(i-1+n)%n],b=points[(i+1)%n];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(.00001,Math.hypot(dx,dy));
  return {nx:-dy/len,ny:dx/len};
 });
}
function nearestSample(centerline,p){
 let nearest=-1,dist2=Infinity;
 for(let i=0;i<centerline.length;i++){
  const dx=p.x-centerline[i].x,dy=p.y-centerline[i].y;
  const d=dx*dx+dy*dy;
  if(d<dist2){nearest=i;dist2=d;}
 }
 return{index:nearest,distance:Math.sqrt(dist2)};
}
function wrapDistance(i,j,n,spacing){
 const delta=Math.abs(i-j);
 return Math.min(delta,n-delta)*spacing;
}
function fallback(line,reason,entries=[]){
 return{model:line,report:{active:false,reason,accepted:0,total:entries.length,
  entries,changedSamples:0,unsafeSamples:0}};
}
export function buildGuidedTrackRacingLineModel(baseLine,rawGuides,shape,dimensions={},options={}){
 const guides=normalizeAiLineGuides(rawGuides).points;
 if(!baseLine?.valid||!Array.isArray(baseLine.centerline)||
    baseLine.centerline.length<24||baseLine.centerline.length!==baseLine.offsets?.length||
    baseLine.offsets.length!==baseLine.limits?.length)return fallback(baseLine,'invalid-baseline');
 if(!guides.length)return fallback(baseLine,'no-guides');
 if(!shapeIsValid(shape)||!shape.closed)return fallback(baseLine,'missing-bezier-borders');
 const worldW=Number(dimensions.worldW),worldH=Number(dimensions.worldH);
 if(!Number.isFinite(worldW)||!Number.isFinite(worldH)||
    worldW<100||worldH<100||worldW>8192||worldH>8192)
  return fallback(baseLine,'invalid-world');
 const n=baseLine.centerline.length,spacing=Math.max(1,Number(baseLine.spacing)||10);
 const frame=frames(baseLine.centerline);
 const mask=makeKartingShapeMask(shape,worldW,worldH);
 const safeDistance=clamp(Number(options.carRadius)||14,8,40)+
  clamp(Number(options.recoveryMargin)||8,4,24);
 // This check validates the footprint, not merely the vehicle's centre.
 const safe=(x,y)=>{
  if(!mask.isOnTrack(x,y))return false;
  for(let k=0;k<12;k++){
   const a=Math.PI*k/6;
   if(!mask.isOnTrack(x+safeDistance*Math.cos(a),y+safeDistance*Math.sin(a)))return false;
  }
  return true;
 };
 const active=[],entries=[];
 for(const guide of guides){
  if(guide.direction!=='forward')continue;
  if(!safe(guide.x,guide.y)){
   entries.push({id:guide.id,status:'unsafe-apex'});
   continue;
  }
  const found=nearestSample(baseLine.centerline,guide);
  const idx=found.index,center=baseLine.centerline[idx];
  if(idx<0||found.distance>Math.max(70,(Number(center.width)||140)*.78)){
   entries.push({id:guide.id,status:'too-far-from-road-axis'});
   continue;
  }
  const signed=(guide.x-center.x)*frame[idx].nx+(guide.y-center.y)*frame[idx].ny;
  const margin=Number(baseLine.limits[idx])||20;
  const desired=clamp(signed,-margin,margin);
  const old=baseLine.offsets[idx];
  // A tolerance band rather than a compulsory coordinate. The user may
  // draw a point within e.g. 40px; target only a neighbourhood of it.
  const slack=Math.min(guide.radiusPx*.22,12);
  const gap=desired-old;
  const requested=Math.sign(gap)*Math.max(0,Math.abs(gap)-slack);
  if(Math.abs(requested)<.5){
   entries.push({id:guide.id,status:'already-near-guide'});
   continue;
  }
  active.push({id:guide.id,index:idx,requested,weight:guide.strength,
   radius:Math.max(130,(Number(center.width)||140)*2.3),x:guide.x,y:guide.y});
  entries.push({id:guide.id,status:'accepted'});
 }
 if(!active.length)return fallback(baseLine,'no-safe-influential-guides',entries);
 const offsets=baseLine.offsets.map((original,i)=>{
  let correction=0,weight=0;
  for(const g of active){
   const d=wrapDistance(i,g.index,n,spacing);
   if(d>g.radius*1.7)continue;
   // G is a soft pull toward the authored apex only. Never reverse the
   // offset before/after the hint: that forced an exterior counter-swerve
   // in closely linked corners, even when the authored apex was inside.
   const profile=Math.exp(-.5*(d/(g.radius*.41))**2);
   correction+=g.requested*g.weight*profile;
   weight+=Math.abs(profile)*g.weight;
  }
  const limited=clamp(original+correction/Math.max(1,weight),
   -baseLine.limits[i],baseLine.limits[i]);
  return limited;
 });
 // Smooth lateral acceleration while retaining the authored band.
 for(let pass=0;pass<5;pass++){
  const old=offsets.slice();
  for(let i=0;i<n;i++)offsets[i]=clamp(
   (old[(i-2+n)%n]+2*old[(i-1+n)%n]+4*old[i]+
    2*old[(i+1)%n]+old[(i+2)%n])/10,
   -baseLine.limits[i],baseLine.limits[i]);
 }
 // Every newly moved sample must keep the physical body AND recovery buffer
 // on the asphalt. Revert isolated invalid proposals to the B reference.
 const makePoint=(i,offset)=>({
  x:baseLine.centerline[i].x+frame[i].nx*offset,
  y:baseLine.centerline[i].y+frame[i].ny*offset
 });
 let clipped=0,baselineUnsafe=0,changedSamples=0;
 for(let i=0;i<n;i++){
  const original=baseLine.offsets[i],proposed=offsets[i];
  const p0=makePoint(i,original);
  if(!safe(p0.x,p0.y))baselineUnsafe++;
  if(Math.abs(proposed-original)<.25){offsets[i]=original;continue;}
  const next=makePoint(i,proposed);
  if(!safe(next.x,next.y)){
   // Search between base and request. Do not invent a safe road segment.
   let found=original;
   if(safe(p0.x,p0.y)){
    for(let step=1;step<=12;step++){
     const t=1-step/12,candidate=original+(proposed-original)*t;
     const p=makePoint(i,candidate);
     if(safe(p.x,p.y)){found=candidate;break;}
    }
   }
   offsets[i]=found;clipped++;
  }
  if(Math.abs(offsets[i]-original)>.25)changedSamples++;
 }
 // A nominally shorter path can still be worse if guide pulls produce
 // near-hairpin polygon kinks. The real steering/yaw envelope must NEVER be
 // bypassed by a 2-radian jump between adjacent ~10 px path samples.
 // Ease guided offsets toward the already-tested B geometry LOCALLY around
 // excessive heading changes, while checking the same asphalt footprint.
 const initialTurns=lineCurvature(baseLine.centerline.map((_,i)=>makePoint(i,offsets[i])));
 const maxBefore=Math.max(...initialTurns.map(v=>Math.abs(v)));
 const headingLimit=i=>Math.max(.38,Math.abs(baseLine.curvature[i]||0)*1.2+.10);
 let steeringLimitedSamples=0,steeringPasses=0;
 for(;steeringPasses<36;steeringPasses++){
  const angles=lineCurvature(baseLine.centerline.map((_,i)=>makePoint(i,offsets[i])));
  const problem=[];
  for(let i=0;i<n;i++)if(Math.abs(angles[i])>headingLimit(i))problem.push(i);
  if(!problem.length)break;
  const blend=new Array(n).fill(1);
  for(const i of problem){
   for(let d=-9;d<=9;d++){
    const j=(i+d+n)%n;
    blend[j]=Math.min(blend[j],1-.42*(1-Math.abs(d)/10));
   }
  }
  for(let i=0;i<n;i++){
   if(blend[i]>=1)continue;
   const newOffset=baseLine.offsets[i]+
     (offsets[i]-baseLine.offsets[i])*blend[i];
   const candidate=makePoint(i,newOffset);
   offsets[i]=safe(candidate.x,candidate.y)?newOffset:baseLine.offsets[i];
  }
 }
 const racingLine=baseLine.centerline.map((_,i)=>makePoint(i,offsets[i]));
 const curvature=lineCurvature(racingLine);
 const maxAfter=Math.max(...curvature.map(v=>Math.abs(v)));
 if(curvature.some((v,i)=>Math.abs(v)>headingLimit(i)+.005))
  return fallback(baseLine,'steering-continuity-not-recovered',entries);
 steeringLimitedSamples=initialTurns.filter((v,i)=>
   Math.abs(v)>headingLimit(i)).length;
 changedSamples=offsets.filter((v,i)=>
   Math.abs(v-baseLine.offsets[i])>.25).length;
 if(changedSamples<5)return fallback(baseLine,'insufficient-safe-correction',entries);
 const metrics={...baseLine.metrics,
  meanAbsCurvature:curvature.reduce((a,v)=>a+Math.abs(v),0)/n,
  maxAbsCurvature:Math.max(...curvature.map(v=>Math.abs(v))),
  maxAbsOffset:Math.max(...offsets.map(v=>Math.abs(v))),guided:true};
 const report={active:true,reason:'experimental-safe-guide-pull',accepted:active.length,
  total:guides.length,entries,changedSamples,clippedSamples:clipped,
  baselineUnsafeSamples:baselineUnsafe,safetyRadiusPx:safeDistance,
  headingKinksBefore:steeringLimitedSamples,
  maxTurnBeforeRad:Number(maxBefore.toFixed(4)),
  maxTurnAfterRad:Number(maxAfter.toFixed(4)),
  headingLimitPasses:steeringPasses,
  // B itself is not proven to be fully homologated. Never imply otherwise.
  homologated:false};
 return{model:{...baseLine,offsets,racingLine,curvature,metrics},report};
}

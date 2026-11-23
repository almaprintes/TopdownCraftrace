// DEV only: convert the artist's closed Bézier race line to a sampled
// continuous route. Never replace track geometry, physics, or lap gates.
import {normalizeAiBezierLine,sampleAiBezierLine} from '../studio/trackAiBezierLine.js';
import {shapeIsValid} from '../studio/trackShapeGeometry.js';
import {makeKartingShapeMask} from '../tracks/localKartingPreview.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fail=(baseline,reason,extra={})=>({model:baseline,
 report:{active:false,mode:'bezier',reason,accepted:0,total:0,homologated:false,...extra}});
function uniformRoute(points,count){
 const n=points.length,cumulative=[0];
 for(let i=0;i<n;i++)cumulative.push(cumulative[i]+distance(points[i],points[(i+1)%n]));
 const total=cumulative[n];
 if(total<50)return null;
 const out=[];let segment=0;
 for(let i=0;i<count;i++){
  const d=i*total/count;
  while(segment<n-1&&cumulative[segment+1]<d)segment++;
  const a=points[segment],b=points[(segment+1)%n];
  const part=Math.max(.00001,cumulative[segment+1]-cumulative[segment]);
  const t=clamp((d-cumulative[segment])/part,0,1);
  out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 }
 return{points:out,total};
}
function turns(points){
 const n=points.length;return points.map((p,i)=>{
  const a=points[(i-1+n)%n],b=points[(i+1)%n];
  return wrap(Math.atan2(b.y-p.y,b.x-p.x)-Math.atan2(p.y-a.y,p.x-a.x));
 });
}
export function buildBezierAiRacingLineModel(baseline,rawBezier,shape,dimensions={},options={}){
 const bezier=normalizeAiBezierLine(rawBezier),n=baseline?.centerline?.length||0;
 if(!baseline?.valid||n<24||!bezier)return fail(baseline,'invalid-bezier');
 if(!shapeIsValid(shape)||!shape.closed)return fail(baseline,'missing-borders');
 const w=Number(dimensions.worldW),h=Number(dimensions.worldH);
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<100||h<100||w>8192||h>8192)
  return fail(baseline,'invalid-world');
 const dense=sampleAiBezierLine(bezier,30);
 // Rotate the path to its nearest point at the centerline's start while
 // preserving its authored forward direction.
 let start=0,best=Infinity;
 dense.forEach((p,i)=>{
  const d=distance(p,baseline.centerline[0]);
  if(d<best){best=d;start=i;}
 });
 const rotated=[...dense.slice(start),...dense.slice(0,start)];
 const sampled=uniformRoute(rotated,n);
 if(!sampled)return fail(baseline,'short-bezier');
 if(sampled.total<baseline.lengthPx*.72||sampled.total>baseline.lengthPx*1.28)
  return fail(baseline,'length-mismatch',{ratio:sampled.total/baseline.lengthPx});
 // A closed spline has no mandatory first anchor at the starting grid.
 // A driver may choose ten apexes without marking the start/finish line.
 // The former "start-mismatch" check wrongly rejected these valid splines.
 // Check safety and correspondence to the road instead of node-zero phase.
 const path=sampled.points,first=baseline.centerline;
 const mask=makeKartingShapeMask(shape,w,h);
 const safeRadius=clamp(Number(options.carRadius)||14,8,40)+4;
 const safe=p=>{
  if(!mask.isOnTrack(p.x,p.y))return false;
  for(let k=0;k<12;k++){
   const a=2*Math.PI*k/12;
   if(!mask.isOnTrack(p.x+Math.cos(a)*safeRadius,p.y+Math.sin(a)*safeRadius))return false;
  }
  return true;
 };
 const unsafe=path.findIndex(p=>!safe(p));
 if(unsafe>=0)return fail(baseline,'outside-safe-asphalt',{badIndex:unsafe});
 // Follow a topologically CONTINUOUS route through the centerline. For a
 // hairpin, the physically nearest sample on the opposite leg may be much
 // farther ahead in lap progress, so matching may only move forward locally.
 // The previous check assumed path[i] should match centerline[i] +/-20;
 // that fails on different arc-length distributions and arbitrary starts.
 // The physical road mask above decides whether the entire car fits.
 // NEVER reject a safe racing line merely for being >75px from centerline:
 // Santa Cruz has broad, correctly authored road sections where an apex is
 // >100px from the axis. Distance here is DIAGNOSTIC ONLY.
 // Match to the forward road order to reject direction reversals and jumps.
 const matches=[],maxForward=Math.min(18,Math.max(7,
   Math.ceil(2.5*sampled.total/Math.max(1,baseline.lengthPx))));
 let previous=-1,travel=0,maxMismatch=0;
 for(let i=0;i<n;i++){
  let closest=Infinity,index=-1,advance=0;
  const firstStep=i===0?0:Math.min(maxForward,n-1);
  for(let step=0;step<=(i===0?n-1:firstStep);step++){
   const j=i===0?step:(previous+step)%n;
   const d=distance(path[i],first[j]);
   if(d<closest){closest=d;index=j;advance=step;}
  }
  if(i>0)travel+=advance;
  maxMismatch=Math.max(maxMismatch,closest);
  previous=index;matches.push(index);
 }
 const from=first[matches[0]],to=first[(matches[0]+3)%n];
 const baseAngle=Math.atan2(to.y-from.y,to.x-from.x);
 const pathAngle=Math.atan2(path[3].y-path[0].y,path[3].x-path[0].x);
 if(Math.abs(wrap(pathAngle-baseAngle))>1.35)
  return fail(baseline,'wrong-direction');
 if(travel<n*.75||travel>n*1.25)
  return fail(baseline,'route-order-break',
    {travelSamples:travel,expectedSamples:n});
 const curvature=turns(path);
 const maxTurn=Math.max(...curvature.map(v=>Math.abs(v)));
 if(maxTurn>.62)return fail(baseline,'steering-discontinuity',{maxTurnRad:maxTurn});
 const normals=first.map((_,i)=>{
  const a=first[(i-1+n)%n],b=first[(i+1)%n],x=b.x-a.x,y=b.y-a.y;
  const len=Math.max(.01,Math.hypot(x,y));return{nx:-y/len,ny:x/len};
 });
 const offsets=path.map((p,i)=>{
  const j=matches[i];
  return(p.x-first[j].x)*normals[j].nx+
    (p.y-first[j].y)*normals[j].ny;
 });
 const metrics={...baseline.metrics,meanAbsCurvature:
  curvature.reduce((a,v)=>a+Math.abs(v),0)/n,maxAbsCurvature:maxTurn,
  maxAbsOffset:Math.max(...offsets.map(v=>Math.abs(v))),guided:true,
  authoredBezier:true};
 return{model:{...baseline,racingLine:path,offsets,curvature,metrics,
  lengthPx:sampled.total},
  report:{active:true,mode:'bezier',reason:'authored-bezier',accepted:bezier.nodes.length,
   total:bezier.nodes.length,homologated:false,changedSamples:n,
   maxMismatchPx:Math.round(maxMismatch),startDistancePx:Math.round(best),
   maxTurnRad:Number(maxTurn.toFixed(3)),
   targets:[],entries:[],safeRadius}};
}

export function buildBezierDieVariant(base,face,seat,shape,dimensions={},options={}){
 if(!base?.valid||!base?.metrics?.authoredBezier||!shapeIsValid(shape))
  return base;
 const amplitudes={1:26,2:20,3:13,4:9,5:2.5,6:0};
 const amplitude=amplitudes[face]??0;
 if(!amplitude)return base;
 const n=base.racingLine.length,mask=makeKartingShapeMask(shape,
  Number(dimensions.worldW),Number(dimensions.worldH));
 const radius=clamp(Number(options.carRadius)||14,8,40)+4;
 const baseCurvature=base.curvature;
 const envelope=baseCurvature.map((_,i)=>{
  let energy=0;
  for(let d=-8;d<=8;d++){
   const weight=(9-Math.abs(d))/81;
   energy+=weight*Math.abs(baseCurvature[(i+d+n)%n]);
  }
  return clamp((energy-.003)/.035,0,1);
 });
 const normal=base.racingLine.map((_,i)=>{
  const a=base.racingLine[(i-2+n)%n],b=base.racingLine[(i+2)%n];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(.01,Math.hypot(dx,dy));
  return {x:-dy/len,y:dx/len};
 });
 // Optional DEV experiment: all faces use the same lateral oscillation phase
 // for a given seat. Compute the maximum asphalt-safe amplitude once, then
 // scale every die face by the same monotone fraction. A 1/6 can no longer
 // be clipped below a 2/6 merely because its phase is different.
 if(options.monotoneCalibration===true){
  const phase=seat*1.731+.317;
  const generate=amp=>{
   const path=base.racingLine.map((p,i)=>{
    const offset=amp*envelope[i]*Math.sin(i/n*Math.PI*6+phase);
    return{x:p.x+normal[i].x*offset,y:p.y+normal[i].y*offset};
   });
   for(const p of path){
    if(!mask.isOnTrack(p.x,p.y))return null;
    for(let k=0;k<12;k++){
     const a=Math.PI*2*k/12;
     if(!mask.isOnTrack(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius))
      return null;
    }
   }
   const curvature=turns(path);
   if(curvature.some((v,i)=>Math.abs(v)>
     Math.max(.62,Math.abs(baseCurvature[i])+.10)))return null;
   return{path,curvature};
  };
  const safeMax=(()=>{
   if(generate(26))return 26;
   let lo=0,hi=26;
   for(let i=0;i<11;i++){
    const mid=(lo+hi)/2;
    if(generate(mid))lo=mid;else hi=mid;
   }
   return lo;
  })();
  const scale=amplitude/26;
  // Leave a 7% envelope margin between the target and validated edge
  // limit. This limits physical off-road excursions after steering error.
  const intended=safeMax*scale*.93;
  let built=generate(intended),effective=intended;
  if(!built){
   for(const factor of [.98,.95,.9,.8,.5,.25,0]){
    effective=intended*factor;
    built=generate(effective);
    if(built)break;
   }
  }
  if(!built)return base;
  const {path,curvature}=built;
  const offsets=base.offsets.map((v,i)=>{
   const p=path[i],b=base.racingLine[i];
   return v+(p.x-b.x)*normal[i].x+(p.y-b.y)*normal[i].y;
  });
  const metrics={...base.metrics,meanAbsCurvature:
    curvature.reduce((a,v)=>a+Math.abs(v),0)/n,
   maxAbsCurvature:Math.max(...curvature.map(v=>Math.abs(v))),
   maxAbsOffset:Math.max(...offsets.map(v=>Math.abs(v))),
   dieVariationPx:effective,dieFace:face,
   dieSafeMaxPx:safeMax,dieCalibration:'monotone-v1'};
  return{...base,racingLine:path,curvature,offsets,metrics};
 }
 const phase=(seat*1.731+face*.317);
 for(const factor of [1,.5,.25,.125,0]){
  const path=base.racingLine.map((p,i)=>{
   const oscillation=Math.sin(i/n*Math.PI*6+phase);
   const offset=amplitude*factor*envelope[i]*oscillation;
   return {x:p.x+normal[i].x*offset,y:p.y+normal[i].y*offset};
  });
  if(path.some(p=>{
   if(!mask.isOnTrack(p.x,p.y))return true;
   for(let k=0;k<12;k++){
    const a=Math.PI*2*k/12;
    if(!mask.isOnTrack(p.x+Math.cos(a)*radius,
        p.y+Math.sin(a)*radius))return true;
   }
   return false;
  }))continue;
  const curvature=turns(path);
  if(curvature.some((v,i)=>Math.abs(v)>Math.max(.62,Math.abs(baseCurvature[i])+.10)))
   continue;
  const offsets=base.offsets.map((v,i)=>{
   const p=path[i],b=base.racingLine[i];
   return v+(p.x-b.x)*normal[i].x+(p.y-b.y)*normal[i].y;
  });
  const metrics={...base.metrics,meanAbsCurvature:
   curvature.reduce((a,v)=>a+Math.abs(v),0)/n,
   maxAbsCurvature:Math.max(...curvature.map(v=>Math.abs(v))),
   maxAbsOffset:Math.max(...offsets.map(v=>Math.abs(v))),
   dieVariationPx:amplitude*factor,dieFace:face};
  return{...base,racingLine:path,curvature,offsets,metrics};
 }
 return base;
}

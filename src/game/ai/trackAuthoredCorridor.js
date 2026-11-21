// DEV Realizador B ONLY. Bound the proposed racing line against authored
// Bézier road edges instead of trusting a symmetric width around the center.
// Diagnostic/opt-in module; never used by the hosted LIVE 4 A controller.
// Cross-section intersection is deliberately conservative: reject corridors
// with incomplete coverage instead of inventing a safe edge.
import {shapeIsValid,sampleShapeEdge} from '../studio/trackShapeGeometry.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

function segmentPairs(points){
 const out=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return [];
  out.push({ax:a.x,ay:a.y,dx:b.x-a.x,dy:b.y-a.y});
 }
 return out;
}

// Intersections of the normal to the track with BOTH authored edges.
// Keep the nearest crossing on each side of the centerline. Distant pieces
// of another hairpin are not accepted as the current road's boundary.
function crossSection(segments,cx,cy,tx,ty,nx,ny,maxSpan){
 let positive=Infinity,negative=Infinity;
 for(const s of segments){
  const ax=s.ax-cx,ay=s.ay-cy;
  const along=ax*tx+ay*ty;
  const alongStep=s.dx*tx+s.dy*ty;
  if(Math.abs(alongStep)<1e-9)continue;
  const u=-along/alongStep;
  if(u<0||u>1)continue;
  const lateral=(ax+s.dx*u)*nx+(ay+s.dy*u)*ny;
  if(lateral>0&&lateral<=maxSpan)positive=Math.min(positive,lateral);
  else if(lateral<0&&-lateral<=maxSpan)negative=Math.min(negative,-lateral);
 }
 return Number.isFinite(positive)&&Number.isFinite(negative)
  ?{positive,negative}:null;
}
function curve(points){
 const n=points.length;
 return points.map((p,i)=>{
  const prev=points[(i-1+n)%n],next=points[(i+1)%n];
  const a=Math.atan2(p.y-prev.y,p.x-prev.x);
  const b=Math.atan2(next.y-p.y,next.x-p.x);
  return wrapAngle(b-a);
 });
}
export function constrainRacecraftToAuthoredEdges(line,shape,options={}){
 const unchanged=(reason)=>({model:line,report:{applied:false,reason,coveragePct:0}});
 if(!line?.valid||!Array.isArray(line.centerline)||!Array.isArray(line.offsets)||
    !Array.isArray(line.limits)||line.centerline.length!==line.offsets.length)
  return unchanged('invalid-line');
 if(!shapeIsValid(shape)||shape.closed!==true)return unchanged('missing-authored-edges');
 const pointsA=sampleShapeEdge(shape.leftEdge,true,8);
 const pointsB=sampleShapeEdge(shape.rightEdge,true,8);
 if(pointsA.length+pointsB.length>12000||pointsA.length<16||pointsB.length<16)
  return unchanged('invalid-edge-sampling');
 const segments=segmentPairs(pointsA).concat(segmentPairs(pointsB));
 if(!segments.length)return unchanged('invalid-edge-segments');
 const n=line.centerline.length;
 const carRadius=clamp(Number(options.carRadius)||14,7,40);
 const reservePx=clamp(Number(options.reservePx)||14,7,30);
 const roadClearances=new Array(n).fill(0);
 const physicalLimits=new Array(n).fill(0);
 let hits=0,minRawWidth=Infinity;
 for(let i=0;i<n;i++){
  const p=line.centerline[i];
  const prev=line.centerline[(i-1+n)%n],next=line.centerline[(i+1)%n];
  const dx=next.x-prev.x,dy=next.y-prev.y,length=Math.hypot(dx,dy);
  if(length<1e-5)continue;
  const tx=dx/length,ty=dy/length,nx=-ty,ny=tx;
  const annotatedWidth=Number(p.width);
  const estimatedWidth=Number.isFinite(annotatedWidth)&&annotatedWidth>0
   ?annotatedWidth:140;
  const maxSpan=clamp(estimatedWidth*1.1,50,700);
  const section=crossSection(segments,p.x,p.y,tx,ty,nx,ny,maxSpan);
  if(!section)continue;
  const closest=Math.min(section.positive,section.negative);
  if(!Number.isFinite(closest)||closest<=1)continue;
  hits++;
  minRawWidth=Math.min(minRawWidth,closest);
  roadClearances[i]=closest;
  physicalLimits[i]=Math.min(Math.max(0,Number(line.limits[i])||0),
   Math.max(0,closest-carRadius-reservePx));
 }
 const coverage=hits/Math.max(1,n);
 // A discontinuous road envelope cannot safely clip a racing line.
 // In this situation retain the old preview line and show the diagnostic.
 if(coverage<.95)return unchanged('incomplete-authored-corridor:'+Math.round(coverage*100)+'%');
 let offsets=line.offsets.map((v,i)=>clamp(v,-physicalLimits[i],physicalLimits[i]));
 // Prevent spikes where the boundary tightens suddenly.
 for(let pass=0;pass<8;pass++){
  const copy=offsets.slice();
  offsets=copy.map((v,i)=>clamp(
   (copy[(i-2+n)%n]+2*copy[(i-1+n)%n]+4*v+
    2*copy[(i+1)%n]+copy[(i+2)%n])/10,
   -physicalLimits[i],physicalLimits[i]
  ));
 }
 const racingLine=line.centerline.map((p,i)=>{
  const prev=line.centerline[(i-1+n)%n],next=line.centerline[(i+1)%n];
  const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(.0001,Math.hypot(dx,dy));
  return{x:p.x-dy/len*offsets[i],y:p.y+dx/len*offsets[i]};
 });
 const curvature=curve(racingLine);
 const clearance=Math.min(...offsets.map((v,i)=>roadClearances[i]-Math.abs(v)));
 const model={...line,limits:physicalLimits,offsets,racingLine,curvature,
  metrics:{...line.metrics,meanAbsCurvature:curvature.reduce((s,v)=>s+Math.abs(v),0)/n,
   maxAbsCurvature:Math.max(...curvature.map(Math.abs)),
   maxAbsOffset:Math.max(...offsets.map(Math.abs)),
   authoredCrossSectionCoverage:coverage,
   authoredMinRoadClearance:clearance,
   authoredReservePx:carRadius+reservePx}};
 return{model,report:{applied:true,reason:'authored-bounded',
  coveragePct:Math.round(coverage*100),
  carAndRecoveryMarginPx:carRadius+reservePx,
  minClearancePx:Number(clearance.toFixed(1)),
  meanAbsOffsetPx:Number((offsets.reduce((sum,v)=>sum+Math.abs(v),0)/n).toFixed(1))}};
}

// LIVE 4 grid geometry shared by the host and Director.
// Use the directed race path, not the underlying undirected artwork.
import {loopPathMetrics,gateOnLoop,sampleLoopAt} from '../tracks/closedCircuitGateOrder.js';
import {roadGateEdges,gateRoadCrossings} from '../tracks/raceGateWidth.js';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const live4CompactGridTrack=id=>id==='karting-tenerife'||id==='karting-tenerife-horario';
export function makeLive4StartingGrid({
 start,trackWidth,carScale=1,capacity=4,centerline=null,finishLine=null,
 compact=false,trackShape=null,vehicleVisualScale=1,offlineFullGrid=false
}={}){
 if(!start||![start.x,start.y,start.r].every(finite)||
    !Number.isInteger(capacity)||capacity<2||(capacity>4&&!(offlineFullGrid===true&&capacity===17)))throw Error('Invalid start grid');
 const width=Number(trackWidth),scale=Math.max(.35,Math.min(1.5,Number(carScale)||1));
 const visual=compact?Math.max(.35,Math.min(1.5,Number(vehicleVisualScale)||1)):1;
 const carWidth=48*1.35*scale*visual;
 const carLength=96*1.35*scale*visual;
 const parallelGap=(width-2*carWidth)/3;
 const standardParallel=Number.isFinite(width)&&parallelGap>=Math.max(12,carWidth*.18);
 const rowGap=carLength+Math.max(24,carLength*.25);
 // Prefer the actual finish-line intersection with the directed race path.
 let metrics=null,gate=null;
 if(Array.isArray(centerline)&&centerline.length>=3&&finishLine?.a&&finishLine?.b){
   metrics=loopPathMetrics(centerline);
   gate=gateOnLoop(metrics,finishLine);
   if(!gate?.hit||gate.offset>Math.max(50,width*.55))
     throw Error('LIVE 4 finish gate is not aligned with the circuit centerline');
   // Defensive guard: callers passing the base road in the opposite direction
   // must not spawn the entire grid looking away from the finish normal.
   const n=finishLine.normal;
   if(finite(n?.x)&&finite(n?.y)&&gate.tangent.x*n.x+gate.tangent.y*n.y<0){
     metrics=loopPathMetrics(centerline.slice().reverse());
     gate=gateOnLoop(metrics,finishLine);
   }
 }
 const trackAligned=Boolean(metrics&&gate);
 const sampleRow=along=>{
   const s=trackAligned?sampleLoopAt(metrics,gate.routeDistance-along):null;
   const r=s?Math.atan2(s.tangent.y,s.tangent.x):start.r;
   return {x:s?s.x:start.x-Math.cos(r)*(along-90),
     y:s?s.y:start.y-Math.sin(r)*(along-90),r};
 };
 // Tenerife has a narrow nominal road but real authored borders. Measure
 // the full car envelope in each prospective row. Use a smaller parking
 // clearance only when both unscaled cars actually fit inside the asphalt.
 const road=compact&&trackShape?roadGateEdges({trackShape}):null;
 function compactRow(row){
   const p=sampleRow(90+rowGap*row),nx=-Math.sin(p.r),ny=Math.cos(p.r);
   let left=-width/2,right=width/2;
   if(road?.source==='bezier'){
     left=-Infinity;right=Infinity;
     for(const d of [-carLength/2,0,carLength/2]){
       const x=p.x+Math.cos(p.r)*d,y=p.y+Math.sin(p.r)*d;
       const hit=gateRoadCrossings({a:{x:x-nx*width,y:y-ny*width},
         b:{x:x+nx*width,y:y+ny*width}},road);
       if(!hit||Math.max(-hit.negative.t,hit.positive.t)>width*1.5)return null;
       left=Math.max(left,hit.negative.t);right=Math.min(right,hit.positive.t);
     }
   }
   const gap=(right-left-2*carWidth)/3;
   if(!Number.isFinite(gap)||gap<2*scale)return null;
   return {first:left+gap+carWidth/2,second:right-gap-carWidth/2};
 }
 const compactRows=compact?Array.from({length:Math.ceil(capacity/2)},(_,row)=>compactRow(row)):null;
 const compactParallel=Boolean(compactRows?.every(Boolean));
 const parallel=compact?compactParallel:standardParallel;
 const longitudinal=parallel?rowGap:rowGap*1.05;
 const offset=parallel?(carWidth+parallelGap)/2:0;
 const positions=[];
 if(offlineFullGrid&&capacity===17){
   if(!trackAligned||90+longitudinal*(parallel?8:16)+carLength>metrics.total*.30)
     throw Error('La parrilla de 17 coches no cabe en este circuito');
 }
 for(let seat=0;seat<capacity;seat++){
   const row=parallel?Math.floor(seat/2):seat;
   const lateral=parallel?(compactParallel?(seat%2===0?compactRows[row].first:compactRows[row].second):
     (seat%2===0?-offset:offset)):0;
   const p=sampleRow(90+longitudinal*row),r=p.r;
   const nx=-Math.sin(r),ny=Math.cos(r);
   positions.push(Object.freeze({x:p.x+nx*lateral,y:p.y+ny*lateral,r,seat}));
 }
 if(offlineFullGrid&&capacity===17){
   for(let i=0;i<positions.length;i++)for(let j=0;j<i;j++)if(Math.hypot(positions[i].x-positions[j].x,positions[i].y-positions[j].y)<carWidth*.9)throw Error('Parrilla completa con plazas solapadas');
 }
 return Object.freeze({parallel,trackAligned,positions:Object.freeze(positions)});
}

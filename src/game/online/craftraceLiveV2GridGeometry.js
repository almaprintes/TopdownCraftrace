// LIVE 4 grid geometry shared by the host and Director.
// The physical grid must follow the actual circuit when the finish straight
// curves; a constant backwards vector can place rear cars off the asphalt.
import {loopPathMetrics,gateOnLoop,sampleLoopAt} from '../tracks/closedCircuitGateOrder.js';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function makeLive4StartingGrid({
 start,trackWidth,carScale=1,capacity=4,centerline=null,finishLine=null,
 frontOffsetPx=90
}={}){
 if(!start||![start.x,start.y,start.r].every(finite)||
    !Number.isInteger(capacity)||capacity<2||capacity>4)throw Error('Invalid start grid');
 const width=Number(trackWidth),scale=Math.max(.35,Math.min(1.5,Number(carScale)||1));
 const carWidth=48*1.35*scale;
 const carLength=96*1.35*scale;
 const parallelGap=(width-2*carWidth)/3;
 const parallel=Number.isFinite(width)&&parallelGap>=Math.max(12,carWidth*.18);
 const rowGap=carLength+Math.max(24,carLength*.25);
 const longitudinal=parallel?rowGap:rowGap*1.05;
 const offset=parallel?(carWidth+parallelGap)/2:0;
 // Prefer the actual finish-line intersection with the race centerline. Use
 // route-distance interpolation (not a fixed heading vector) for every row.
 let metrics=null,gate=null;
 if(Array.isArray(centerline)&&centerline.length>=3&&finishLine?.a&&finishLine?.b){
   metrics=loopPathMetrics(centerline);
   gate=gateOnLoop(metrics,finishLine);
   if(!gate?.hit||gate.offset>Math.max(50,width*.55))
     throw Error('LIVE 4 finish gate is not aligned with the circuit centerline');
 }
 const trackAligned=Boolean(metrics&&gate);
 const positions=[];
 for(let seat=0;seat<capacity;seat++){
   const row=parallel?Math.floor(seat/2):seat;
   const lateral=parallel?(seat%2===0?-offset:offset):0;
   // 90 px prevents the front axle of the first physical car from hanging
   // over the finish stripe before the green light. The original grid used
   // another 44 px at spawn; no hidden extra shift is applied on this path.
   const along=Math.max(90,Math.min(900,Number(frontOffsetPx)||90))+longitudinal*row;
   const sample=trackAligned?sampleLoopAt(metrics,gate.routeDistance-along):null;
   const r=sample?Math.atan2(sample.tangent.y,sample.tangent.x):start.r;
   const nx=-Math.sin(r),ny=Math.cos(r);
   const fx=Math.cos(r),fy=Math.sin(r);
   positions.push(Object.freeze({
     x:(sample?sample.x:start.x-fx*longitudinal*row)+nx*lateral,
     y:(sample?sample.y:start.y-fy*longitudinal*row)+ny*lateral,
     r,seat
   }));
 }
 return Object.freeze({parallel,trackAligned,positions:Object.freeze(positions)});
}

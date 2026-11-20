// Live 4 starting positions. Pure geometry, computed identically on each device.
// Two abreast only when actual asphalt width safely fits two car bodies.
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function makeLive4StartingGrid({
 start,trackWidth,carScale=1,capacity=4
}={}){
 if(!start||![start.x,start.y,start.r].every(finite)||
    !Number.isInteger(capacity)||capacity<2||capacity>4)throw Error('Invalid start grid');
 const width=Number(trackWidth),scale=Math.max(.35,Math.min(1.5,Number(carScale)||1));
 const carWidth=48*1.35*scale;
 const carLength=96*1.35*scale;
 const parallelGap=(width-2*carWidth)/3;
 const parallel=Number.isFinite(width)&&parallelGap>=Math.max(12,carWidth*.18);
 const nx=-Math.sin(start.r),ny=Math.cos(start.r);
 const fx=Math.cos(start.r),fy=Math.sin(start.r);
 const rowGap=carLength+Math.max(24,carLength*.25);
 const longitudinal=parallel?rowGap:rowGap*1.05;
 const offset=parallel?(carWidth+parallelGap)/2:0;
 const positions=[];
 for(let seat=0;seat<capacity;seat++){
   const row=parallel?Math.floor(seat/2):seat;
   const lateral=parallel?(seat%2===0?-offset:offset):0;
   positions.push(Object.freeze({
     x:start.x+nx*lateral-fx*longitudinal*row,
     y:start.y+ny*lateral-fy*longitudinal*row,
     r:start.r,seat
   }));
 }
 return Object.freeze({parallel,positions:Object.freeze(positions)});
}

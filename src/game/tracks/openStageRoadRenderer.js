// An open A→B rally road must consist exclusively of its consecutive edges.
// Drawing thousands of nodes as one Phaser Graphics strokePath can produce a
// huge spurious end-to-start chord in the editor WebGL renderer. lineBetween
// creates a separate, bounded two-point stroke for each REAL route segment.
export function drawOpenStageRoad(graphics,rawPoints,trackWidth=90){
 const center=(Array.isArray(rawPoints)?rawPoints:[]).map(p=>({
   x:Number(p?.x??p?.[0]),y:Number(p?.y??p?.[1])
 })).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 const width=Math.max(10,Number(trackWidth)||90);
 if(center.length<2)return {count:center.length,segments:0,maxSegment:0};
 const left=[],right=[];
 for(let i=0;i<center.length;i++){
   const p=center[i],prev=center[Math.max(0,i-1)],next=center[Math.min(center.length-1,i+1)];
   const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;
   const nx=-dy/len,ny=dx/len,half=width*.5;
   left.push({x:p.x+nx*half,y:p.y+ny*half});
   right.push({x:p.x-nx*half,y:p.y-ny*half});
 }
 const drawSegments=pts=>{
   for(let i=1;i<pts.length;i++){
     // Crucially: never use i % pts.length or graphics.closePath.
     graphics.lineBetween(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
   }
 };
 let maxSegment=0;
 for(let i=1;i<center.length;i++){
   const a=center[i-1],b=center[i];
   maxSegment=Math.max(maxSegment,Math.hypot(b.x-a.x,b.y-a.y));
 }
 graphics.lineStyle(width,0x2c2b2b,1);
 drawSegments(center);
 graphics.lineStyle(Math.max(2,width*.015),0xe8edf0,.92);
 drawSegments(left);
 drawSegments(right);
 return {count:center.length,segments:center.length-1,maxSegment};
}

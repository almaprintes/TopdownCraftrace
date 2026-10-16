// Render official open A→B stage as a Canvas2D bitmap, not Phaser Graphics.
// An explicit open path cannot add a META -> SALIDA shortcut. Used ONLY by
// Environment Studio; racing geometry, collisions and source remain untouched.
export function paintOpenStageRoad(ctx,rawPoints,width=90){
 const points=(Array.isArray(rawPoints)?rawPoints:[]).map(p=>({
  x:Number(p?.x??p?.[0]),y:Number(p?.y??p?.[1])
 })).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 if(points.length<2)return {points:points.length,segments:0};
 const w=Math.max(10,Number(width)||90);
 const left=[],right=[];
 for(let i=0;i<points.length;i++){
  const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len;
  left.push({x:p.x+nx*w/2,y:p.y+ny*w/2});
  right.push({x:p.x-nx*w/2,y:p.y-ny*w/2});
 }
 const openStroke=(list,color,thickness)=>{
  ctx.beginPath();
  ctx.moveTo(list[0].x,list[0].y);
  for(let i=1;i<list.length;i++)ctx.lineTo(list[i].x,list[i].y);
  // DO NOT ctx.closePath(): this is a rally A -> B.
  ctx.strokeStyle=color;ctx.lineWidth=thickness;
  ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
 };
 openStroke(points,'#2c2b2b',w);
 openStroke(left,'#e8edf0',Math.max(2,w*.015));
 openStroke(right,'#e8edf0',Math.max(2,w*.015));
 return {points:points.length,segments:points.length-1};
}
// Keep total canvas height below mobile GPU limits. Two tight tiles cover
// the route bbox and can be placed in the same Phaser world coordinates.
export function stageRasterTilePlan(rawPoints,width=90,maxTileHeight=2304){
 const points=(Array.isArray(rawPoints)?rawPoints:[]).filter(p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y)));
 if(points.length<2)return[];
 const pad=Math.max(48,Number(width)||90);
 const minX=Math.floor(Math.min(...points.map(p=>p.x))-pad);
 const minY=Math.floor(Math.min(...points.map(p=>p.y))-pad);
 const maxX=Math.ceil(Math.max(...points.map(p=>p.x))+pad);
 const maxY=Math.ceil(Math.max(...points.map(p=>p.y))+pad);
 const w=Math.ceil(maxX-minX),h=Math.ceil(maxY-minY);
 if(w>4096)throw Error('Open-stage raster too wide for a mobile texture');
 const tiles=[];
 for(let y=0;y<h;y+=maxTileHeight){
  tiles.push({x:minX,y:minY+y,width:w,height:Math.min(maxTileHeight,h-y)});
 }
 return tiles;
}

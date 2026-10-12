// Spatial bucketing for decorative and authored collision segments.
// Geometry stays unchanged; only the list tested for each car is reduced.
export const COLLIDER_CELL_SIZE=256;
// Existing cars are much smaller than this margin. Including it in each
// collider's index bounds permits an O(1) lookup by the car's current cell.
export const COLLIDER_QUERY_MARGIN=96;

export function colliderBounds(c){
  if(!c||typeof c!=='object')return null;
  if(Number.isFinite(c.radius)&&Number.isFinite(c.cx)&&Number.isFinite(c.cy)){
    const r=Math.max(0,c.radius);
    return {minX:c.cx-r,maxX:c.cx+r,minY:c.cy-r,maxY:c.cy+r};
  }
  if(![c.ax,c.ay,c.bx,c.by].every(Number.isFinite))return null;
  const half=Math.max(0,Number(c.halfThickness)||0);
  return {minX:Math.min(c.ax,c.bx)-half,maxX:Math.max(c.ax,c.bx)+half,
    minY:Math.min(c.ay,c.by)-half,maxY:Math.max(c.ay,c.by)+half};
}
export function buildColliderSpatialIndex(colliders,cellSize=COLLIDER_CELL_SIZE,margin=COLLIDER_QUERY_MARGIN){
  if(!Array.isArray(colliders))return null;
  const size=Math.max(64,Math.round(Number(cellSize)||COLLIDER_CELL_SIZE));
  const pad=Math.max(0,Number(margin)||0);
  const cells=new Map();
  for(const c of colliders){
    const rect=colliderBounds(c);
    if(!rect)continue;
    const x0=Math.floor((rect.minX-pad)/size),x1=Math.floor((rect.maxX+pad)/size);
    const y0=Math.floor((rect.minY-pad)/size),y1=Math.floor((rect.maxY+pad)/size);
    // Malformed huge obstacles should fall back to the existing full scan.
    if((x1-x0+1)*(y1-y0+1)>4096)return null;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const key=x+','+y;
      let list=cells.get(key);
      if(!list){list=[];cells.set(key,list);}
      list.push(c);
    }
  }
  return {cellSize:size,margin:pad,cells,count:colliders.length};
}
export function nearbyColliders(index,x,y,fullList=[],vehicleRadius=14){
  // If a future car has a collision radius larger than this index's safety
  // padding, fall back to the old exhaustive check rather than miss walls.
  if(!index||!Number.isFinite(x)||!Number.isFinite(y)||
    vehicleRadius>index.margin-6)return fullList;
  return index.cells.get(Math.floor(x/index.cellSize)+','+Math.floor(y/index.cellSize))||[];
}

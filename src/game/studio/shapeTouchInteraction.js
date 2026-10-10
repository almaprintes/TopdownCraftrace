// Pure, zoom-stable hit testing for TrackStudio's mobile edge editor.
// Coordinates are always world pixels. Radii are measured in screen pixels.
import { shapeIsValid, sampleShapeEdge } from './trackShapeGeometry.js';

function distancePointSegment(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0;
  return Math.hypot(p.x-(a.x+dx*t),p.y-(a.y+dy*t));
}
function insidePolygon(p,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if(((a.y>p.y)!==(b.y>p.y)) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
function nearestEdgePoint(edge,closed,p,zoom){
  // Bezier geometry, not straight lines connecting distant control nodes.
  let nearest={dist:Infinity,index:0};
  const samples=14, count=closed?edge.length:edge.length-1;
  for(let i=0;i<count;i++){
    const a=edge[i],b=edge[(i+1)%edge.length];
    const section=sampleShapeEdge([a,b],false,samples);
    for(let j=0;j<section.length-1;j++){
      const d=distancePointSegment(p,section[j],section[j+1])*zoom;
      if(d<nearest.dist)nearest={dist:d,index:(j+0.5)/samples<.5?i:(i+1)%edge.length};
    }
  }
  return nearest;
}
export function pickShapeTarget(shape,selected,world,zoomRaw){
  if(!shapeIsValid(shape)||![world?.x,world?.y].every(Number.isFinite))return null;
  const zoom=Math.max(.01,Number(zoomRaw)||1),dist=(p)=>Math.hypot(world.x-p.x,world.y-p.y)*zoom;
  const target=(side,index,part,kind)=>({type:'shape',side,index,part,kind});
  // Selected anchor wins over nearby handles if they overlap on a small screen.
  // Otherwise use the closer handle, without shifting the other control.
  if(selected&&shape[selected.side]?.[selected.index]){
    const n=shape[selected.side][selected.index];
    const anchorD=dist(n),inD=dist(n.handleIn),outD=dist(n.handleOut);
    const handleD=Math.min(inD,outD);
    if(anchorD<=23 && anchorD<=handleD+3){
      return target(selected.side,selected.index,'anchor','node');
    }
    if(handleD<=22 && handleD<anchorD){
      return target(selected.side,selected.index,inD<=outD?'handleIn':'handleOut','handle');
    }
  }
  let best=null,bestD=26;
  for(const side of ['leftEdge','rightEdge']){
    for(let i=0;i<shape[side].length;i++){
      const d=dist(shape[side][i]);
      if(d<bestD){bestD=d;best=target(side,i,'anchor','node');}
    }
  }
  if(best)return best;
  const l=nearestEdgePoint(shape.leftEdge,shape.closed,world,zoom);
  const r=nearestEdgePoint(shape.rightEdge,shape.closed,world,zoom);
  if(Math.min(l.dist,r.dist)<=24){
    const side=l.dist<=r.dist?'leftEdge':'rightEdge',nearest=side==='leftEdge'?l:r;
    return target(side,nearest.index,'anchor','edge');
  }
  // Tapping the asphalt itself selects the closer border; tapping empty grass pans.
  const left=sampleShapeEdge(shape.leftEdge,shape.closed,14),
        right=sampleShapeEdge(shape.rightEdge,shape.closed,14);
  const region=[...left,...right.slice().reverse()];
  if(region.length>=6&&insidePolygon(world,region)){
    const side=l.dist<=r.dist?'leftEdge':'rightEdge',nearest=side==='leftEdge'?l:r;
    return target(side,nearest.index,'anchor','surface');
  }
  return null;
}
export function isSelectedShapeControl(hit,selected){
  return !!hit&&!!selected&&hit.type==='shape'&&
    (hit.kind==='handle'||hit.kind==='node')&&
    hit.side===selected.side&&hit.index===selected.index;
}
export function offsetShapeDragTarget(world,offset){
  return {x:world.x+(offset?.x||0),y:world.y+(offset?.y||0)};
}

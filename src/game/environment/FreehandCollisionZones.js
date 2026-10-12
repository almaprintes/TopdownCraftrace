// Pure, deterministic world-space geometry for freehand solid collision areas.
// Vertices are stored in map pixels; renderer and physics share the same polygon.
const finitePoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
export function polygonSignedArea(points){
  let sum=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.x*b.y-b.x*a.y;}
  return sum*.5;
}
function toSegmentDistanceSq(p,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,len2=vx*vx+vy*vy;
  const t=len2?Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/len2)):0;
  const x=a.x+t*vx,y=a.y+t*vy;
  return {d2:(p.x-x)**2+(p.y-y)**2,x,y,t};
}
function rdp(points,epsilon){
  if(points.length<=2)return points.slice();
  const a=points[0],b=points[points.length-1];
  let best=-1,bestIndex=-1;
  for(let i=1;i<points.length-1;i++){
    const d=toSegmentDistanceSq(points[i],a,b).d2;
    if(d>best){best=d;bestIndex=i;}
  }
  if(best<=epsilon*epsilon)return[a,b];
  return [...rdp(points.slice(0,bestIndex+1),epsilon).slice(0,-1),...rdp(points.slice(bestIndex),epsilon)];
}
function cross(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function intersects(a,b,c,d){
  const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),z=cross(c,d,b);
  return (u*v<0&&w*z<0);
}
function simplePolygon(points){
  const n=points.length;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    if(intersects(points[i],points[(i+1)%n],points[j],points[(j+1)%n]))return false;
  }
  return true;
}
export function validCollisionZone(zone){
  const pts=zone?.points;
  return Array.isArray(pts)&&pts.length>=3&&pts.length<=240&&pts.every(finitePoint)&&
    Math.abs(polygonSignedArea(pts))>=100&&simplePolygon(pts);
}
export function simplifyFreehandZone(raw,{tolerance=5,maxPoints=180}={}){
  const input=(raw||[]).filter(finitePoint).map(p=>({x:Number(p.x),y:Number(p.y)}));
  if(input.length<3)return null;
  if(dist2(input[0],input.at(-1))<tolerance*tolerance)input.pop();
  const cleaned=[];
  for(const p of input)if(!cleaned.length||dist2(p,cleaned.at(-1))>=.75*.75)cleaned.push(p);
  if(cleaned.length<3)return null;
  // Preserve the wrap junction in a closed outline by rotating its seam away
  // from the earliest point when possible. No artificial corner/curve creation.
  let threshold=Math.max(.5,tolerance),result=cleaned;
  for(let tries=0;tries<12;tries++){
    const midpoint=Math.floor(cleaned.length/2);
    const ordered=[...cleaned.slice(midpoint),...cleaned.slice(0,midpoint),cleaned[midpoint]];
    result=rdp(ordered,threshold).slice(0,-1);
    if(result.length<=maxPoints)break;
    threshold*=1.45;
  }
  if(result.length>maxPoints)return null;
  const zone={points:result,solid:true};
  return validCollisionZone(zone)?zone:null;
}
export function pointInsidePolygon(points,p){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.y>p.y)!==(b.y>p.y) &&
      p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
export function compileCollisionZone(zone){
  if(!validCollisionZone(zone))return null;
  const points=zone.points.map(p=>({x:p.x,y:p.y}));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {points,minX:Math.min(...xs),maxX:Math.max(...xs),
    minY:Math.min(...ys),maxY:Math.max(...ys),orientation:Math.sign(polygonSignedArea(points))};
}
// Compute one separation and outward normal for a circular car. This resolves
// deep penetration as well as boundary contact; no freehand-area friction or
// slowing effects are introduced.
export function resolveCollisionZone(zone,pos,radius){
  const r=Math.max(1,Number(radius)||1);
  if(pos.x<zone.minX-r||pos.x>zone.maxX+r||pos.y<zone.minY-r||pos.y>zone.maxY+r)return null;
  const inside=pointInsidePolygon(zone.points,pos);
  let nearest=null,distSq=Infinity,edgeA=null,edgeB=null;
  for(let i=0;i<zone.points.length;i++){
    const a=zone.points[i],b=zone.points[(i+1)%zone.points.length];
    const q=toSegmentDistanceSq(pos,a,b);
    if(q.d2<distSq){distSq=q.d2;nearest=q;edgeA=a;edgeB=b;}
  }
  const d=Math.sqrt(distSq);
  if(!inside&&d>=r)return null;
  let nx=inside?(nearest.x-pos.x):(pos.x-nearest.x);
  let ny=inside?(nearest.y-pos.y):(pos.y-nearest.y);
  const len=Math.hypot(nx,ny);
  if(len>1e-7){nx/=len;ny/=len;}
  else {
    const dx=edgeB.x-edgeA.x,dy=edgeB.y-edgeA.y,L=Math.hypot(dx,dy)||1;
    nx=zone.orientation>=0?dy/L:-dy/L;
    ny=zone.orientation>=0?-dx/L:dx/L;
  }
  // Inside: exit the polygon and add clearance; outside: stop before boundary.
  const push=(inside?d+r:r-d)+.75;
  return {x:pos.x+nx*push,y:pos.y+ny*push,nx,ny,inside};
}

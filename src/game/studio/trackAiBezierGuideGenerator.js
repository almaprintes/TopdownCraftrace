// Track Studio DEV: convert the author's *existing* apex guide coordinates
// into a complete, editable Bezier racing line. Use the road axis only to keep
// guide-to-guide connections on the correct topological branch of the circuit.
// The resulting Bezier MUST pass through every guide anchor exactly.
import {sampleShapeEdge} from './trackShapeGeometry.js';
import {normalizeAiLineGuides} from './trackAiLineGuides.js';
import {AI_BEZIER_MAX_NODES,normalizeAiBezierLine} from './trackAiBezierLine.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const VALID_RANGE=8192;

export function createAiBezierFromGuides(sourceNodes,rawGuides,{
 maxNodes=76,trackWidth=140,influencePx=140
}={}){
 const guides=normalizeAiLineGuides(rawGuides).points;
 if(!guides.length)throw Error('No hay puntos guía: utiliza el botón GENERAR DESDE EJE');
 if(!Array.isArray(sourceNodes)||sourceNodes.length<3||
    sourceNodes.some(p=>!finite(p)||!finite(p.handleIn)||!finite(p.handleOut)))
  throw Error('El eje del circuito no contiene nodos Bézier válidos');
 const max=clamp(Math.floor(maxNodes)||76,Math.max(3,guides.length+3),AI_BEZIER_MAX_NODES);
 const road=sampleShapeEdge(sourceNodes,true,6);
 const n=road.length;
 const cumulative=[0];
 for(let i=0;i<n;i++)cumulative.push(cumulative[i]+dist(road[i],road[(i+1)%n]));
 const length=cumulative[n];
 if(length<90)throw Error('El circuito no tiene longitud suficiente para crear una trazada');
 const anchors=[];
 const used=new Set();
 for(const guide of guides){
  let closest=Infinity,index=0;
  for(let i=0;i<n;i++){
   const d=dist(guide,road[i]);
   if(d<closest){closest=d;index=i;}
  }
  const allowed=Math.max(55,Math.min(170,trackWidth*.85));
  if(closest>allowed)
   throw Error('La guía '+guide.id+' está a '+Math.round(closest)+
     ' px del eje y podría pertenecer a otro tramo. Revisa su posición.');
  if(used.has(index))
   throw Error('Las guías se superponen en el mismo tramo: separa '+guide.id);
  used.add(index);
  anchors.push({id:guide.id,index,x:guide.x,y:guide.y,offsetX:guide.x-road[index].x,
   offsetY:guide.y-road[index].y,distancePx:closest});
 }
 anchors.sort((a,b)=>a.index-b.index);
 // Position along the road is used only for ordering and gentle transitions.
 // Do NOT simply join the apex points with long chords across hairpins.
 const support=clamp(influencePx,60,210);
 const byIndex=new Map(anchors.map(a=>[a.index,a]));
 const adjusted=road.map((p,index)=>{
  let dx=0,dy=0,weights=0;
  for(const g of anchors){
   const arc=Math.abs(cumulative[index]-cumulative[g.index]);
   const along=Math.min(arc,length-arc);
   if(along>support*3.5)continue;
   const w=Math.exp(-.5*(along/support)**2);
   dx+=g.offsetX*w;dy+=g.offsetY*w;weights+=w;
  }
  const blend=Math.max(1,weights);
  return{x:p.x+dx/blend,y:p.y+dy/blend};
 });
 // The precise guide point wins at its anchor even when influences overlap.
 for(const guide of anchors)adjusted[guide.index]={x:guide.x,y:guide.y};
 const chosen=new Set([0,...anchors.map(a=>a.index)]);
 // Evenly distributed backbone nodes preserve the route topology between
 // the guide coordinates, including straights and adjacent hairpin branches.
 const budget=Math.max(0,max-chosen.size);
 for(let i=0;i<budget;i++)chosen.add(Math.floor((i+.5)*n/Math.max(1,budget)));
 // In the rare case of overlaps, fill gaps by arc length rather than dropping guides.
 const indices=[...chosen].sort((a,b)=>a-b);
 while(indices.length<Math.min(max,n)){
  let gap=-1,at=null;
  for(let i=0;i<indices.length;i++){
   const a=indices[i],b=i===indices.length-1?indices[0]+n:indices[i+1];
   if(b-a>gap){gap=b-a;at=(a+Math.floor((b-a)/2))%n;}
  }
  if(gap<=1||chosen.has(at))break;
  chosen.add(at);indices.push(at);indices.sort((a,b)=>a-b);
 }
 const nodes=indices.map(index=>({...adjusted[index]}));
 const count=nodes.length;
 for(let i=0;i<count;i++){
  const prev=nodes[(i-1+count)%count],now=nodes[i],next=nodes[(i+1)%count];
  const tx=next.x-prev.x,ty=next.y-prev.y;
  const tl=Math.max(1e-8,Math.hypot(tx,ty));
  const arm=Math.min(70,dist(now,prev)*.32,dist(now,next)*.32);
  // A shared tangent through each node guarantees C1 continuity by design.
  const hx=tx/tl*arm,hy=ty/tl*arm;
  now.handleIn={x:clamp(now.x-hx,0,VALID_RANGE),y:clamp(now.y-hy,0,VALID_RANGE)};
  now.handleOut={x:clamp(now.x+hx,0,VALID_RANGE),y:clamp(now.y+hy,0,VALID_RANGE)};
 }
 const line=normalizeAiBezierLine({version:1,closed:true,nodes});
 if(!line)throw Error('No se pudo normalizar la curva guiada');
 const errors=anchors.filter(g=>!line.nodes.some(node=>node.x===g.x&&node.y===g.y));
 if(errors.length)throw Error('No se conservaron las guías: '+errors.map(x=>x.id).join(', '));
 return{line,usedGuides:anchors.map(({id,index,distancePx})=>({id,index,distancePx})),
  source:'guide-anchors',roadLengthPx:length};
}

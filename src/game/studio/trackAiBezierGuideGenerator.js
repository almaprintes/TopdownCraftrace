// Track Studio DEV: exactly ONE editable Bézier node per authored AI guide.
// The original road axis is used ONLY for sorting guides along the direction of
// travel and rejecting misplaced/duplicate guides. It never creates nodes.
// The author adjusts curve shape through tangent handles or the + NODO tool.
import {sampleShapeEdge} from './trackShapeGeometry.js';
import {normalizeAiLineGuides} from './trackAiLineGuides.js';
import {AI_BEZIER_MAX_NODES,normalizeAiBezierLine} from './trackAiBezierLine.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const VALID_RANGE=8192;

export function createAiBezierFromGuides(sourceNodes,rawGuides,{trackWidth=140}={}){
 const guides=normalizeAiLineGuides(rawGuides).points;
 if(guides.length<3)throw Error(
   'Se necesitan al menos 3 puntos guía para cerrar la trayectoria Bézier');
 if(guides.length>AI_BEZIER_MAX_NODES)
  throw Error('Demasiadas guías para la trayectoria Bézier');
 if(!Array.isArray(sourceNodes)||sourceNodes.length<3||
    sourceNodes.some(p=>!finite(p)||!finite(p.handleIn)||!finite(p.handleOut)))
  throw Error('El eje del circuito no contiene nodos Bézier válidos');
 const road=sampleShapeEdge(sourceNodes,true,6);
 const n=road.length;
 const anchors=[],used=new Set();
 for(const guide of guides){
  let closest=Infinity,index=0;
  for(let i=0;i<n;i++){
   const d=distance(guide,road[i]);
   if(d<closest){closest=d;index=i;}
  }
  const allowed=Math.max(55,Math.min(170,trackWidth*.85));
  if(closest>allowed)
   throw Error('La guía '+guide.id+' está a '+Math.round(closest)+
     ' px del eje y podría pertenecer a otro tramo. Revisa su posición.');
  if(used.has(index))
   throw Error('Las guías se superponen en el mismo tramo: separa '+guide.id);
  used.add(index);
  anchors.push({id:guide.id,index,x:guide.x,y:guide.y,distancePx:closest});
 }
 anchors.sort((a,b)=>a.index-b.index);
 // Crucial: no backbone / support / interpolated nodes. Every generated
 // anchor belongs to an actual user-placed guide, and the shape is closed.
 const nodes=anchors.map(({x,y})=>({x,y}));
 for(let i=0;i<nodes.length;i++){
  const before=nodes[(i-1+nodes.length)%nodes.length];
  const p=nodes[i],after=nodes[(i+1)%nodes.length];
  const dx=after.x-before.x,dy=after.y-before.y;
  const length=Math.max(1e-8,Math.hypot(dx,dy));
  const arm=Math.min(140,distance(p,before)*.28,distance(p,after)*.28);
  const hx=dx/length*arm,hy=dy/length*arm;
  // Gentle provisional C1 tangents, intended for manual adjustment.
  p.handleIn={x:clamp(p.x-hx,0,VALID_RANGE),y:clamp(p.y-hy,0,VALID_RANGE)};
  p.handleOut={x:clamp(p.x+hx,0,VALID_RANGE),y:clamp(p.y+hy,0,VALID_RANGE)};
 }
 const line=normalizeAiBezierLine({version:1,closed:true,nodes});
 if(!line||line.nodes.length!==guides.length)
  throw Error('La trayectoria no conserva exactamente los puntos guía');
 for(const g of anchors)
  if(!line.nodes.some(p=>p.x===g.x&&p.y===g.y))
   throw Error('Falta el punto guía '+g.id);
 return{line,usedGuides:anchors.map(({id,index,distancePx})=>({id,index,distancePx})),
  source:'guide-anchors'};
}

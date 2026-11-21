// Independent, editable closed Bezier AI trajectory. Never mutates road edges.
import {sampleShapeEdge} from './trackShapeGeometry.js';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validPoint=p=>finite(p?.x)&&finite(p?.y)&&p.x>=0&&p.y>=0&&p.x<=8192&&p.y<=8192;
export const AI_BEZIER_MAX_NODES=80;
export function normalizeAiBezierLine(raw){
 const nodes=Array.isArray(raw?.nodes)?raw.nodes:[];
 if(raw?.version!==1||raw?.closed!==true||nodes.length<3||
    nodes.length>AI_BEZIER_MAX_NODES)return null;
 const out=[];
 for(const p of nodes){
  if(!validPoint(p)||!validPoint(p.handleIn)||!validPoint(p.handleOut))return null;
  out.push({x:p.x,y:p.y,handleIn:{x:p.handleIn.x,y:p.handleIn.y},
   handleOut:{x:p.handleOut.x,y:p.handleOut.y}});
 }
 return{version:1,closed:true,nodes:out};
}
export function createAiBezierFromTrackNodes(points,maxNodes=32){
 if(!Array.isArray(points)||points.length<3)throw Error('Dibuja primero la pista cerrada');
 const count=Math.min(AI_BEZIER_MAX_NODES,Math.max(3,maxNodes));
 const chosen=points.length<=count?points:
  Array.from({length:count},(_,i)=>points[Math.floor(i*points.length/count)]);
 const nodes=chosen.map((p,i)=>{
  const before=chosen[(i-1+chosen.length)%chosen.length];
  const after=chosen[(i+1)%chosen.length];
  const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
  const half=Math.min(100,Math.hypot(after.x-p.x,after.y-p.y)*.32,
   Math.hypot(p.x-before.x,p.y-before.y)*.32);
  const tx=dx/length*half,ty=dy/length*half;
  return{x:p.x,y:p.y,handleIn:{x:p.x-tx,y:p.y-ty},
   handleOut:{x:p.x+tx,y:p.y+ty}};
 });
 const line=normalizeAiBezierLine({version:1,closed:true,nodes});
 if(!line)throw Error('No se pudo crear la trayectoria editable');
 return line;
}
export function sampleAiBezierLine(line,steps=16){
 const parsed=normalizeAiBezierLine(line);
 return parsed?sampleShapeEdge(parsed.nodes,true,steps):[];
}
export function moveAiBezierPart(line,index,part,world){
 const parsed=normalizeAiBezierLine(line),node=parsed?.nodes?.[index];
 if(!node||!validPoint(world)||!['anchor','handleIn','handleOut'].includes(part))
  return null;
 if(part==='anchor'){
  const dx=world.x-node.x,dy=world.y-node.y;
  node.x=world.x;node.y=world.y;
  node.handleIn.x+=dx;node.handleIn.y+=dy;
  node.handleOut.x+=dx;node.handleOut.y+=dy;
  if(!validPoint(node.handleIn)||!validPoint(node.handleOut))return null;
 }else node[part]={x:world.x,y:world.y};
 return parsed;
}
export function resizeAiBezierLine(line,sx,sy){
 const parsed=normalizeAiBezierLine(line);
 if(!parsed)return null;
 for(const p of parsed.nodes)for(const pt of [p,p.handleIn,p.handleOut]){
  pt.x*=sx;pt.y*=sy;
 }
 return normalizeAiBezierLine(parsed);
}

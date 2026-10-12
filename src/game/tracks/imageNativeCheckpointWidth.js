// Karting Tenerife official image-native track: resize only CP gate segments to
// reach the already authored Bézier strip edges. Never edit trackShape,
// centerline, finishLine, start/spawn or the master .tdrtrack.
import { sampleShapeEdge, shapeIsValid } from '../studio/trackShapeGeometry.js';

const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const valid=p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y));
const GATE_PAD_PX=4;

export function checkpointEdgeIntersections(gate,shape){
  if(!shapeIsValid(shape)||!shape.closed||!valid(gate?.a)||!valid(gate?.b))
    throw Error('Checkpoint o bordes Bézier inválidos');
  const a=gate.a,b=gate.b;
  const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y),span=Math.hypot(dx,dy);
  if(span<1)throw Error('Checkpoint sin anchura');
  const ux=dx/span,uy=dy/span;
  const center={x:(Number(a.x)+Number(b.x))*.5,y:(Number(a.y)+Number(b.y))*.5};
  const hits=[];
  for(const side of ['leftEdge','rightEdge']){
    const pts=sampleShapeEdge(shape[side],true,24);
    for(let i=0;i<pts.length;i++){
      const p=pts[i],q=pts[(i+1)%pts.length],vx=q.x-p.x,vy=q.y-p.y;
      const det=cross(ux,uy,vx,vy);
      if(Math.abs(det)<1e-9)continue;
      const wx=p.x-center.x,wy=p.y-center.y;
      const u=cross(wx,wy,ux,uy)/det;
      if(u<-.00001||u>1.00001)continue;
      const t=cross(wx,wy,vx,vy)/det;
      if(Number.isFinite(t))hits.push({t,side});
    }
  }
  const negative=hits.filter(h=>h.t<-.0001).sort((a,b)=>b.t-a.t)[0];
  const positive=hits.filter(h=>h.t>.0001).sort((a,b)=>a.t-b.t)[0];
  if(!negative||!positive)
    throw Error('No se pudieron encontrar los dos bordes de la pista para el checkpoint');
  return {center,unit:{x:ux,y:uy},halfAuthored:span*.5,negative,positive};
}

export function expandCheckpointToEdges(gate,shape,{pad=GATE_PAD_PX,maxDistance=650}={}){
  const {center,unit,halfAuthored,negative,positive}=checkpointEdgeIntersections(gate,shape);
  if(Math.max(Math.abs(negative.t),positive.t)>maxDistance)
    throw Error('Checkpoint demasiado lejos de los bordes Bézier; revisar trazado');
  // Never shorten the original gate; account for asymmetric road width.
  // The original center and segment direction stay on exactly the same line.
  const from=Math.min(-halfAuthored,negative.t-pad);
  const to=Math.max(halfAuthored,positive.t+pad);
  return {
    ...gate,
    a:{...gate.a,x:center.x+unit.x*from,y:center.y+unit.y*from},
    b:{...gate.b,x:center.x+unit.x*to,y:center.y+unit.y*to}
  };
}

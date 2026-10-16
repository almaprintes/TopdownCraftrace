// Exact open Track Studio Bézier roadway collision/surface mask.
// Built once at race start. Unlike closed polygon masks, never connects
// the first and last samples, preserving the independent rally endpoints.
import {shapeIsValid,sampleShapeEdge} from '../studio/trackShapeGeometry.js';

const CELL=64;
const xy=p=>({x:Number(p.x),y:Number(p.y)});
const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function inTri(p,a,b,c){
  const u=cross(a,b,p),v=cross(b,c,p),w=cross(c,a,p);
  return (u>=-1e-5&&v>=-1e-5&&w>=-1e-5)||
    (u<=1e-5&&v<=1e-5&&w<=1e-5);
}
function inQuad(p,q){
  return inTri(p,q[0],q[1],q[2])||inTri(p,q[0],q[2],q[3]);
}
export function makeOpenStagePhotoMask(shape,worldW,worldH){
  if(!shapeIsValid(shape)||shape.closed!==false)
    throw Error('La máscara fotográfica de rally necesita los dos bordes Bézier ABIERTOS');
  const w=Number(worldW),h=Number(worldH);
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1)
    throw Error('Dimensiones de rally incorrectas');
  const l=sampleShapeEdge(shape.leftEdge,false,12);
  const r=sampleShapeEdge(shape.rightEdge,false,12);
  if(l.length!==r.length||l.length<2)throw Error('Bordes incompatibles');
  const quads=[],cells=new Map();
  for(let i=0;i<l.length-1;i++){
    const q=[xy(l[i]),xy(r[i]),xy(r[i+1]),xy(l[i+1])];
    if(!q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))
      throw Error('Punto Bézier inválido');
    const index=quads.length;quads.push(q);
    const xs=q.map(p=>p.x),ys=q.map(p=>p.y);
    const xa=Math.max(0,Math.floor(Math.min(...xs)/CELL));
    const xb=Math.min(Math.floor((w-1)/CELL),Math.floor(Math.max(...xs)/CELL));
    const ya=Math.max(0,Math.floor(Math.min(...ys)/CELL));
    const yb=Math.min(Math.floor((h-1)/CELL),Math.floor(Math.max(...ys)/CELL));
    for(let cy=ya;cy<=yb;cy++)for(let cx=xa;cx<=xb;cx++){
      const k=cy+':'+cx;let row=cells.get(k);
      if(!row){row=[];cells.set(k,row);}
      row.push(index);
    }
  }
  const isOnTrack=(x,y)=>{
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=w||y>=h)return false;
    const p={x,y},row=cells.get(Math.floor(y/CELL)+':'+Math.floor(x/CELL));
    return !!row?.some(index=>inQuad(p,quads[index]));
  };
  return {
    isOnTrack,
    isGrass(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<w&&y<h&&!isOnTrack(x,y);},
    quadCount:quads.length,
    cellCount:cells.size
  };
}

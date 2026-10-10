// Image-native TrackStudio: independent editable Bezier boundaries.
// Editor-only shape geometry. The driving/physics integration belongs to phase C.
const numeric = n => typeof n === 'number' && Number.isFinite(n);
const point = p => ({x:Number(p.x), y:Number(p.y)});
const between = (a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const close = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function shapeIsValid(shape){
  if(!shape || shape.version!==1 || typeof shape.closed!=='boolean')return false;
  return ['leftEdge','rightEdge'].every(key=>{
    const side=shape[key];
    return Array.isArray(side)&&side.length>=(shape.closed?3:2)&&side.length<=1200&&
      side.every(p=>numeric(p.x)&&numeric(p.y)&&numeric(p.handleIn?.x)&&numeric(p.handleIn?.y)&&numeric(p.handleOut?.x)&&numeric(p.handleOut?.y));
  });
}
function outwardNormal(nodes,i,closed){
  const p=nodes[i],count=nodes.length;
  const prev=nodes[closed?(i-1+count)%count:Math.max(i-1,0)];
  const next=nodes[closed?(i+1)%count:Math.min(i+1,count-1)];
  let dx=Number(p.handleOut?.x)-Number(p.handleIn?.x),dy=Number(p.handleOut?.y)-Number(p.handleIn?.y);
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<1e-5){
    dx=next.x-prev.x;dy=next.y-prev.y;
  }
  const length=Math.hypot(dx,dy)||1;
  return {x:-dy/length,y:dx/length};
}
export function createTrackShape(nodes,width,closed){
  if(!Array.isArray(nodes)||nodes.length<(closed?3:2))throw Error('Faltan nodos para convertir en pista');
  if(!Number.isFinite(width)||width<=0)throw Error('Ancho de pista no válido');
  const edges=[[],[]];
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i],normal=outwardNormal(nodes,i,closed),half=width*.5;
    if(![n.x,n.y,n.handleIn?.x,n.handleIn?.y,n.handleOut?.x,n.handleOut?.y].every(Number.isFinite))throw Error('Nodo Bézier inválido');
    for(let side=0;side<2;side++){
      // Same ordering as the existing _buildTrackStrip: left = -normal, right = +normal.
      const sign=side===0?-1:1,offset={x:normal.x*sign*half,y:normal.y*sign*half};
      edges[side].push({
        x:n.x+offset.x,y:n.y+offset.y,
        handleIn:{x:n.handleIn.x+offset.x,y:n.handleIn.y+offset.y},
        handleOut:{x:n.handleOut.x+offset.x,y:n.handleOut.y+offset.y}
      });
    }
  }
  const shape={version:1,closed:!!closed,sourceNodeCount:nodes.length,leftEdge:edges[0],rightEdge:edges[1]};
  if(!shapeIsValid(shape))throw Error('No se pudieron generar los dos bordes');
  return shape;
}
function cubic(a,b,c,d,t){
  const q=1-t,q2=q*q,t2=t*t;
  return {x:q2*q*a.x+3*q2*t*b.x+3*q*t2*c.x+t2*t*d.x,
          y:q2*q*a.y+3*q2*t*b.y+3*q*t2*c.y+t2*t*d.y};
}
export function sampleShapeEdge(nodes,closed,steps=12){
  if(!Array.isArray(nodes)||nodes.length<2)return[];
  const pts=[],segments=closed?nodes.length:nodes.length-1;
  const count=Math.max(3,Math.min(40,Math.floor(steps)));
  for(let i=0;i<segments;i++){
    const a=nodes[i],b=nodes[(i+1)%nodes.length];
    for(let k=0;k<count;k++)pts.push(cubic(a,a.handleOut,b.handleIn,b,k/count));
  }
  if(!closed)pts.push(point(nodes[nodes.length-1]));
  return pts;
}
// De Casteljau subdivision preserves the entire original contour EXACTLY at t=0.5.
export function splitShapeEdge(edge,index,closed){
  if(!Array.isArray(edge)||edge.length<2||!Number.isInteger(index)||index<0||index>=edge.length)throw Error('Segmento inválido');
  const a=edge[index],nextIndex=index+1;
  if(!closed&&nextIndex>=edge.length)throw Error('Selecciona otro nodo; este es el final');
  const b=edge[nextIndex%edge.length];
  const p0=point(a),p1=point(a.handleOut),p2=point(b.handleIn),p3=point(b);
  const q0=between(p0,p1,.5),q1=between(p1,p2,.5),q2=between(p2,p3,.5),
    r0=between(q0,q1,.5),r1=between(q1,q2,.5),m=between(r0,r1,.5);
  a.handleOut=q0;b.handleIn=q2;
  edge.splice(index+1,0,{x:m.x,y:m.y,handleIn:r0,handleOut:r1});
  return index+1;
}
export function moveShapePart(shape,side,index,part,target){
  const edge=shape?.[side],node=edge?.[index];
  if(!node || !['anchor','handleIn','handleOut'].includes(part)||![target?.x,target?.y].every(numeric))return false;
  if(part==='anchor'){
    const dx=target.x-node.x,dy=target.y-node.y;
    node.x=target.x;node.y=target.y;
    node.handleIn.x+=dx;node.handleIn.y+=dy;
    node.handleOut.x+=dx;node.handleOut.y+=dy;
  } else { node[part].x=target.x;node[part].y=target.y; }
  return true;
}
export function copyTrackShape(shape){return shapeIsValid(shape)?JSON.parse(JSON.stringify(shape)):null;}

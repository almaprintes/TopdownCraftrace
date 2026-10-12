// Geometría pura para colisiones invisibles trazadas con pluma Bézier.
// Los nodos son coordenadas del mundo de Track Studio, sin escalado.
const good=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export const penNode=(x,y)=>({x,y,in:{x,y},out:{x,y}});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function validCollisionLine(line){
  return Array.isArray(line?.nodes)&&line.nodes.length>=2&&line.nodes.length<=250&&
    line.nodes.every(p=>good(p)&&good(p.in)&&good(p.out));
}
export function cubicCollisionPoint(nodes,i,t){
  const a=nodes[i],b=nodes[i+1];if(!a||!b)throw Error('Segmento inexistente');
  const ab=mix(a,a.out,t),bc=mix(a.out,b.in,t),cd=mix(b.in,b,t);
  return mix(mix(ab,bc,t),mix(bc,cd,t),t);
}
export function insertCollisionNode(nodes,i,t){
  if(!nodes[i]||!nodes[i+1]||t<=0||t>=1)throw Error('Inserción fuera de tramo');
  const a=nodes[i],b=nodes[i+1],p0={x:a.x,y:a.y},p1=a.out,p2=b.in,p3={x:b.x,y:b.y};
  const q0=mix(p0,p1,t),q1=mix(p1,p2,t),q2=mix(p2,p3,t);
  const r0=mix(q0,q1,t),r1=mix(q1,q2,t),mid=mix(r0,r1,t);
  a.out=q0;b.in=q2;const node={...mid,in:r0,out:r1};nodes.splice(i+1,0,node);
  return node;
}
export function sampleCollisionLine(line,maxStep=18){
  if(!validCollisionLine(line))return [];
  const out=[{x:line.nodes[0].x,y:line.nodes[0].y}];
  for(let i=0;i<line.nodes.length-1;i++){
    const a=line.nodes[i],b=line.nodes[i+1];
    const chord=Math.hypot(b.x-a.x,b.y-a.y),controls=
      Math.hypot(a.out.x-a.x,a.out.y-a.y)+
      Math.hypot(b.in.x-a.out.x,b.in.y-a.out.y)+
      Math.hypot(b.x-b.in.x,b.y-b.in.y);
    const steps=Math.min(180,Math.max(2,Math.ceil(Math.max(chord,controls)/Math.max(6,maxStep))));
    for(let k=1;k<=steps;k++)out.push(cubicCollisionPoint(line.nodes,i,k/steps));
  }
  return out;
}
export function hitCollisionCurve(line,world,maxDistance=16){
  if(!validCollisionLine(line))return null;
  let found=null,best=maxDistance*maxDistance;
  for(let i=0;i<line.nodes.length-1;i++){
    const a=line.nodes[i],b=line.nodes[i+1],estimate=Math.hypot(b.x-a.x,b.y-a.y)+
      Math.hypot(a.out.x-a.x,a.out.y-a.y)+Math.hypot(b.in.x-b.x,b.in.y-b.y);
    const steps=Math.min(220,Math.max(10,Math.ceil(estimate/10)));
    let prev=cubicCollisionPoint(line.nodes,i,0);
    for(let j=1;j<=steps;j++){
      const end=cubicCollisionPoint(line.nodes,i,j/steps);
      const vx=end.x-prev.x,vy=end.y-prev.y,L=vx*vx+vy*vy;
      const u=L?Math.max(0,Math.min(1,((world.x-prev.x)*vx+(world.y-prev.y)*vy)/L)):0;
      const px=prev.x+vx*u,py=prev.y+vy*u,d2=(px-world.x)**2+(py-world.y)**2;
      if(d2<best){best=d2;found={segment:i,t:(j-1+u)/steps,distance:Math.sqrt(d2)};}
      prev=end;
    }
  }
  return found;
}

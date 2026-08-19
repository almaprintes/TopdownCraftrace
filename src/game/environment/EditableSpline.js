const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));

export function legacyQuadPoint(s,t){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0;
  const cx=finite(s?.cpx)?n(s.cpx):(x1+x2)/2,cy=finite(s?.cpy)?n(s.cpy):(y1+y2)/2,m=1-t;
  return{x:m*m*x1+2*m*t*cx+t*t*x2,y:m*m*y1+2*m*t*cy+t*t*y2};
}

export function pathPoints(s){
  const src=Array.isArray(s?.points)?s.points:[];
  const good=src.map(p=>({x:n(p?.x),y:n(p?.y)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(good.length>=2)return good;
  return [legacyQuadPoint(s,0),legacyQuadPoint(s,.25),legacyQuadPoint(s,.5),legacyQuadPoint(s,.75),legacyQuadPoint(s,1)];
}

function catmull(p0,p1,p2,p3,t){
  const t2=t*t,t3=t2*t;
  return{
    x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
  };
}
function catmullTangent(p0,p1,p2,p3,t){
  const t2=t*t;
  return{
    x:.5*((-p0.x+p2.x)+2*(2*p0.x-5*p1.x+4*p2.x-p3.x)*t+3*(-p0.x+3*p1.x-3*p2.x+p3.x)*t2),
    y:.5*((-p0.y+p2.y)+2*(2*p0.y-5*p1.y+4*p2.y-p3.y)*t+3*(-p0.y+3*p1.y-3*p2.y+p3.y)*t2)
  };
}

export function pathPoint(s,t){
  const pts=pathPoints(s),count=pts.length;
  if(count===2)return{x:pts[0].x+(pts[1].x-pts[0].x)*t,y:pts[0].y+(pts[1].y-pts[0].y)*t};
  const u=Math.max(0,Math.min(.999999,Number(t)||0))*(count-1),i=Math.min(count-2,Math.floor(u)),lt=u-i;
  const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(count-1,i+2)];
  return catmull(p0,p1,p2,p3,lt);
}

export function pathTangent(s,t){
  const pts=pathPoints(s),count=pts.length;
  if(count===2)return{x:pts[1].x-pts[0].x,y:pts[1].y-pts[0].y};
  const u=Math.max(0,Math.min(.999999,Number(t)||0))*(count-1),i=Math.min(count-2,Math.floor(u)),lt=u-i;
  const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(count-1,i+2)];
  const v=catmullTangent(p0,p1,p2,p3,lt);
  if(Math.hypot(v.x,v.y)<1e-5)return{x:p2.x-p1.x,y:p2.y-p1.y};
  return v;
}

export function normalizedPoints(s){
  const pts=pathPoints(s).map(p=>({...p}));
  if(pts.length===5)return pts;
  const sample=[0,.25,.5,.75,1].map(t=>pathPoint({...s,points:pts},t));
  return sample;
}

function pointAtTraceFraction(trace,f){
  const pts=(trace||[]).filter(p=>finite(p?.x)&&finite(p?.y)).map(p=>({x:n(p.x),y:n(p.y)}));
  if(pts.length<2)return null;
  const cum=[0];let total=0;
  for(let i=1;i<pts.length;i++){total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);cum.push(total);}
  const target=total*Math.max(0,Math.min(1,f));
  for(let i=1;i<pts.length;i++)if(cum[i]>=target){const d=cum[i]-cum[i-1]||1,u=(target-cum[i-1])/d;return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*u,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*u};}
  return {...pts[pts.length-1]};
}

export function fivePointsFromTrace(trace,start,end){
  const src=[...(trace||[])];
  if(start)src.unshift({x:n(start.x),y:n(start.y)});
  if(end)src.push({x:n(end.x),y:n(end.y)});
  const a=pointAtTraceFraction(src,0)||{x:n(start?.x)||0,y:n(start?.y)||0};
  const b=pointAtTraceFraction(src,.25)||a,c=pointAtTraceFraction(src,.5)||b,d=pointAtTraceFraction(src,.75)||c;
  const e=pointAtTraceFraction(src,1)||{x:n(end?.x)||a.x,y:n(end?.y)||a.y};
  return[a,b,c,d,e];
}

export function pathLength(s,steps=160){
  let a=pathPoint(s,0),total=0;
  for(let i=1;i<=steps;i++){const b=pathPoint(s,i/steps);total+=Math.hypot(b.x-a.x,b.y-a.y);a=b;}
  return total;
}

const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const hasPoints=s=>Array.isArray(s?.points)&&s.points.filter(p=>finite(p?.x)&&finite(p?.y)).length>=2;

export function legacyQuadPoint(s,t){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0;
  const cx=finite(s?.cpx)?n(s.cpx):(x1+x2)/2,cy=finite(s?.cpy)?n(s.cpy):(y1+y2)/2,m=1-t;
  return{x:m*m*x1+2*m*t*cx+t*t*x2,y:m*m*y1+2*m*t*cy+t*t*y2};
}
function legacyQuadTangent(s,t){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0;
  const cx=finite(s?.cpx)?n(s.cpx):(x1+x2)/2,cy=finite(s?.cpy)?n(s.cpy):(y1+y2)/2;
  return{x:2*(1-t)*(cx-x1)+2*t*(x2-cx),y:2*(1-t)*(cy-y1)+2*t*(y2-cy)};
}

export function pathPoints(s){
  const src=Array.isArray(s?.points)?s.points:[];
  const good=src.map(p=>({x:n(p?.x),y:n(p?.y)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(good.length>=2)return good;
  return [legacyQuadPoint(s,0),legacyQuadPoint(s,.25),legacyQuadPoint(s,.5),legacyQuadPoint(s,.75),legacyQuadPoint(s,1)];
}

const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const knot=(t,a,b)=>t+Math.max(1e-4,Math.pow((b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y),.25));
function timedLerp(a,b,ta,tb,t){
  const d=tb-ta;if(Math.abs(d)<1e-7)return {...a};
  return lerp(a,b,(t-ta)/d);
}
function centripetalSegment(p0,p1,p2,p3,u){
  const t0=0,t1=knot(t0,p0,p1),t2=knot(t1,p1,p2),t3=knot(t2,p2,p3),t=t1+(t2-t1)*u;
  const a1=timedLerp(p0,p1,t0,t1,t),a2=timedLerp(p1,p2,t1,t2,t),a3=timedLerp(p2,p3,t2,t3,t);
  const b1=timedLerp(a1,a2,t0,t2,t),b2=timedLerp(a2,a3,t1,t3,t);
  return timedLerp(b1,b2,t1,t2,t);
}
function virtualBefore(a,b){return{x:a.x-(b.x-a.x),y:a.y-(b.y-a.y)};}
function virtualAfter(a,b){return{x:b.x+(b.x-a.x),y:b.y+(b.y-a.y)};}

export function pathPoint(s,t){
  if(!hasPoints(s))return legacyQuadPoint(s,t);
  const pts=pathPoints(s),count=pts.length;
  if(count===2)return lerp(pts[0],pts[1],Math.max(0,Math.min(1,Number(t)||0)));
  const tt=Math.max(0,Math.min(1,Number(t)||0));
  if(tt>=1)return {...pts[count-1]};
  const u=tt*(count-1),i=Math.min(count-2,Math.floor(u)),lt=u-i;
  const p1=pts[i],p2=pts[i+1];
  const p0=i>0?pts[i-1]:virtualBefore(p1,p2);
  const p3=i+2<count?pts[i+2]:virtualAfter(p1,p2);
  return centripetalSegment(p0,p1,p2,p3,lt);
}

export function pathTangent(s,t){
  if(!hasPoints(s))return legacyQuadTangent(s,t);
  const tt=Math.max(0,Math.min(1,Number(t)||0)),eps=.0015;
  const a=pathPoint(s,Math.max(0,tt-eps)),b=pathPoint(s,Math.min(1,tt+eps));
  let v={x:b.x-a.x,y:b.y-a.y};
  if(Math.hypot(v.x,v.y)<1e-5){const pts=pathPoints(s);v={x:pts[pts.length-1].x-pts[0].x,y:pts[pts.length-1].y-pts[0].y};}
  return v;
}

export function normalizedPoints(s){
  if(!hasPoints(s))return [0,.25,.5,.75,1].map(t=>legacyQuadPoint(s,t));
  const pts=pathPoints(s).map(p=>({...p}));
  if(pts.length===5)return pts;
  return [0,.25,.5,.75,1].map(t=>pathPoint({...s,points:pts},t));
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

export function pathLength(s,steps=220){
  let a=pathPoint(s,0),total=0;
  for(let i=1;i<=steps;i++){const b=pathPoint(s,i/steps);total+=Math.hypot(b.x-a.x,b.y-a.y);a=b;}
  return total;
}

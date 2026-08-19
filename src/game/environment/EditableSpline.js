const n=v=>Number(v);
const finite=v=>Number.isFinite(n(v));
const hasPoints=s=>Array.isArray(s?.points)&&s.points.filter(p=>finite(p?.x)&&finite(p?.y)).length>=2;

function legacyControl(s){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0;
  return{x:finite(s?.cpx)?n(s.cpx):(x1+x2)/2,y:finite(s?.cpy)?n(s.cpy):(y1+y2)/2};
}
export function legacyQuadPoint(s,t){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0,c=legacyControl(s),m=1-t;
  return{x:m*m*x1+2*m*t*c.x+t*t*x2,y:m*m*y1+2*m*t*c.y+t*t*y2};
}
function legacyQuadTangent(s,t){
  const x1=n(s?.x1)||0,y1=n(s?.y1)||0,x2=n(s?.x2)||0,y2=n(s?.y2)||0,c=legacyControl(s);
  return{x:2*(1-t)*(c.x-x1)+2*t*(x2-c.x),y:2*(1-t)*(c.y-y1)+2*t*(y2-c.y)};
}

export function pathPoints(s){
  const src=Array.isArray(s?.points)?s.points:[];
  const good=src.map(p=>({x:n(p?.x),y:n(p?.y)})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(good.length>=2)return good;
  return normalizedPoints(s);
}

function quarticPoint(pts,t){
  const p=pts.length===5?pts:resampleFive(pts),m=1-t,m2=m*m,t2=t*t;
  const b0=m2*m2,b1=4*m2*m*t,b2=6*m2*t2,b3=4*m*t2*t,b4=t2*t2;
  return{x:p[0].x*b0+p[1].x*b1+p[2].x*b2+p[3].x*b3+p[4].x*b4,y:p[0].y*b0+p[1].y*b1+p[2].y*b2+p[3].y*b3+p[4].y*b4};
}
function quarticTangent(pts,t){
  const p=pts.length===5?pts:resampleFive(pts),m=1-t,m2=m*m,t2=t*t;
  const w0=4*m2*m,w1=12*m2*t,w2=12*m*t2,w3=4*t2*t;
  return{
    x:(p[1].x-p[0].x)*w0+(p[2].x-p[1].x)*w1+(p[3].x-p[2].x)*w2+(p[4].x-p[3].x)*w3,
    y:(p[1].y-p[0].y)*w0+(p[2].y-p[1].y)*w1+(p[3].y-p[2].y)*w2+(p[4].y-p[3].y)*w3
  };
}
function resampleFive(pts){
  if(pts.length===5)return pts.map(p=>({...p}));
  if(pts.length<2)return [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];
  const out=[];
  for(const f of [0,.25,.5,.75,1]){
    const u=f*(pts.length-1),i=Math.min(pts.length-2,Math.floor(u)),t=u-i,a=pts[i],b=pts[i+1];
    out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  }
  return out;
}

export function pathPoint(s,t){
  if(!hasPoints(s))return legacyQuadPoint(s,t);
  const pts=pathPoints(s),tt=Math.max(0,Math.min(1,Number(t)||0));
  if(pts.length===2)return{x:pts[0].x+(pts[1].x-pts[0].x)*tt,y:pts[0].y+(pts[1].y-pts[0].y)*tt};
  return quarticPoint(pts,tt);
}

export function pathTangent(s,t){
  if(!hasPoints(s))return legacyQuadTangent(s,t);
  const pts=pathPoints(s),tt=Math.max(0,Math.min(1,Number(t)||0));
  if(pts.length===2)return{x:pts[1].x-pts[0].x,y:pts[1].y-pts[0].y};
  let v=quarticTangent(pts,tt);
  if(Math.hypot(v.x,v.y)<1e-5){
    const eps=.0015,a=pathPoint(s,Math.max(0,tt-eps)),b=pathPoint(s,Math.min(1,tt+eps));v={x:b.x-a.x,y:b.y-a.y};
  }
  return v;
}

// Exact degree elevation: quadratic P0-C-P2 -> quartic P0-Q1-Q2-Q3-P2.
// This lets a legacy editable acquire three blue handles without changing its curve.
export function normalizedPoints(s){
  if(!hasPoints(s)){
    const p0={x:n(s?.x1)||0,y:n(s?.y1)||0},p4={x:n(s?.x2)||0,y:n(s?.y2)||0},c=legacyControl(s);
    return [
      p0,
      {x:.5*p0.x+.5*c.x,y:.5*p0.y+.5*c.y},
      {x:p0.x/6+2*c.x/3+p4.x/6,y:p0.y/6+2*c.y/3+p4.y/6},
      {x:.5*c.x+.5*p4.x,y:.5*c.y+.5*p4.y},
      p4
    ];
  }
  const pts=pathPoints(s).map(p=>({...p}));
  return pts.length===5?pts:resampleFive(pts);
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
function bernsteinInner(t){const m=1-t;return[4*m*m*m*t,6*m*m*t*t,4*m*t*t*t];}
function solve3(A,b){
  const m=A.map((r,i)=>[...r,b[i]]);
  for(let c=0;c<3;c++){
    let p=c;for(let r=c+1;r<3;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;
    if(Math.abs(m[p][c])<1e-8)return null;
    [m[c],m[p]]=[m[p],m[c]];
    const q=m[c][c];for(let j=c;j<4;j++)m[c][j]/=q;
    for(let r=0;r<3;r++)if(r!==c){const q2=m[r][c];for(let j=c;j<4;j++)m[r][j]-=q2*m[c][j];}
  }
  return[m[0][3],m[1][3],m[2][3]];
}

export function fivePointsFromTrace(trace,start,end){
  const src=[...(trace||[])];
  if(start)src.unshift({x:n(start.x),y:n(start.y)});
  if(end)src.push({x:n(end.x),y:n(end.y)});
  const p0=pointAtTraceFraction(src,0)||{x:n(start?.x)||0,y:n(start?.y)||0};
  const p4=pointAtTraceFraction(src,1)||{x:n(end?.x)||p0.x,y:n(end?.y)||p0.y};
  const ts=[.25,.5,.75],targets=ts.map(t=>pointAtTraceFraction(src,t));
  if(targets.some(p=>!p))return[p0,{x:p0.x+(p4.x-p0.x)*.25,y:p0.y+(p4.y-p0.y)*.25},{x:(p0.x+p4.x)/2,y:(p0.y+p4.y)/2},{x:p0.x+(p4.x-p0.x)*.75,y:p0.y+(p4.y-p0.y)*.75},p4];
  const A=ts.map(bernsteinInner);
  const rhs=(axis)=>targets.map((p,i)=>{const t=ts[i],m=1-t;return p[axis]-p0[axis]*m*m*m*m-p4[axis]*t*t*t*t;});
  const sx=solve3(A,rhs('x')),sy=solve3(A,rhs('y'));
  if(!sx||!sy)return[p0,targets[0],targets[1],targets[2],p4];
  return[p0,{x:sx[0],y:sy[0]},{x:sx[1],y:sy[1]},{x:sx[2],y:sy[2]},p4];
}

export function pathLength(s,steps=220){
  let a=pathPoint(s,0),total=0;
  for(let i=1;i<=steps;i++){const b=pathPoint(s,i/steps);total+=Math.hypot(b.x-a.x,b.y-a.y);a=b;}
  return total;
}

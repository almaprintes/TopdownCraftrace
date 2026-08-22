// src/game/ai/trackRacingLinePlanner.js
// Fase 1: modelo geométrico y trazada global derivada. No controla coches todavía.

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapAngle=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

function xy(raw){
  if(Array.isArray(raw))return{x:Number(raw[0]),y:Number(raw[1]),width:Number(raw[2])};
  return{x:Number(raw?.x),y:Number(raw?.y),width:Number(raw?.width??raw?.trackWidth)};
}

function sourceGeometry(track){
  const centerline=track?.raceCenterline||track?.centerline||track?.meta?.raceCenterline||track?.meta?.centerline||[];
  const fallbackWidth=Number(track?.trackWidth||track?.meta?.trackWidth||140);
  const points=centerline.map(xy).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(points.length>2){
    const first=points[0],last=points[points.length-1];
    if(Math.hypot(last.x-first.x,last.y-first.y)<.5)points.pop();
  }
  return{points,fallbackWidth:Number.isFinite(fallbackWidth)?fallbackWidth:140};
}

function resampleClosed(source,fallbackWidth,spacing){
  const n=source.length,cumulative=[0];
  let total=0;
  for(let i=0;i<n;i++){
    const a=source[i],b=source[(i+1)%n];
    total+=Math.hypot(b.x-a.x,b.y-a.y);
    cumulative.push(total);
  }
  if(total<50)return{points:[],total};

  const count=Math.max(48,Math.round(total/spacing));
  const points=[];
  let seg=0;
  for(let k=0;k<count;k++){
    const distance=k*total/count;
    while(seg<n-1&&cumulative[seg+1]<distance)seg++;
    const a=source[seg],b=source[(seg+1)%n];
    const span=Math.max(.001,cumulative[seg+1]-cumulative[seg]);
    const t=clamp((distance-cumulative[seg])/span,0,1);
    const aw=Number.isFinite(a.width)?a.width:fallbackWidth;
    const bw=Number.isFinite(b.width)?b.width:fallbackWidth;
    points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,width:aw+(bw-aw)*t});
  }
  return{points,total};
}

function frames(points){
  const n=points.length;
  return points.map((p,i)=>{
    const prev=points[(i-1+n)%n],next=points[(i+1)%n];
    const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.max(.001,Math.hypot(dx,dy));
    return{tx:dx/len,ty:dy/len,nx:-dy/len,ny:dx/len};
  });
}

function materialize(base,frame,offsets){
  return base.map((p,i)=>({x:p.x+frame[i].nx*offsets[i],y:p.y+frame[i].ny*offsets[i]}));
}

function curvature(points){
  const n=points.length;
  return points.map((p,i)=>{
    const prev=points[(i-1+n)%n],next=points[(i+1)%n];
    const a=Math.atan2(p.y-prev.y,p.x-prev.x);
    const b=Math.atan2(next.y-p.y,next.x-p.x);
    return wrapAngle(b-a);
  });
}

export function buildTrackRacingLineModel(track,options={}){
  const source=sourceGeometry(track);
  if(source.points.length<4)return{valid:false,reason:'centerline_too_short',centerline:[],racingLine:[],offsets:[],curvature:[],metrics:{}};

  const spacing=clamp(Number(options.spacing||source.fallbackWidth*.075),7,13);
  const sampled=resampleClosed(source.points,source.fallbackWidth,spacing);
  const base=sampled.points;
  if(base.length<4)return{valid:false,reason:'resample_failed',centerline:[],racingLine:[],offsets:[],curvature:[],metrics:{}};

  const frame=frames(base);
  const safetyMargin=Math.max(5,Number(options.safetyMargin||source.fallbackWidth*.075));
  const limits=base.map(p=>Math.max(3,Number(p.width||source.fallbackWidth)*.5-safetyMargin));
  let offsets=new Array(base.length).fill(0);

  // Elastic-band constrained optimizer. Pulling each point toward the chord of
  // its neighbours reduces global curvature while the Frenet bounds keep it on track.
  const iterations=clamp(Math.round(Number(options.iterations||110)),20,220);
  for(let pass=0;pass<iterations;pass++){
    const path=materialize(base,frame,offsets);
    const next=offsets.slice();
    for(let i=0;i<base.length;i++){
      const prev=path[(i-1+base.length)%base.length],cur=path[i],after=path[(i+1)%base.length];
      const chordX=(prev.x+after.x)*.5-cur.x;
      const chordY=(prev.y+after.y)*.5-cur.y;
      const bendCorrection=chordX*frame[i].nx+chordY*frame[i].ny;
      const neighbourOffset=(offsets[(i-1+base.length)%base.length]+offsets[(i+1)%base.length])*.5;
      const proposed=offsets[i]+bendCorrection*.24+(neighbourOffset-offsets[i])*.10;
      next[i]=clamp(proposed,-limits[i],limits[i]);
    }
    offsets=next;
  }

  // Suavizar el mando sin permitir que el filtrado atraviese los límites.
  for(let pass=0;pass<3;pass++){
    const copy=offsets.slice();
    for(let i=0;i<base.length;i++){
      const smoothed=(copy[(i-2+base.length)%base.length]+2*copy[(i-1+base.length)%base.length]+4*copy[i]+2*copy[(i+1)%base.length]+copy[(i+2)%base.length])/10;
      offsets[i]=clamp(smoothed,-limits[i],limits[i]);
    }
  }

  const racingLine=materialize(base,frame,offsets);
  const curve=curvature(racingLine);
  const clearances=limits.map((limit,i)=>limit-Math.abs(offsets[i])+safetyMargin);

  const finite=racingLine.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))&&offsets.every(Number.isFinite);
  return{
    valid:finite,
    reason:finite?null:'non_finite_geometry',
    spacing,
    lengthPx:sampled.total,
    centerline:base.map(p=>({x:p.x,y:p.y,width:p.width})),
    racingLine,
    offsets,
    curvature:curve,
    limits,
    metrics:{
      pointCount:base.length,
      sourcePointCount:source.points.length,
      meanAbsCurvature:curve.reduce((s,v)=>s+Math.abs(v),0)/curve.length,
      maxAbsCurvature:Math.max(...curve.map(Math.abs)),
      maxAbsOffset:Math.max(...offsets.map(Math.abs)),
      minBoundaryClearance:Math.min(...clearances),
      safetyMargin
    }
  };
}

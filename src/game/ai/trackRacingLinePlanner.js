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

function pointTurn(points,i){
  const n=points.length,p=points[(i-1+n)%n],c=points[i],q=points[(i+1)%n];
  return Math.abs(wrapAngle(Math.atan2(q.y-c.y,q.x-c.x)-Math.atan2(c.y-p.y,c.x-p.x)));
}

// Acondiciona solo la referencia derivada. Las cúspides de una polilínea escasa
// no son curvas conducibles: se reparten entre varias muestras con un movimiento
// acotado por la anchura local, sin modificar el JSON homologado del circuito.
function conditionReference(points,options={}){
  const original=points.map(p=>({...p}));
  let conditioned=points.map(p=>({...p}));
  const threshold=clamp(Number(options.discontinuityTurn||.62),.4,1.0);
  const sourceTurns=original.map((_,i)=>pointTurn(original,i));
  const discontinuityCount=sourceTurns.filter(v=>v>threshold).length;
  const passes=clamp(Math.round(Number(options.conditioningPasses||18)),4,32);

  for(let pass=0;pass<passes;pass++){
    const previous=conditioned.map(p=>({...p}));
    for(let i=0;i<conditioned.length;i++){
      const turn=pointTurn(previous,i);
      if(turn<=threshold*.72)continue;
      const prev=previous[(i-1+previous.length)%previous.length];
      const next=previous[(i+1)%previous.length];
      const targetX=(prev.x+next.x)*.5,targetY=(prev.y+next.y)*.5;
      const strength=clamp((turn-threshold*.55)/Math.max(.001,Math.PI-threshold*.55),.08,.32);
      let x=previous[i].x+(targetX-previous[i].x)*strength;
      let y=previous[i].y+(targetY-previous[i].y)*strength;
      const maxShift=Math.min(18,Math.max(3,Number(original[i].width||140)*.12));
      const dx=x-original[i].x,dy=y-original[i].y,d=Math.hypot(dx,dy);
      if(d>maxShift){x=original[i].x+dx*maxShift/d;y=original[i].y+dy*maxShift/d;}
      conditioned[i]={...previous[i],x,y};
    }
  }

  const shifts=conditioned.map((p,i)=>Math.hypot(p.x-original[i].x,p.y-original[i].y));
  return{
    points:conditioned,
    shifts,
    discontinuityCount,
    sourceMaxTurn:Math.max(...sourceTurns),
    maxShift:Math.max(...shifts)
  };
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
  const rawBase=sampled.points;
  if(rawBase.length<4)return{valid:false,reason:'resample_failed',centerline:[],racingLine:[],offsets:[],curvature:[],metrics:{}};

  const conditioning=conditionReference(rawBase,options);
  const base=conditioning.points;
  const frame=frames(base);
  const safetyMargin=Math.max(5,Number(options.safetyMargin||source.fallbackWidth*.075));
  // El desplazamiento de acondicionamiento se descuenta del corredor disponible:
  // la trazada optimizada conserva el margen respecto a la referencia homologada.
  const limits=base.map((p,i)=>Math.max(3,Number(p.width||source.fallbackWidth)*.5-safetyMargin-conditioning.shifts[i]));
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

  // Permite homologar una envolvente menos agresiva para un controlador
  // físico sin alterar el optimizador ni crear una trazada manual por circuito.
  const offsetScale=clamp(Number(options.offsetScale??1),.35,1);
  if(offsetScale!==1)offsets=offsets.map(v=>v*offsetScale);

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
      safetyMargin,
      discontinuityCount:conditioning.discontinuityCount,
      sourceMaxTurn:conditioning.sourceMaxTurn,
      referenceConditioningMaxShift:conditioning.maxShift,
      offsetScale
    }
  };
}

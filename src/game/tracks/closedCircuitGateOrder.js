// Ordered lap gates for authored CLOSED image-native circuits.
// Preserve the centerline, authored Bézier borders, scenery and gate locations.
// Normalize checkpoint crossing direction and CP1/CP2 order relative to META.

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const point=p=>({x:Number(p?.x),y:Number(p?.y)});
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const midpoint=g=>({x:(Number(g.a.x)+Number(g.b.x))*.5,y:(Number(g.a.y)+Number(g.b.y))*.5});
const valid=p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y));

export function loopPathMetrics(centerline){
  if(!Array.isArray(centerline)||centerline.length<3)throw Error('Circuito sin centerline cerrada');
  const pts=centerline.map(point);
  if(!pts.every(valid))throw Error('Centerline contiene coordenadas inválidas');
  if(length(pts[0],pts[pts.length-1])<1)pts.pop();
  if(pts.length<3)throw Error('Centerline sin segmentos');
  const cumulative=[0];let total=0;
  for(let i=0;i<pts.length;i++){
    total+=length(pts[i],pts[(i+1)%pts.length]);
    cumulative.push(total);
  }
  if(total<20)throw Error('Circuito degenerado');
  return {points:pts,cumulative,total};
}

export function sampleLoopAt(metrics,distance){
  const {points,cumulative,total}=metrics;
  let d=((distance%total)+total)%total;
  for(let i=0;i<points.length;i++){
    const len=cumulative[i+1]-cumulative[i];
    if(d>cumulative[i+1]&&i<points.length-1)continue;
    const a=points[i],b=points[(i+1)%points.length],t=clamp((d-cumulative[i])/Math.max(1e-6,len),0,1);
    const ux=(b.x-a.x)/Math.max(1e-6,len),uy=(b.y-a.y)/Math.max(1e-6,len);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
      tangent:{x:ux,y:uy},distance:d};
  }
  throw Error('Muestreo fallido');
}

// Prefer a real centerline/gate crossing; centerline projection is only an
// approximate diagnostic when an authored gate is too short or misplaced.
export function gateOnLoop(metrics,gate){
  if(!gate?.a||!gate?.b||!valid(gate.a)||!valid(gate.b))return null;
  const a=point(gate.a),b=point(gate.b),mid=midpoint(gate);
  const g={x:b.x-a.x,y:b.y-a.y},span=Math.hypot(g.x,g.y);
  if(span<1)return null;
  let bestHit=null,bestProjection=null;
  for(let i=0;i<metrics.points.length;i++){
    const p=metrics.points[i],q=metrics.points[(i+1)%metrics.points.length];
    const d={x:q.x-p.x,y:q.y-p.y},len=Math.hypot(d.x,d.y);
    if(len<1e-6)continue;
    const aToP={x:a.x-p.x,y:a.y-p.y};
    const denom=cross(d,g);
    if(Math.abs(denom)>1e-9){
      const t=cross(aToP,g)/denom;
      const u=cross(aToP,d)/denom;
      if(t>=-1e-6&&t<=1+1e-6&&u>=-1e-6&&u<=1+1e-6){
        const position={x:p.x+clamp(t,0,1)*d.x,y:p.y+clamp(t,0,1)*d.y};
        const offset=length(position,mid);
        if(!bestHit||offset<bestHit.offset){
          bestHit={hit:true,offset,routeDistance:metrics.cumulative[i]+clamp(t,0,1)*len,
            tangent:{x:d.x/len,y:d.y/len},position};
        }
      }
    }
    const t=clamp(((mid.x-p.x)*d.x+(mid.y-p.y)*d.y)/(len*len),0,1);
    const position={x:p.x+t*d.x,y:p.y+t*d.y},offset=length(position,mid);
    if(!bestProjection||offset<bestProjection.offset)bestProjection={
      hit:false,offset,routeDistance:metrics.cumulative[i]+t*len,
      tangent:{x:d.x/len,y:d.y/len},position
    };
  }
  return bestHit||bestProjection;
}

export function orderClosedCircuitGates(centerline,finishLine,checkpoints,{
  shape=null,expandGate=null,baseWidth=100
}={}){
  const metrics=loopPathMetrics(centerline);
  if(!finishLine?.a||!finishLine?.b)throw Error('Circuito sin META');
  const finishMetric=gateOnLoop(metrics,finishLine);
  if(!finishMetric||finishMetric.offset>Math.max(40,baseWidth*.8))
    throw Error('META lejos de la carretera');
  const finish={...finishLine,normal:{...finishMetric.tangent}};
  const byDistance=gate=>{
    const x=gateOnLoop(metrics,gate);
    return x?{gate,metric:x,relative:(x.routeDistance-finishMetric.routeDistance+metrics.total)%metrics.total}:null;
  };
  const makeFallback=fraction=>{
    const s=sampleLoopAt(metrics,finishMetric.routeDistance+metrics.total*fraction);
    const normal=s.tangent,half=Math.max(38,baseWidth*.85);
    const px=-normal.y,py=normal.x;
    return {a:{x:s.x-px*half,y:s.y-py*half},b:{x:s.x+px*half,y:s.y+py*half},normal};
  };
  let entries=(checkpoints||[]).map(gate=>{
    let widened=gate;
    if(typeof expandGate==='function'&&shape){
      try{widened=expandGate(gate,shape);}catch{ /* invalid authored gate repaired below */ }
    }
    return byDistance(widened);
  });
  entries=entries.filter(Boolean).sort((a,b)=>a.relative-b.relative);
  const plausible=entries.length===2&&entries.every(x=>x.metric.hit)&&
    entries[0].relative>metrics.total*.055&&
    entries[1].relative<metrics.total*.945&&
    entries[1].relative-entries[0].relative>metrics.total*.10;
  // Invalid/unreachable gates must not silently produce five uncounted laps.
  // Recreate ONLY the two gameplay CP segments, never editor geometry.
  if(!plausible)entries=[byDistance(makeFallback(1/3)),byDistance(makeFallback(2/3))];
  const normalized=entries.map((entry,i)=>{
    const gate=entry.gate;
    const tangent=entry.metric.tangent;
    const finalGate={...gate,normal:{...tangent}};
    const m=gateOnLoop(metrics,finalGate);
    if(!m?.hit)throw Error('CP'+(i+1)+' no cruza la trayectoria');
    return finalGate;
  });
  return {
    finish,checkpoints:normalized,
    diagnostics:{
      totalPx:metrics.total,
      finishDistancePx:finishMetric.routeDistance,
      checkpointFractions:entries.map(x=>Number((x.relative/metrics.total).toFixed(4))),
      authoredPreserved:plausible,
      crossed:entries.map(x=>x.metric.hit)
    }
  };
}

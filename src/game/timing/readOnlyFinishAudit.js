// Diagnóstico NO AUTORITATIVO: nunca sustituye lapMs, récords ni telemetría online.
// Se usa solo para comparar el momento de detección con la intersección geométrica.
export function crossingFraction(gate,from,to){
 if(!gate?.a||!gate?.b||!from||!to)return null;
 const pts=[gate.a,gate.b,from,to];
 if(!pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 const r={x:to.x-from.x,y:to.y-from.y};
 const s={x:gate.b.x-gate.a.x,y:gate.b.y-gate.a.y};
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const denom=cross(r,s);
 if(Math.abs(denom)<1e-9)return null;
 const q={x:gate.a.x-from.x,y:gate.a.y-from.y};
 const t=cross(q,s)/denom,u=cross(q,r)/denom;
 if(t<0||t>1||u<0||u>1)return null;
 if(gate.normal&&Number.isFinite(gate.normal.x)&&Number.isFinite(gate.normal.y)
  &&r.x*gate.normal.x+r.y*gate.normal.y<=0)return null;
 return t;
}
export function auditDirectedFinishTime({gate,from,to,nowMs,lapStartMs,frameDeltaMs,simulatedDeltaMs}){
 const fraction=crossingFraction(gate,from,to);
 if(fraction===null)return {measurable:false,reason:"no-geometric-intersection"};
 const numbers=[nowMs,lapStartMs,frameDeltaMs,simulatedDeltaMs];
 if(!numbers.every(Number.isFinite)||frameDeltaMs<=0||simulatedDeltaMs<0)
  return {measurable:false,reason:"missing-frame-time",fraction};
 const wallPhysicsGapMs=Math.max(0,frameDeltaMs-simulatedDeltaMs);
 // La física actual limita update a 50 ms. No inferir una milésima fiable
 // dentro de un fotograma cuya duración real difiere del paso simulado.
 const comparable=wallPhysicsGapMs<=0.5;
 const observedLapMs=Math.max(0,nowMs-lapStartMs);
 const correctionMs=comparable?(1-fraction)*frameDeltaMs:null;
 const candidateLapMs=comparable?Math.max(0,observedLapMs-correctionMs):null;
 return {measurable:true,reviewRequired:!comparable,
  reason:comparable?"comparable":"physics-wall-divergence",
  fraction,frameDeltaMs,simulatedDeltaMs,wallPhysicsGapMs,
  observedLapMs,candidateLapMs,correctionMs};
}

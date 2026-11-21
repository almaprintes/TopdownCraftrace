// Read-only LIVE 4 line-follow audit. Compare the planned and real lateral
// positions AT THE SAME POINT along the reference centerline.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function summarizePlannedLateral(line){
 const offsets=line?.offsets,limits=line?.limits;
 if(!Array.isArray(offsets)||!Array.isArray(limits)||offsets.length===0||
   offsets.length!==limits.length)return null;
 const vals=offsets.map((v,i)=>Math.abs(v)/Math.max(1,Number(limits[i])||1));
 return {samples:vals.length,meanPct:Math.round(
  100*vals.reduce((a,b)=>a+b,0)/vals.length),
  maxPct:Math.round(100*Math.max(...vals)),
  nearEdgePct:Math.round(100*vals.filter(v=>v>=.70).length/vals.length)};
}
export function samplePlannedVsReal(line,measurement){
 if(!measurement||!Number.isInteger(measurement.index)||
   !Number.isFinite(measurement.fraction))return null;
 const offsets=line?.offsets,limits=line?.limits,n=offsets?.length;
 if(!Array.isArray(offsets)||!Array.isArray(limits)||n<4||n!==limits.length)return null;
 const i=((measurement.index%n)+n)%n,j=(i+1)%n;
 const t=clamp(Number(measurement.segmentT)||0,0,1);
 const limit=Math.max(1,limits[i]*(1-t)+limits[j]*t);
 const signedTarget=(offsets[i]*(1-t)+offsets[j]*t)/limit;
 const signedActual=measurement.fraction;
 if(!Number.isFinite(signedTarget))return null;
 return {targetFraction:signedTarget,actualFraction:signedActual,
  errorFraction:Math.abs(signedActual-signedTarget)};
}

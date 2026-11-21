// DEV Realizador G only. A die is a driving objective, not permission to teleport.
// Distances use the physical car centre in world pixels.
export const GUIDED_DIE_TOLERANCE_PX=Object.freeze([0,35,35,20,20,5,5]);
export function rollGuidedDie(rng=Math.random){
 const v=Math.max(0,Math.min(.999999999999,Number(rng())||0));
 const face=1+Math.floor(v*6);
 return {face,tolerancePx:GUIDED_DIE_TOLERANCE_PX[face]};
}
export function nextGuidedApex(guides,nearest,n,maxSteps=22){
 if(!Array.isArray(guides)||!n)return null;
 let best=null,steps=maxSteps+1;
 for(const guide of guides){
  if(!Number.isInteger(guide.index))continue;
  const ahead=((guide.index-nearest)%n+n)%n;
  if(ahead<=maxSteps&&ahead<steps){best=guide;steps=ahead;}
 }
 return best?{...best,stepsAhead:steps}:null;
}
export function physicalPointSegmentDistance(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
 const t=len2>1e-9?Math.max(0,Math.min(1,
  ((p.x-a.x)*dx+(p.y-a.y)*dy)/len2)):0;
 return Math.hypot(p.x-(a.x+dx*t),p.y-(a.y+dy*t));
}
export function measureGuidedPass(bot,guides,from,to,nearestIndex,n){
 if(!Array.isArray(guides)||!n)return;
 bot._guidedNearestPx??={};
 for(const g of guides){
  const d=Math.abs(g.index-nearestIndex);
  if(Math.min(d,n-d)>24)continue; // exclude close-by but unrelated hairpins
  const gap=physicalPointSegmentDistance(g,from,to);
  bot._guidedNearestPx[g.id]=Math.min(bot._guidedNearestPx[g.id]??Infinity,gap);
 }
}
export function closeGuidedLap(bot,guides){
 const distances=bot._guidedNearestPx||{};
 const checks=guides.map(g=>({id:g.id,closestPx:
  Number.isFinite(distances[g.id])?Math.round(distances[g.id]*10)/10:null,
  hit:Number.isFinite(distances[g.id])&&distances[g.id]<=bot.guidedTolerancePx}));
 const summary={lap:bot.completedLaps,die:bot.guidedRoll,
  tolerancePx:bot.guidedTolerancePx,checked:checks.filter(x=>x.closestPx!==null).length,
  hits:checks.filter(x=>x.hit).length,total:guides.length,checks};
 (bot.guidedLapHistory??=[]).push(summary);
 bot._guidedNearestPx={};
 return summary;
}

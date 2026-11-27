// Read-only HUD geometry. Does not change the physical lap gates or AI.
import {loopPathMetrics,gateOnLoop} from '../tracks/closedCircuitGateOrder.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const relative=(n,total)=>((n%total)+total)%total;
export function makeOfflineStandingsRoute(centerline,lapGates,gridBackDistance=0){
  const metrics=loopPathMetrics(centerline),{total}=metrics;
  const start=lapGates.finishRouteDistance;
  const cp=lapGates.gates.slice(0,2).map(g=>gateOnLoop(metrics,g)).map((g,i)=>g?relative(g.routeDistance-start,total):total*(i+1)/3);
  return {metrics,start,limits:[0,...cp,total],gridBackDistance:Math.max(0,Number(gridBackDistance)||0)};
}
export function offlineRouteProgress(route,{x,y,laps=0,phase=0}){
  if(!Number.isFinite(x)||!Number.isFinite(y))return laps*route.metrics.total;
  const {metrics:m,start,limits}=route,p=clamp(Math.floor(phase)||0,0,2);
  const tolerance=m.total*.035;
  const behind=p===0&&laps===0?Math.max(tolerance,route.gridBackDistance+tolerance):tolerance;
  let nearest=Infinity,best=limits[p];
  for(let i=0;i<m.points.length;i++){
    const a=m.points[i],b=m.points[(i+1)%m.points.length];
    const dx=b.x-a.x,dy=b.y-a.y,len=m.cumulative[i+1]-m.cumulative[i];
    if(len<1e-6)continue;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(len*len),0,1);
    let d=relative(m.cumulative[i]+t*len-start,m.total);
    if(p===0&&d>m.total-behind)d-=m.total;
    if(p===2&&d<tolerance)d+=m.total;
    if(d<limits[p]-(p===0?behind:tolerance)||d>limits[p+1]+tolerance)continue;
    const dist=(x-a.x-dx*t)**2+(y-a.y-dy*t)**2;
    if(dist<nearest){nearest=dist;best=d;}
  }
  // First grid slots can be behind META. Do not interpret them as a full lap.
  return laps*m.total+clamp(best,p===0?-behind:limits[p],limits[p+1]);
}
export function rankOfflineLive(rows){
  return [...rows].sort((a,b)=>{
    const af=Number.isFinite(a.elapsedMs),bf=Number.isFinite(b.elapsedMs);
    if(af&&bf)return a.elapsedMs-b.elapsedMs||a.seat-b.seat;
    if(af!==bf)return af?-1:1;
    return b.progress-a.progress||a.seat-b.seat;
  });
}
// Actual measured difference at the last lap both drivers completed.
// Never use instantaneous distance/speed to invent a time gap.
export function offlineCommonLapGap(row,leader){
  const lap=Math.min(row.lapTimes.length,leader.lapTimes.length);
  if(!lap)return null;
  const sum=r=>r.lapTimes.slice(0,lap).reduce((a,b)=>a+b,0);
  return {lap,ms:sum(row)-sum(leader)};
}
export function offlineFastestLap(rows){
  let best=null;
  for(const row of rows)for(const [i,ms] of row.lapTimes.entries()){
    if(Number.isFinite(ms)&&ms>0&&(!best||ms<best.ms))best={seat:row.seat,lap:i+1,ms};
  }
  return best;
}

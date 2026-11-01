// Opt-in iPhone DEV timings only; no new RAF, GPU polling or retained frame log.
// Measures elapsed time from previous POST_RENDER to next PRE_STEP (inter-cycle)
// and the subsequent PRE_STEP to POST_RENDER (inside Phaser's cycle).
// Neither interval is GPU time, screen presentation time or proof of idle CPU.
const MAX_BUCKET=250;
const newBins=()=>new Uint32Array(MAX_BUCKET+1);
export const createIosFramePhaseStats=()=>({
  count:0,interSum:0,interMax:0,cycleSum:0,cycleMax:0,
  interBins:newBins(),cycleBins:newBins(),
  over33Inter:0,over33Cycle:0,over33Mixed:0,
  spikes:[]
});
const addBin=(bins,ms)=>{bins[Math.min(MAX_BUCKET,Math.floor(ms))]++;};
const quantile=(bins,count,p)=>{
  if(!count)return null;
  const target=Math.max(1,Math.ceil(count*p));
  let total=0;
  for(let i=0;i<bins.length;i++){total+=bins[i];if(total>=target)return i;}
  return MAX_BUCKET;
};
export function recordIosFramePhase(stats,previousPost,preStep,postRender){
  if(!stats||!Number.isFinite(previousPost)||!Number.isFinite(preStep)||
     !Number.isFinite(postRender)||previousPost<=0||preStep<previousPost||postRender<preStep)return false;
  const between=preStep-previousPost,cycle=postRender-preStep,total=postRender-previousPost;
  if(!(total>0&&total<1500))return false;
  stats.count++;
  stats.interSum+=between;stats.interMax=Math.max(stats.interMax,between);
  stats.cycleSum+=cycle;stats.cycleMax=Math.max(stats.cycleMax,cycle);
  addBin(stats.interBins,between);addBin(stats.cycleBins,cycle);
  if(total>33.4){
    if(between/total>=.66)stats.over33Inter++;
    else if(cycle/total>=.66)stats.over33Cycle++;
    else stats.over33Mixed++;
  }
  if(total>50){
    const item={total,between,cycle};
    const top=stats.spikes;
    if(top.length<4||total>top[top.length-1].total){
      top.push(item);
      top.sort((a,b)=>b.total-a.total);
      if(top.length>4)top.pop();
    }
  }
  return true;
}
const fmt=n=>n.toFixed(1);
export function formatIosFramePhaseStats(stats){
  if(!stats?.count)return 'FASES CICLO: SIN MUESTRAS EMPAREJADAS';
  const avg=(v)=>fmt(v/stats.count);
  const pct=(bins,p)=>quantile(bins,stats.count,p);
  const peaks=stats.spikes.length?stats.spikes.map(x=>[x.total,x.between,x.cycle].map(fmt).join('/')).join(' | '):'NINGUNO >50ms';
  return [
    'FASES CICLO '+stats.count+' muestras (PRE_STEP → POST_RENDER)',
    'ENTRE CICLOS '+avg(stats.interSum)+' ms media · P95/P99 '+pct(stats.interBins,.95)+'/'+pct(stats.interBins,.99)+' ms · pico '+fmt(stats.interMax)+' ms',
    'DENTRO CICLO '+avg(stats.cycleSum)+' ms media · P95/P99 '+pct(stats.cycleBins,.95)+'/'+pct(stats.cycleBins,.99)+' ms · pico '+fmt(stats.cycleMax)+' ms',
    '>33ms DESGLOSE entre/dentro/mixto '+stats.over33Inter+'/'+stats.over33Cycle+'/'+stats.over33Mixed,
    'PICOS (total/entre/dentro ms) '+peaks,
    'ENTRE CICLOS incluye espera, eventos y otras tareas del navegador; DENTRO CICLO incluye trabajo y posibles bloqueos de Phaser',
    'NO mide GPU, compositor, energía, fotogramas presentados ni causa de un tirón'
  ].join('\n');
}

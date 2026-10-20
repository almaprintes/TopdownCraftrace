// Small fixed histogram: no unbounded frame arrays or sorting while driving.
// Percentiles are approximated to 1 ms; the final bucket groups frames >=250 ms.
const MAX_BIN_MS=250;
export function createFramePacingStats(){
  return {bins:new Uint32Array(MAX_BIN_MS+1),samples:0,
    over50Runs:0,currentOver50:0,longestOver50:0,
    currentOver33:0,longestOver33:0};
}
export function recordFramePacing(stats,frameMs){
  if(!stats||!Number.isFinite(frameMs)||frameMs<=0||frameMs>=1500)return;
  const bin=Math.min(MAX_BIN_MS,Math.floor(frameMs));
  stats.bins[bin]++;
  stats.samples++;
  if(frameMs>33.4){
    stats.currentOver33++;
    stats.longestOver33=Math.max(stats.longestOver33,stats.currentOver33);
  }else stats.currentOver33=0;
  if(frameMs>50){
    if(stats.currentOver50===0)stats.over50Runs++;
    stats.currentOver50++;
    stats.longestOver50=Math.max(stats.longestOver50,stats.currentOver50);
  }else stats.currentOver50=0;
}
export function percentileFramePacing(stats,p){
  if(!stats?.samples)return null;
  const quantile=Number.isFinite(p)?Math.max(0,Math.min(1,p)):0.5;
  const target=Math.max(1,Math.ceil(stats.samples*quantile));
  let total=0;
  for(let i=0;i<stats.bins.length;i++){
    total+=stats.bins[i];
    if(total>=target)return i;
  }
  return MAX_BIN_MS;
}

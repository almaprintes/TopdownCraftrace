// Pure, DEV-only Realizador results model. Source of truth: actual gate-crossing
// lapTimes from CrafRaceLive4BotDirector, not trajectory projections.
export const fmtDirectorTime=ms=>{
 if(!Number.isFinite(ms)||ms<0)return '—';
 const whole=Math.round(ms);
 return Math.floor(whole/60000)+':'+String(Math.floor(whole%60000/1000)).padStart(2,'0')+'.'+String(whole%1000).padStart(3,'0');
};
export function buildDirectorLapReport(results,requestedLaps){
 const laps=Number.isInteger(requestedLaps)&&requestedLaps>=1&&requestedLaps<=30
   ?requestedLaps:0;
 const rows=(Array.isArray(results)?results:[]).map(item=>{
  const raw=Array.isArray(item?.lapTimes)?item.lapTimes:[];
  const lapTimes=Array.from({length:laps},(_,i)=>
    Number.isFinite(raw[i])&&raw[i]>0?raw[i]:null);
  const complete=lapTimes.every(ms=>ms!==null)&&lapTimes.length===laps;
  const totalMs=complete?lapTimes.reduce((sum,ms)=>sum+ms,0):null;
  const validLaps=lapTimes.filter(ms=>ms!==null);
  return{seat:item.seat,lapTimes,totalMs,
   bestLapMs:validLaps.length?Math.min(...validLaps):null};
 }).sort((a,b)=>(a.totalMs??Infinity)-(b.totalMs??Infinity)||(a.seat-b.seat));
 return{laps,rows,fastestLapMs:rows.reduce((best,row)=>
   row.bestLapMs===null?best:Math.min(best,row.bestLapMs),Infinity)};
}

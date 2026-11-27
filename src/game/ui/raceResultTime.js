// Display only: preserve the measured millisecond values and race order.
export function formatRaceResultTime(ms){
 if(!Number.isFinite(ms)||ms<0)return '—';
 const n=Math.round(ms);
 return Math.floor(n/60000)+':'+String(Math.floor(n%60000/1000)).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0');
}
export function formatRaceResultGap(ms){
 if(!Number.isFinite(ms))return '—';
 const n=Math.round(Math.abs(ms)),sign=ms<0?'−':'+';
 return sign+(n>=60000?formatRaceResultTime(n):(n/1000).toFixed(3)+' s');
}

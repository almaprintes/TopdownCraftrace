// DEV-only, post-race audit of the invisible automatic Bezier G die.
// Numbers describe the maximum PLANNED trackline variation; they do NOT
// certify physical car accuracy or assign Elo to any driver.
export function buildDirectorDieAudit(results,requestedLaps){
 const laps=Number.isInteger(requestedLaps)&&requestedLaps>=1&&requestedLaps<=30
   ?requestedLaps:0;
 const rows=(Array.isArray(results)?results:[]).map(p=>{
  const entries=Array.isArray(p?.bezierDieHistory)?p.bezierDieHistory:[];
  const byLap=new Map(entries.filter(e=>Number.isInteger(e?.lap)&&e.lap>=1&&
    e.lap<=laps&&Number.isInteger(e?.face)&&e.face>=1&&e.face<=6)
    .map(e=>[e.lap,e]));
  return{seat:p.seat,rolls:Array.from({length:laps},(_,i)=>{
   const e=byLap.get(i+1);
   return e?{face:e.face,plannedVariationPx:Number.isFinite(e.plannedVariationPx)
    ?Math.max(0,e.plannedVariationPx):0}:null;
  })};
 }).sort((a,b)=>(a.seat-b.seat));
 return{laps,rows,complete:rows.length===4&&rows.every(r=>r.rolls.every(Boolean))};
}

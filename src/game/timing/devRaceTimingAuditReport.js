// Exclusivo de diagnóstico: el informe no escribe marcas, fantasmas ni BD.
// La fuente es RaceScene._tdrGateTimingAudit (últimos cruces locales).
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const millis=n=>finite(n)?n.toFixed(3)+' ms':'—';
export function formatDevRaceTimingAudit(samples,{track='desconocido'}={}){
 const rows=Array.isArray(samples)?samples.slice(-30).filter(v=>v&&typeof v==='object'):[];
 const comparable=rows.filter(v=>v.reviewRequired===false&&finite(v.differenceMs));
 const review=rows.filter(v=>v.reviewRequired===true);
 const maxError=comparable.length?Math.max(...comparable.map(v=>Math.abs(v.differenceMs))):null;
 const output=[
  'CRAFT RACE · AUDITORÍA TEMPORAL DEV (NO OFICIAL)',
  'Circuito: '+String(track).slice(0,100),
  'Cruces conservados: '+rows.length+' | Comparables: '+comparable.length+' | Revisar: '+review.length,
  'Diferencia máxima cruce/frame (comparable): '+millis(maxError),
  'Esta comparación NO confirma la exactitud del cronómetro ni homologa récords.',
  'La cuenta de FPS puede invalidar la inferencia cuando la física pierde tiempo.',
  ''
 ];
 for(const [index,row] of rows.entries()){
  const number=finite(row.lapIndex)?row.lapIndex:index+1;
  const tag=row.reviewRequired?'REVISAR FPS':finite(row.differenceMs)?'COMPARABLE':'SIN CRUCE MEDIBLE';
  const clock=millis(row.observedLapMs);
  const candidate=millis(row.elapsedMs);
  const correction=millis(row.differenceMs);
  const loss=millis(row.lostPhysicsMs);
  output.push('V'+number+' · '+tag+' | guardado '+clock+
   ' | estimado '+candidate+' | diferencia '+correction+' | física perdida '+loss);
 }
 if(!rows.length)output.push('Todavía no hay cruces por meta en esta sesión.');
 return output.join('\n');
}

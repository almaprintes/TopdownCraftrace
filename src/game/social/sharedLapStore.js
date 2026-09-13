const PREFIX='tdr2:sharedLap:v1:';
const INDEX='tdr2:sharedLapIndex:v1';
const text=v=>String(v??'').trim();

export function validateSharedLap(pkg){
  if(!pkg||pkg.format!=='TDRLAP'||Number(pkg.version)!==1)throw new Error('Archivo de vuelta no compatible.');
  if(!text(pkg?.pilot?.name)||!text(pkg?.pilot?.id))throw new Error('Falta la identidad del piloto.');
  if(!text(pkg.trackId)||!text(pkg.carId)||Number(pkg.lapMs)<=0)throw new Error('Datos de vuelta incompletos.');
  if(!Array.isArray(pkg?.replay?.samples)||pkg.replay.samples.length<5)throw new Error('La repetición está vacía.');
  return pkg;
}

export function saveSharedLap(pkg){
  validateSharedLap(pkg);
  const id=`${pkg.pilot.id}:${pkg.trackId}:${Math.round(Number(pkg.lapMs))}:${Number(pkg.recordedAt)||0}`;
  const key=`${PREFIX}${encodeURIComponent(id)}`;
  const stored={...pkg,importedAt:Date.now(),storageKey:key};
  localStorage.setItem(key,JSON.stringify(stored));
  let index=[];try{index=JSON.parse(localStorage.getItem(INDEX)||'[]');}catch{}
  if(!Array.isArray(index))index=[];
  index=[key,...index.filter(item=>item!==key)].slice(0,200);
  localStorage.setItem(INDEX,JSON.stringify(index));
  return stored;
}

export function loadSharedLaps(trackId=''){
  let index=[];try{index=JSON.parse(localStorage.getItem(INDEX)||'[]');}catch{}
  if(!Array.isArray(index))index=[];
  const wanted=text(trackId),out=[];
  for(const key of index){try{const row=JSON.parse(localStorage.getItem(key)||'null');validateSharedLap(row);if(!wanted||text(row.trackId)===wanted)out.push(row);}catch{}}
  return out.sort((a,b)=>Number(a.lapMs)-Number(b.lapMs));
}

const KEY='tdr2:seasonTelemetry:v1';
const DEFAULT={garageVisits:0,storeBuys:0,modeStarts:0,modes:[]};

export function loadSeasonTelemetry(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
    return {...DEFAULT,...raw,modes:Array.isArray(raw.modes)?raw.modes:[]};
  }catch{return {...DEFAULT};}
}

function save(next){
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

export function recordGarageVisit(){
  const s=loadSeasonTelemetry();
  s.garageVisits=Math.max(0,Number(s.garageVisits)||0)+1;
  return save(s);
}

export function recordStoreBuy(){
  const s=loadSeasonTelemetry();
  s.storeBuys=Math.max(0,Number(s.storeBuys)||0)+1;
  return save(s);
}

export function recordModeStart(mode){
  const s=loadSeasonTelemetry();
  s.modeStarts=Math.max(0,Number(s.modeStarts)||0)+1;
  const id=String(mode||'').trim();
  if(id&&!s.modes.includes(id))s.modes.push(id);
  return save(s);
}

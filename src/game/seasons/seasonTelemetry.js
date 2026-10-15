const KEY='tdr2:seasonTelemetry:v1';
const DEFAULT={garageVisits:0,storeBuys:0,modeStarts:0,modes:[],modeCounts:{},recyclerOperations:0,onlinePublishedCuper:0};

export function loadSeasonTelemetry(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
    return {...DEFAULT,...raw,modes:Array.isArray(raw.modes)?raw.modes:[],modeCounts:raw.modeCounts&&typeof raw.modeCounts==='object'?raw.modeCounts:{}};
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
  if(id)s.modeCounts[id]=Math.max(0,Number(s.modeCounts[id])||0)+1;
  return save(s);
}

export function recordRecyclerOperation(){const s=loadSeasonTelemetry();s.recyclerOperations=Math.max(0,Number(s.recyclerOperations)||0)+1;return save(s);}
export function recordOnlineCuperPublish(){const s=loadSeasonTelemetry();s.onlinePublishedCuper=Math.max(0,Number(s.onlinePublishedCuper)||0)+1;return save(s);}

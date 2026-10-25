// One lap = one recording. No UI or rewarded flow may silently fall back to
// a different circuit, car, lap time or (when present) recorded timestamp.
const isText=x=>typeof x==='string'&&x.trim().length>0;
const positive=x=>{const n=Number(x);return Number.isFinite(n)&&n>1000?n:null;};
const epoch=x=>{const n=Number(x);return Number.isFinite(n)&&n>1_600_000_000_000?n:null;};
const sameTime=(a,b)=>positive(a)!=null&&positive(b)!=null&&
  Math.abs(Number(a)-Number(b))<=2;

export function matchesExactLocalReplay(ghost,expected){
  if(!ghost||!expected||!isText(expected.trackId)||
     String(ghost.trackKey||ghost.trackId||'')!==String(expected.trackId))return false;
  if(!sameTime(ghost.lapMs,expected.lapMs))return false;
  if(!Array.isArray(ghost.samples)||ghost.samples.length<5)return false;
  // If the record has a known car, a recording without car identity cannot be
  // confidently attributed to it. Never play a different car at the same time.
  const car=String(expected.carId||'').trim();
  if(car&&String(ghost.carId||'').trim()!==car)return false;
  const t=epoch(expected.recordedAt),g=epoch(ghost.recordedAt);
  if(t!=null&&g!=null&&Math.abs(t-g)>10000)return false;
  return true;
}
function storedReplay(storage,key){
  if(!isText(key))return null;
  try{
    const ghost=JSON.parse(storage?.getItem?.(key)||'null');
    return ghost&&typeof ghost==='object'?ghost:null;
  }catch{return null;}
}
function getStorage(storage){try{return storage===undefined?localStorage:storage;}catch{return null;}}
function collectUnique(keys){return [...new Set(keys.filter(isText))];}

// Return data ONLY when its payload proves this exact best, not just a key.
export function findExactLocalPbReplay(record,storage){
  if(!record||!isText(record.trackId)||positive(record.bestLapMs)==null)return null;
  const local=getStorage(storage),id=String(record.trackId);
  const expected={trackId:id,carId:record.bestCarId,lapMs:record.bestLapMs,
    recordedAt:record.recordedAt};
  const nearby=(record.topLaps||[]).filter(lap=>sameTime(lap?.lapMs,record.bestLapMs)&&
    (!record.bestCarId||!lap?.carId||String(lap.carId)===String(record.bestCarId)));
  const keys=collectUnique([record.ghostKey,
    ...nearby.map(lap=>lap?.replayKey),
    record.bestCarId?`tdr2:ghost:${id}:${record.bestCarId}`:null]);
  for(const key of keys){
    const ghost=storedReplay(local,key);
    if(matchesExactLocalReplay(ghost,expected))return {key,ghost};
  }
  return null;
}
export function findExactLocalLapReplay(record,lap,storage){
  if(!record||!lap||!isText(record.trackId)||positive(lap.lapMs)==null)return null;
  const isPb=sameTime(lap.lapMs,record.bestLapMs)&&
    (!lap.carId||!record.bestCarId||String(lap.carId)===String(record.bestCarId));
  const local=getStorage(storage);
  const expected={trackId:record.trackId,lapMs:lap.lapMs,carId:lap.carId,
    recordedAt:lap.timestamp};
  const keys=collectUnique([lap.replayKey,isPb?record.ghostKey:null]);
  for(const key of keys){
    const ghost=storedReplay(local,key);
    if(matchesExactLocalReplay(ghost,expected))return {key,ghost};
  }
  return null;
}

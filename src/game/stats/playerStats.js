const KEY='tdr2:playerStats:v1';
const TT_HISTORY_PREFIX='tdr2:ttHist:';

function positiveTime(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function cleanTrackStats(value){
  const out={};
  if(!value||typeof value!=='object')return out;
  for(const [trackId,row] of Object.entries(value)){
    out[String(trackId)]={
      meters:Math.max(0,Number(row?.meters)||0),
      races:Math.max(0,Math.floor(Number(row?.races)||0)),
      laps:Math.max(0,Math.floor(Number(row?.laps)||0)),
      bestLapMs:positiveTime(row?.bestLapMs),
      lastLapMs:positiveTime(row?.lastLapMs)
    };
  }
  return out;
}
function cleanCarStats(value){
  const out={};if(!value||typeof value!=='object')return out;
  for(const [id,row] of Object.entries(value)){
    const tracks=cleanTrackStats(row?.tracks);
    const trackMeters=Object.values(tracks).reduce((s,r)=>s+(Number(r.meters)||0),0);
    const trackRaces=Object.values(tracks).reduce((s,r)=>s+(Number(r.races)||0),0);
    out[String(id)]={
      meters:Math.max(0,Number(row?.meters)||0,trackMeters),
      races:Math.max(0,Math.floor(Number(row?.races)||0),trackRaces),
      laps:Math.max(0,Math.floor(Number(row?.laps)||0)),
      tracks
    };
  }
  return out;
}
function loadPersisted(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
    return {totalMeters:Math.max(0,Number(raw.totalMeters)||0),cars:cleanCarStats(raw.cars),version:5};
  }catch{return{totalMeters:0,cars:{},version:5};}
}
function ensureCar(state,id){return state.cars[id]||(state.cars[id]={meters:0,races:0,laps:0,tracks:{}});}
function ensureTrack(car,trackId){
  const key=String(trackId||'').trim();if(!key)return null;
  if(!car.tracks||typeof car.tracks!=='object')car.tracks={};
  return car.tracks[key]||(car.tracks[key]={meters:0,races:0,laps:0,bestLapMs:null,lastLapMs:null});
}

// Timed laps already have an authoritative store: tdr2:ttHist:<trackId>.
// Statistics must read timing from there directly instead of copying/synchronising
// best laps into a second database. Distance/race counts remain in PLAYER_STATS_KEY.
function readTimeTrialIndex(){
  const cars={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const storageKey=localStorage.key(i)||'';
      if(!storageKey.startsWith(TT_HISTORY_PREFIX))continue;
      const trackId=storageKey.slice(TT_HISTORY_PREFIX.length).trim();
      if(!trackId)continue;
      let parsed=null;
      try{parsed=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{continue;}
      const history=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.history)?parsed.history:[]);
      for(const row of history){
        const carId=String(row?.carId||'').trim();
        const lapMs=positiveTime(row?.lapMs??row?.ms??row?.time);
        if(!carId||lapMs==null||row?.valid===false||row?.invalid===true)continue;
        const car=cars[carId]||(cars[carId]={laps:0,tracks:{}});
        const track=car.tracks[trackId]||(car.tracks[trackId]={laps:0,bestLapMs:null,lastLapMs:null,lastT:-Infinity});
        car.laps++;
        track.laps++;
        if(track.bestLapMs==null||lapMs<track.bestLapMs)track.bestLapMs=lapMs;
        const t=Number(row?.t)||0;
        if(t>=track.lastT){track.lastT=t;track.lastLapMs=lapMs;}
      }
    }
  }catch{}
  return cars;
}
function overlayTiming(state){
  const timing=readTimeTrialIndex();
  for(const [carId,tCar] of Object.entries(timing)){
    const car=ensureCar(state,carId);
    // "Timed laps" is deliberately the history count, not a duplicated counter.
    car.laps=Math.max(0,Number(tCar.laps)||0);
    for(const [trackId,tTrack] of Object.entries(tCar.tracks||{})){
      const track=ensureTrack(car,trackId);if(!track)continue;
      track.laps=Math.max(0,Number(tTrack.laps)||0);
      track.bestLapMs=positiveTime(tTrack.bestLapMs);
      track.lastLapMs=positiveTime(tTrack.lastLapMs);
    }
  }
  return state;
}

export function loadPlayerStats(){return overlayTiming(loadPersisted());}
export function savePlayerStats(state){
  const cars=cleanCarStats(state?.cars);
  const summed=Object.values(cars).reduce((s,r)=>s+Math.max(0,Number(r?.meters)||0),0);
  const next={version:5,totalMeters:Math.max(0,Number(state?.totalMeters)||0,summed),cars};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return overlayTiming(next);
}

// Kept for callers created during the stats migration. It is now a read/merge,
// not a fragile copy operation.
export function reconcileTimeTrialHistory(){return loadPlayerStats();}

export function addCarDistance(carId,meters,trackId=null){
  const id=String(carId||'').trim(),delta=Math.max(0,Number(meters)||0);if(!id||delta<=0)return loadPlayerStats();
  const state=loadPersisted(),car=ensureCar(state,id);
  car.meters=Math.max(0,Number(car.meters)||0)+delta;
  const track=ensureTrack(car,trackId);if(track)track.meters=Math.max(0,Number(track.meters)||0)+delta;
  state.totalMeters=Math.max(0,Number(state.totalMeters)||0)+delta;
  return savePlayerStats(state);
}
export function markCarRace(carId,trackId=null){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPersisted(),car=ensureCar(state,id);
  car.races=Math.max(0,Math.floor(Number(car.races)||0))+1;
  const track=ensureTrack(car,trackId);if(track)track.races=Math.max(0,Math.floor(Number(track.races)||0))+1;
  return savePlayerStats(state);
}

// Race code may call this, but timing is never trusted from this secondary store.
// The canonical completed-lap record is RaceScene's ttHist entry.
export function addCarLap(carId,count=1,trackId=null,lapMs=null){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPersisted(),car=ensureCar(state,id),inc=Math.max(0,Math.floor(Number(count)||0));
  car.laps=Math.max(0,Math.floor(Number(car.laps)||0))+inc;
  const track=ensureTrack(car,trackId);if(track)track.laps=Math.max(0,Math.floor(Number(track.laps)||0))+inc;
  return savePlayerStats(state);
}
export function recordCarTrackLap(carId,trackId,lapMs){return addCarLap(carId,1,trackId,lapMs);}
export function carMileageKm(carId){return Math.max(0,Number(loadPlayerStats().cars?.[String(carId||'')]?.meters)||0)/1000;}
export const PLAYER_STATS_KEY=KEY;

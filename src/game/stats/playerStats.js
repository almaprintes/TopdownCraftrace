const KEY='tdr2:playerStats:v1';

function cleanTrackStats(value){
  const out={};
  if(!value||typeof value!=='object')return out;
  for(const [trackId,row] of Object.entries(value)){
    out[String(trackId)]={
      meters:Math.max(0,Number(row?.meters)||0),
      races:Math.max(0,Math.floor(Number(row?.races)||0)),
      laps:Math.max(0,Math.floor(Number(row?.laps)||0)),
      bestLapMs:Number.isFinite(Number(row?.bestLapMs))&&Number(row.bestLapMs)>0?Number(row.bestLapMs):null,
      lastLapMs:Number.isFinite(Number(row?.lastLapMs))&&Number(row.lastLapMs)>0?Number(row.lastLapMs):null
    };
  }
  return out;
}

function cleanCarStats(value){
  const out={};
  if(!value||typeof value!=='object')return out;
  for(const [id,row] of Object.entries(value)){
    const tracks=cleanTrackStats(row?.tracks);
    const trackMeters=Object.values(tracks).reduce((sum,r)=>sum+(Number(r.meters)||0),0);
    const trackRaces=Object.values(tracks).reduce((sum,r)=>sum+(Number(r.races)||0),0);
    const trackLaps=Object.values(tracks).reduce((sum,r)=>sum+(Number(r.laps)||0),0);
    const meters=Math.max(0,Number(row?.meters)||0,trackMeters);
    const races=Math.max(0,Math.floor(Number(row?.races)||0),trackRaces);
    const laps=Math.max(0,Math.floor(Number(row?.laps)||0),trackLaps);
    out[String(id)]={meters,races,laps,tracks};
  }
  return out;
}

export function loadPlayerStats(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
    return{
      totalMeters:Math.max(0,Number(raw.totalMeters)||0),
      cars:cleanCarStats(raw.cars),
      version:2
    };
  }catch{return{totalMeters:0,cars:{},version:2};}
}

export function savePlayerStats(state){
  const cars=cleanCarStats(state?.cars);
  const summed=Object.values(cars).reduce((sum,row)=>sum+Math.max(0,Number(row?.meters)||0),0);
  const totalMeters=Math.max(0,Number(state?.totalMeters)||0,summed);
  const next={version:2,totalMeters,cars};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

function ensureCar(state,id){
  return state.cars[id]||(state.cars[id]={meters:0,races:0,laps:0,tracks:{}});
}
function ensureTrack(car,trackId){
  const key=String(trackId||'').trim();
  if(!key)return null;
  if(!car.tracks||typeof car.tracks!=='object')car.tracks={};
  return car.tracks[key]||(car.tracks[key]={meters:0,races:0,laps:0,bestLapMs:null,lastLapMs:null});
}

export function addCarDistance(carId,meters,trackId=null){
  const id=String(carId||'').trim();
  const delta=Math.max(0,Number(meters)||0);
  if(!id||delta<=0)return loadPlayerStats();
  const state=loadPlayerStats();
  const car=ensureCar(state,id);
  car.meters=Math.max(0,Number(car.meters)||0)+delta;
  const track=ensureTrack(car,trackId);
  if(track)track.meters=Math.max(0,Number(track.meters)||0)+delta;
  state.totalMeters=Math.max(0,Number(state.totalMeters)||0)+delta;
  return savePlayerStats(state);
}

export function markCarRace(carId,trackId=null){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPlayerStats();const car=ensureCar(state,id);
  car.races=Math.max(0,Math.floor(Number(car.races)||0))+1;
  const track=ensureTrack(car,trackId);if(track)track.races=Math.max(0,Math.floor(Number(track.races)||0))+1;
  return savePlayerStats(state);
}

export function addCarLap(carId,count=1,trackId=null,lapMs=null){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPlayerStats();const car=ensureCar(state,id);
  const inc=Math.max(0,Math.floor(Number(count)||0));
  car.laps=Math.max(0,Math.floor(Number(car.laps)||0))+inc;
  const track=ensureTrack(car,trackId);
  if(track){
    track.laps=Math.max(0,Math.floor(Number(track.laps)||0))+inc;
    const ms=Number(lapMs);
    if(Number.isFinite(ms)&&ms>0){
      track.lastLapMs=ms;
      if(!Number.isFinite(Number(track.bestLapMs))||ms<Number(track.bestLapMs))track.bestLapMs=ms;
    }
  }
  return savePlayerStats(state);
}

export function recordCarTrackLap(carId,trackId,lapMs){return addCarLap(carId,1,trackId,lapMs);}
export function carMileageKm(carId){return Math.max(0,Number(loadPlayerStats().cars?.[String(carId||'')]?.meters)||0)/1000;}
export const PLAYER_STATS_KEY=KEY;

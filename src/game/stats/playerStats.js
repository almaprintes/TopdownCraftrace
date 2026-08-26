const KEY='tdr2:playerStats:v1';
const TT_HISTORY_PREFIX='tdr2:ttHist:';

function cleanTrackStats(value){
  const out={};
  if(!value||typeof value!=='object')return out;
  for(const [trackId,row] of Object.entries(value)){
    out[String(trackId)]={meters:Math.max(0,Number(row?.meters)||0),races:Math.max(0,Math.floor(Number(row?.races)||0)),laps:Math.max(0,Math.floor(Number(row?.laps)||0)),bestLapMs:Number.isFinite(Number(row?.bestLapMs))&&Number(row.bestLapMs)>0?Number(row.bestLapMs):null,lastLapMs:Number.isFinite(Number(row?.lastLapMs))&&Number(row.lastLapMs)>0?Number(row.lastLapMs):null};
  }
  return out;
}
function cleanCarStats(value){
  const out={};if(!value||typeof value!=='object')return out;
  for(const [id,row] of Object.entries(value)){
    const tracks=cleanTrackStats(row?.tracks),trackMeters=Object.values(tracks).reduce((s,r)=>s+(Number(r.meters)||0),0),trackRaces=Object.values(tracks).reduce((s,r)=>s+(Number(r.races)||0),0),trackLaps=Object.values(tracks).reduce((s,r)=>s+(Number(r.laps)||0),0);
    out[String(id)]={meters:Math.max(0,Number(row?.meters)||0,trackMeters),races:Math.max(0,Math.floor(Number(row?.races)||0),trackRaces),laps:Math.max(0,Math.floor(Number(row?.laps)||0),trackLaps),tracks};
  }return out;
}
export function loadPlayerStats(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};return{totalMeters:Math.max(0,Number(raw.totalMeters)||0),cars:cleanCarStats(raw.cars),version:4};}catch{return{totalMeters:0,cars:{},version:4};}}
export function savePlayerStats(state){const cars=cleanCarStats(state?.cars),summed=Object.values(cars).reduce((s,r)=>s+Math.max(0,Number(r?.meters)||0),0),next={version:4,totalMeters:Math.max(0,Number(state?.totalMeters)||0,summed),cars};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}return next;}
function ensureCar(state,id){return state.cars[id]||(state.cars[id]={meters:0,races:0,laps:0,tracks:{}});}
function ensureTrack(car,trackId){const key=String(trackId||'').trim();if(!key)return null;if(!car.tracks||typeof car.tracks!=='object')car.tracks={};return car.tracks[key]||(car.tracks[key]={meters:0,races:0,laps:0,bestLapMs:null,lastLapMs:null});}

// TT stores {v,history:[...]}. Older builds of the stats importer incorrectly
// expected the parsed object itself to be an array, so no lap was ever imported.
export function reconcileTimeTrialHistory(){
  const state=loadPlayerStats(),aggregate={};
  try{
    for(let i=0;i<localStorage.length;i++){
      const storageKey=localStorage.key(i)||'';if(!storageKey.startsWith(TT_HISTORY_PREFIX))continue;
      const trackId=storageKey.slice(TT_HISTORY_PREFIX.length).trim();if(!trackId)continue;
      const parsed=JSON.parse(localStorage.getItem(storageKey)||'null');
      const history=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.history)?parsed.history:[]);
      for(const row of history){
        const carId=String(row?.carId||'').trim(),ms=Number(row?.lapMs);if(!carId||!Number.isFinite(ms)||ms<=0||row?.valid===false||row?.invalid===true)continue;
        const key=`${carId}\u0000${trackId}`,a=aggregate[key]||(aggregate[key]={carId,trackId,laps:0,best:null,last:null,lastT:-Infinity});a.laps++;if(a.best==null||ms<a.best)a.best=ms;const t=Number(row?.t)||0;if(t>=a.lastT){a.lastT=t;a.last=ms;}
      }
    }
  }catch{}
  let changed=false;
  for(const a of Object.values(aggregate)){const car=ensureCar(state,a.carId),track=ensureTrack(car,a.trackId);if(!track)continue;if(a.laps>Number(track.laps||0)){track.laps=a.laps;changed=true;}if(a.best!=null&&(!Number.isFinite(Number(track.bestLapMs))||a.best<Number(track.bestLapMs))){track.bestLapMs=a.best;changed=true;}if(a.last!=null&&Number(track.lastLapMs)!==a.last){track.lastLapMs=a.last;changed=true;}}
  for(const car of Object.values(state.cars)){const n=Object.values(car.tracks||{}).reduce((s,r)=>s+(Number(r.laps)||0),0);if(n>Number(car.laps||0)){car.laps=n;changed=true;}}
  return changed?savePlayerStats(state):state;
}

export function addCarDistance(carId,meters,trackId=null){const id=String(carId||'').trim(),delta=Math.max(0,Number(meters)||0);if(!id||delta<=0)return loadPlayerStats();const state=loadPlayerStats(),car=ensureCar(state,id);car.meters=Math.max(0,Number(car.meters)||0)+delta;const track=ensureTrack(car,trackId);if(track)track.meters=Math.max(0,Number(track.meters)||0)+delta;state.totalMeters=Math.max(0,Number(state.totalMeters)||0)+delta;return savePlayerStats(state);}
export function markCarRace(carId,trackId=null){const id=String(carId||'').trim();if(!id)return loadPlayerStats();const state=loadPlayerStats(),car=ensureCar(state,id);car.races=Math.max(0,Math.floor(Number(car.races)||0))+1;const track=ensureTrack(car,trackId);if(track)track.races=Math.max(0,Math.floor(Number(track.races)||0))+1;return savePlayerStats(state);}
export function addCarLap(carId,count=1,trackId=null,lapMs=null){const id=String(carId||'').trim();if(!id)return loadPlayerStats();const state=loadPlayerStats(),car=ensureCar(state,id),inc=Math.max(0,Math.floor(Number(count)||0));car.laps=Math.max(0,Math.floor(Number(car.laps)||0))+inc;const track=ensureTrack(car,trackId);if(track){track.laps=Math.max(0,Math.floor(Number(track.laps)||0))+inc;const ms=Number(lapMs);if(Number.isFinite(ms)&&ms>0){track.lastLapMs=ms;if(!Number.isFinite(Number(track.bestLapMs))||ms<Number(track.bestLapMs))track.bestLapMs=ms;}}return savePlayerStats(state);}
export function recordCarTrackLap(carId,trackId,lapMs){return addCarLap(carId,1,trackId,lapMs);}
export function carMileageKm(carId){return Math.max(0,Number(loadPlayerStats().cars?.[String(carId||'')]?.meters)||0)/1000;}
export const PLAYER_STATS_KEY=KEY;

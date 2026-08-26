const KEY='tdr2:playerStats:v1';

function cleanCarStats(value){
  const out={};
  if(!value||typeof value!=='object')return out;
  for(const [id,row] of Object.entries(value)){
    const meters=Math.max(0,Number(row?.meters)||0);
    const races=Math.max(0,Math.floor(Number(row?.races)||0));
    const laps=Math.max(0,Math.floor(Number(row?.laps)||0));
    out[String(id)]={meters,races,laps};
  }
  return out;
}

export function loadPlayerStats(){
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'null')||{};
    return{
      totalMeters:Math.max(0,Number(raw.totalMeters)||0),
      cars:cleanCarStats(raw.cars),
      version:1
    };
  }catch{return{totalMeters:0,cars:{},version:1};}
}

export function savePlayerStats(state){
  const cars=cleanCarStats(state?.cars);
  const totalMeters=Math.max(0,Number(state?.totalMeters)||Object.values(cars).reduce((sum,row)=>sum+Math.max(0,Number(row?.meters)||0),0));
  const next={version:1,totalMeters,cars};
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}

export function addCarDistance(carId,meters){
  const id=String(carId||'').trim();
  const delta=Math.max(0,Number(meters)||0);
  if(!id||delta<=0)return loadPlayerStats();
  const state=loadPlayerStats();
  const row=state.cars[id]||{meters:0,races:0,laps:0};
  row.meters=Math.max(0,Number(row.meters)||0)+delta;
  state.cars[id]=row;
  state.totalMeters=Math.max(0,Number(state.totalMeters)||0)+delta;
  return savePlayerStats(state);
}

export function markCarRace(carId){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPlayerStats();const row=state.cars[id]||{meters:0,races:0,laps:0};
  row.races=Math.max(0,Math.floor(Number(row.races)||0))+1;state.cars[id]=row;return savePlayerStats(state);
}

export function addCarLap(carId,count=1){
  const id=String(carId||'').trim();if(!id)return loadPlayerStats();
  const state=loadPlayerStats();const row=state.cars[id]||{meters:0,races:0,laps:0};
  row.laps=Math.max(0,Math.floor(Number(row.laps)||0))+Math.max(0,Math.floor(Number(count)||0));state.cars[id]=row;return savePlayerStats(state);
}

export function carMileageKm(carId){
  return Math.max(0,Number(loadPlayerStats().cars?.[String(carId||'')]?.meters)||0)/1000;
}

export const PLAYER_STATS_KEY=KEY;

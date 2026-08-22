const VERSION=1;
const PREFIX='tdr2:raceAiLearning:';

function safeParse(raw){try{return JSON.parse(raw);}catch{return null;}}
function key(trackKey,carId='default'){
  return `${PREFIX}${String(trackKey||'track01')}:${String(carId||'default')}`;
}

export function loadRaceAiLearning(trackKey,carId='default'){
  try{
    const data=safeParse(localStorage.getItem(key(trackKey,carId))||'null');
    if(!data||data.version!==VERSION)return null;
    return data;
  }catch{return null;}
}

export function saveRaceAiLearning(trackKey,carId='default',patch={}){
  const previous=loadRaceAiLearning(trackKey,carId)||{
    version:VERSION,trackKey:String(trackKey||'track01'),carId:String(carId||'default'),
    bestLapMs:null,bestPlan:null,history:[]
  };
  const history=Array.isArray(previous.history)?previous.history.slice(-39):[];
  if(patch.historyEntry)history.push(patch.historyEntry);
  const next={...previous,...patch,version:VERSION,history};
  delete next.historyEntry;
  try{localStorage.setItem(key(trackKey,carId),JSON.stringify(next));}catch{}
  return next;
}

export function clearRaceAiLearning(trackKey,carId='default'){
  try{localStorage.removeItem(key(trackKey,carId));}catch{}
}

const KEY='tdr2:raceRecords:v1';
const TT_HISTORY_PREFIX='tdr2:ttHist:';
const PB_PREFIX='tdr2:ttBest:';
const TOP_REPLAY_PREFIX='tdr2:topReplay:';
const TOP_LIMIT=20;

function positive(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function text(value){return String(value??'').trim();}
function readJson(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function empty(){return{version:1,updatedAt:0,tracks:{},cloud:{snapshotTtlMs:30*60*1000,lastSyncAt:0}};}
function lapId(trackId,row,index){const t=Number(row?.t||row?.timestamp||0);const car=text(row?.carId)||'car';const ms=Math.round(positive(row?.lapMs??row?.ms??row?.time)||0);return`${trackId}:${car}:${t||index}:${ms}`;}
function topReplayKey(trackId,row,index){return`${TOP_REPLAY_PREFIX}${encodeURIComponent(String(trackId||''))}:${encodeURIComponent(lapId(trackId,row,index))}`;}
function sectors(row){const raw=row?.sectors||row?.sectorMs||row?.sectorTimes||[];if(Array.isArray(raw))return raw.map(positive).filter(Boolean).slice(0,8);return[];}
function normalizeLap(trackId,row,index){const lapMs=positive(row?.lapMs??row?.ms??row?.time);if(!lapMs||row?.valid===false||row?.invalid===true)return null;const key=topReplayKey(trackId,row,index);let replayKey=null;try{if(localStorage.getItem(key))replayKey=key;}catch{}return{id:lapId(trackId,row,index),trackId,carId:text(row?.carId)||null,lapMs:Math.round(lapMs),sectorsMs:sectors(row),timestamp:Math.max(0,Number(row?.t||row?.timestamp||0)),valid:true,verificationStatus:'local',replayKey};}
function historyForTrack(trackId){const parsed=readJson(`${TT_HISTORY_PREFIX}${trackId}`,[]);const rows=Array.isArray(parsed)?parsed:(Array.isArray(parsed?.history)?parsed.history:[]);return rows.map((row,i)=>normalizeLap(trackId,row,i)).filter(Boolean);}
function officialPb(trackId){const row=readJson(`${PB_PREFIX}${trackId}`,null);const lapMs=positive(row?.lapMs??row?.ms??row?.time);return lapMs?{lapMs:Math.round(lapMs),carId:text(row?.carId)||null,recordedAt:Number(row?.recordedAt||row?.t||0)||0,ghostKey:text(row?.ghostKey)||null}:null;}
function buildTrack(trackId){const laps=historyForTrack(trackId).sort((a,b)=>a.lapMs-b.lapMs||b.timestamp-a.timestamp);const pb=officialPb(trackId);const best=pb||laps[0]||null;const progression=[];let running=Infinity;for(const lap of [...laps].sort((a,b)=>a.timestamp-b.timestamp)){if(lap.lapMs<running){running=lap.lapMs;progression.push({lapMs:lap.lapMs,timestamp:lap.timestamp,carId:lap.carId});}}
return{trackId,bestLapMs:best?.lapMs||null,bestCarId:best?.carId||null,recordedAt:best?.recordedAt||best?.timestamp||0,ghostKey:best?.ghostKey||null,validLaps:laps.length,topLaps:laps.slice(0,TOP_LIMIT),progression:progression.slice(-50),verificationStatus:'local'};}
function discoverTrackIds(){const ids=new Set();try{for(let i=0;i<localStorage.length;i++){const storageKey=localStorage.key(i)||'';if(storageKey.startsWith(TT_HISTORY_PREFIX))ids.add(storageKey.slice(TT_HISTORY_PREFIX.length));if(storageKey.startsWith(PB_PREFIX))ids.add(storageKey.slice(PB_PREFIX.length));}}catch{}return[...ids].filter(Boolean);}
export function rebuildLocalRaceRecords(){const state=empty();for(const trackId of discoverTrackIds())state.tracks[trackId]=buildTrack(trackId);state.updatedAt=Date.now();const previous=readJson(KEY,null);if(previous?.cloud)state.cloud={...state.cloud,...previous.cloud};writeJson(KEY,state);return state;}
export function loadLocalRaceRecords({rebuild=true}={}){if(rebuild)return rebuildLocalRaceRecords();const raw=readJson(KEY,null);return raw&&raw.version===1?raw:rebuildLocalRaceRecords();}
export function getCircuitRecord(trackId){return loadLocalRaceRecords().tracks?.[String(trackId||'')]||null;}
export function getPersonalCircuitRecords(){return Object.values(loadLocalRaceRecords().tracks||{}).sort((a,b)=>(a.bestLapMs?0:1)-(b.bestLapMs?0:1)||(a.bestLapMs||Infinity)-(b.bestLapMs||Infinity));}
export function cloudSnapshotPolicy(trackId){const state=loadLocalRaceRecords({rebuild:false});const cached=readJson(`tdr2:leaderboardSnapshot:${trackId}`,null);const ttl=Math.max(60000,Number(state.cloud?.snapshotTtlMs)||30*60*1000);const age=cached?.fetchedAt?Math.max(0,Date.now()-Number(cached.fetchedAt)):Infinity;return{trackId:String(trackId||''),ttlMs:ttl,ageMs:age,fresh:age<ttl,cached};}
export function saveCloudSnapshot(trackId,payload){const snapshot={version:1,trackId:String(trackId||''),fetchedAt:Date.now(),payload};writeJson(`tdr2:leaderboardSnapshot:${trackId}`,snapshot);return snapshot;}
export const LOCAL_RACE_RECORDS_KEY=KEY;

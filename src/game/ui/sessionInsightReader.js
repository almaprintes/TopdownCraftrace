import BANK from './sessionInsightBank.json' with {type:'json'};

// Deliberately local to this installation; no cloud write and no new player data.
const STORE_KEY='tdr2:sessionInsightCycle:v1';
const ephemeralByPilot=new Map();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const roundSec=ms=>(Math.max(0,ms)/1000).toFixed(2);
const fmtLap=ms=>{
  const safe=Math.max(0,Math.round(ms));
  const min=Math.floor(safe/60000);
  const sec=Math.floor((safe%60000)/1000);
  return String(min)+':'+String(sec).padStart(2,'0')+'.'+String(safe%1000).padStart(3,'0');
};
const average=list=>list.reduce((sum,v)=>sum+v,0)/Math.max(1,list.length);
const createState=()=>({version:1,used:{},recent:{es:[],en:[]}});

function getStorage(storage){
  if(storage!==undefined)return storage;
  try{return globalThis.localStorage;}catch{return null;}
}
function insightStorageKey(storage){
  // An account may change on the same phone. Keep the anti-repeat cycles
  // separate without synchronizing user data or changing the save schema.
  try{
    const profile=JSON.parse(storage?.getItem('tdr2:pilotProfile:v1')||'null');
    const pilotId=String(profile?.id||'').trim().slice(0,72);
    return pilotId?STORE_KEY+':'+encodeURIComponent(pilotId):STORE_KEY;
  }catch{return STORE_KEY;}
}
function readState(storage,key){
  try{
    const parsed=JSON.parse(storage?.getItem(key)||'null');
    if(parsed?.version===1&&parsed.used&&parsed.recent&&typeof parsed.used==='object')return parsed;
  }catch{}
  return ephemeralByPilot.get(key)||createState();
}
function writeState(storage,key,state){
  ephemeralByPilot.set(key,state);
  try{storage?.setItem(key,JSON.stringify(state));}catch{}
}
function chooseFocus(options,recent){
  const ranked=[...options].sort((a,b)=>b.weight-a.weight);
  if(ranked.length===1)return ranked[0].id;
  const ceiling=ranked[0].weight-22;
  const competitive=ranked.filter(item=>item.weight>=ceiling);
  // A new insight about a different aspect of the run is better than
  // hearing about braking five times in a row.
  for(const group of [competitive.filter(c=>!recent.slice(0,3).includes(c.id)),
    competitive.filter(c=>recent[0]!==c.id),competitive]){
    if(group.length)return group[0].id;
  }
  return ranked[0].id;
}
function chooseUnused(phrases,state,key,recent,rng){
  let used=Array.isArray(state.used[key])?state.used[key].filter(n=>Number.isInteger(n)&&n>=0&&n<phrases.length):[];
  let pool=phrases.map((_,i)=>i).filter(i=>!used.includes(i));
  if(!pool.length){
    // Exhaust the whole category before starting a fresh cycle.
    used=[];
    pool=phrases.map((_,i)=>i);
  }
  const prior=Array.isArray(recent)?recent:[];
  const fresh=pool.filter(i=>!prior.some(x=>x.id===key&&x.index===i));
  if(fresh.length)pool=fresh;
  const index=pool[Math.floor(Math.min(0.999999,Math.max(0,num(rng())))*pool.length)];
  used.push(index);
  state.used[key]=used;
  return index;
}
function textFor(template,values){
  return template.replace(/\{([a-zA-Z]+)\}/g,(match,id)=>Object.hasOwn(values,id)?String(values[id]):match);
}

export const SESSION_INSIGHT_BANK_SIZE=Object.values(BANK.categories).reduce((n,group)=>n+group.es.length,0);

/**
 * A report insight is chosen from telemetry-compatible categories only.
 * Choices are stored per language across runs, so every phrase in a category
 * is consumed before that category can repeat on the same installation.
 * A short focus history prevents identical coaching angles on consecutive runs.
 */
export function buildSessionInsight(report,{language='es',previousBestMs=null,storage,rng=Math.random}={}){
  const lang=language==='en'?'en':'es';
  const laps=(Array.isArray(report?.laps)?report.laps:[])
    .filter(l=>Number.isFinite(Number(l?.lapMs))&&Number(l.lapMs)>1000);
  const valid=laps.filter(l=>l.valid!==false&&l.invalid!==true).map(l=>Number(l.lapMs));
  const invalid=laps.length-valid.length;
  const best=valid.length?Math.min(...valid):null;
  const spread=valid.length>=2?Math.max(...valid)-best:0;
  const off=Math.max(0,Math.round(num(report?.offTrackEvents)));
  const offSecs=Math.max(0,num(report?.offTrackSec));
  const brake=Math.max(0,num(report?.brakePct));
  const coast=Math.max(0,num(report?.coastPct));
  const throttle=Math.max(0,num(report?.throttlePct));
  const half=Math.floor(valid.length/2);
  const earlier=half?average(valid.slice(0,half)):0;
  const later=half?average(valid.slice(-half)):0;
  const trend=earlier-later;
  const trendThreshold=Math.max(700,earlier*0.012);
  const improvement=best!=null&&Number.isFinite(previousBestMs)?Number(previousBestMs)-best:0;
  const params={
    lapCount:laps.length,firstLap:fmtLap(laps[0]?.lapMs||0),
    offTrackEvents:off,offTrackSeconds:offSecs.toFixed(1),
    invalidLaps:invalid,gain:roundSec(improvement),
    spread:roundSec(spread),trend:roundSec(Math.abs(trend)),
    brakePct:Math.round(brake),coastPct:Math.round(coast),
    throttlePct:Math.round(throttle)
  };
  const candidates=[];
  const add=(id,weight,when)=>{if(when)candidates.push({id,weight});};
  if(laps.length===0)add('noLaps',120,true);
  else{
    add('oneLap',100,laps.length===1&&invalid===0);
    add('shortRun',70,laps.length>=2&&laps.length<=3);
    add('manyOff',104,off>=3);
    add('lightOff',80,off===1);
    add('invalid',106,invalid>0);
    add('pb',108,improvement>=10&&best!=null);
    add('steady',84,valid.length>=3&&spread<=Math.max(1500,best*0.018));
    add('improving',88,valid.length>=4&&trend>trendThreshold);
    add('fading',87,valid.length>=4&&trend< -trendThreshold);
    add('uneven',92,valid.length>=3&&spread>=Math.max(3000,best*0.05));
    add('braking',73,brake>=24);
    add('coasting',72,coast>=34);
    add('throttle',69,throttle>=80);
    add('clean',68,laps.length>=2&&off===0&&invalid===0);
    add('neutral',28,true);
  }
  const resolvedStore=getStorage(storage);
  const storageKey=insightStorageKey(resolvedStore);
  const state=readState(resolvedStore,storageKey);
  const recent=Array.isArray(state.recent?.[lang])?state.recent[lang]:[];
  const focus=chooseFocus(candidates,recent.map(x=>x.focus));
  const phrases=BANK.categories[focus]?.[lang]||BANK.categories.neutral[lang];
  const key=lang+':'+focus;
  const index=chooseUnused(phrases,state,key,recent,rng);
  if(!state.recent||typeof state.recent!=='object')state.recent={es:[],en:[]};
  state.recent[lang]=[{focus,id:key,index},...recent].slice(0,6);
  writeState(resolvedStore,storageKey,state);
  return textFor(phrases[index],params);
}

import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';
import { t } from '../i18n/index.js';

const STATE_KEY='tdr2:raceEvents:v1';
const HIST_PREFIX='tdr2:ttHist:';

const EVENT_DEFS=[
  {id:'first-stint',objective:{type:'laps',target:5,labelKey:'events.label.laps'},reward:{coins:150,items:{scrap:6,rubber:3}}},
  {id:'clean-lines',objective:{type:'clean',target:8,labelKey:'events.label.cleanLaps'},reward:{coins:250,items:{alloy:5,compound:4}}},
  {id:'track-tour',objective:{type:'tracks',target:3,minPerTrack:3,labelKey:'events.label.tracks'},reward:{coins:400,items:{disc:5,spring:4}}},
  {id:'race-rhythm',objective:{type:'clean',target:15,labelKey:'events.label.cleanLaps'},reward:{coins:600,items:{gear:5,compound:6,ecu:1}}},
  {id:'endurance',objective:{type:'laps',target:30,labelKey:'events.label.laps'},reward:{coins:850,items:{scrap:10,alloy:8,rubber:8,disc:6}}},
  {id:'circuit-master',objective:{type:'tracks',target:5,minPerTrack:5,labelKey:'events.label.tracks'},reward:{coins:1200,items:{gear:8,spring:8,compound:10,ecu:2}}},
  {id:'pro-driver',objective:{type:'clean',target:50,labelKey:'events.label.cleanLaps'},reward:{coins:1800,items:{scrap:12,alloy:12,rubber:12,compound:12,disc:10,spring:10,gear:10,ecu:3}}}
];

function localizeEvent(def){
  return {
    ...def,
    title:t(`events.${def.id}.title`),
    description:t(`events.${def.id}.desc`),
    objective:{...def.objective,label:t(def.objective.labelKey||'events.label.progress')}
  };
}

export const RACE_EVENTS=EVENT_DEFS;

function readHistory(key){
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'null');
    return Array.isArray(parsed?.history)?parsed.history:[];
  }catch{return [];}
}

export function snapshotRaceEventStats(){
  const out={laps:0,clean:0,trackLaps:{}};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||!key.startsWith(HIST_PREFIX))continue;
      const trackId=key.slice(HIST_PREFIX.length)||key;
      const hist=readHistory(key);
      let valid=0;
      for(const rec of hist){
        const ms=Number(rec?.lapMs??rec?.ms??rec?.time);
        if(!Number.isFinite(ms)||ms<=0)continue;
        valid++;
        out.laps++;
        if(Math.max(0,Number(rec?.penaltyMs)||0)===0)out.clean++;
      }
      out.trackLaps[trackId]=(out.trackLaps[trackId]||0)+valid;
    }
  }catch{}
  return out;
}

function normalizedBaseline(stats){
  return {laps:Number(stats?.laps||0),clean:Number(stats?.clean||0),trackLaps:{...(stats?.trackLaps||{})}};
}

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'null');
    if(raw&&Number.isInteger(raw.index)&&raw.baseline)return raw;
  }catch{}
  const fresh={index:0,baseline:normalizedBaseline(snapshotRaceEventStats()),claimed:[]};
  try{localStorage.setItem(STATE_KEY,JSON.stringify(fresh));}catch{}
  return fresh;
}

function saveState(state){
  try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}
  return state;
}

function deltaStats(now,base){
  const trackLaps={};
  const keys=new Set([...Object.keys(now?.trackLaps||{}),...Object.keys(base?.trackLaps||{})]);
  for(const key of keys)trackLaps[key]=Math.max(0,Number(now?.trackLaps?.[key]||0)-Number(base?.trackLaps?.[key]||0));
  return {
    laps:Math.max(0,Number(now?.laps||0)-Number(base?.laps||0)),
    clean:Math.max(0,Number(now?.clean||0)-Number(base?.clean||0)),
    trackLaps
  };
}

function evaluateObjective(objective,delta){
  const target=Math.max(1,Number(objective?.target)||1);
  let value=0;
  if(objective?.type==='clean')value=delta.clean;
  else if(objective?.type==='tracks'){
    const minPerTrack=Math.max(1,Number(objective?.minPerTrack)||1);
    value=Object.values(delta.trackLaps||{}).filter(n=>Number(n)>=minPerTrack).length;
  }else value=delta.laps;
  return {value:Math.min(target,Math.max(0,value)),rawValue:Math.max(0,value),target,complete:value>=target,label:t(objective?.labelKey||'events.label.progress')};
}

export function getCurrentRaceEvent(){
  const state=loadState();
  if(state.index>=EVENT_DEFS.length)return {finished:true,index:state.index,total:EVENT_DEFS.length};
  const event=localizeEvent(EVENT_DEFS[state.index]);
  const now=snapshotRaceEventStats();
  const delta=deltaStats(now,state.baseline);
  return {finished:false,index:state.index,total:EVENT_DEFS.length,event,progress:evaluateObjective(event.objective,delta)};
}

export function claimCurrentRaceEvent(){
  const state=loadState();
  if(state.index>=EVENT_DEFS.length)return {ok:false,reason:'finished'};
  const event=localizeEvent(EVENT_DEFS[state.index]);
  const now=snapshotRaceEventStats();
  const progress=evaluateObjective(event.objective,deltaStats(now,state.baseline));
  if(!progress.complete)return {ok:false,reason:'incomplete'};
  if((state.claimed||[]).includes(event.id))return {ok:false,reason:'claimed'};

  const garage=loadGarage();
  garage.coins=Math.max(0,Number(garage.coins)||0)+Math.max(0,Number(event.reward?.coins)||0);
  for(const [id,n] of Object.entries(event.reward?.items||{})){
    const amount=Math.max(0,Math.floor(Number(n)||0));
    if(amount)addItem(garage,id,amount);
  }
  saveGarage(garage);

  state.claimed=[...(state.claimed||[]),event.id];
  state.index+=1;
  state.baseline=normalizedBaseline(now);
  saveState(state);
  return {ok:true,event,nextIndex:state.index};
}

export function raceEventRewardLabel(reward){
  const parts=[];
  const coins=Math.max(0,Number(reward?.coins)||0);
  if(coins)parts.push(`${coins} ${t('events.coins')}`);
  const items=Object.entries(reward?.items||{}).filter(([,n])=>Number(n)>0);
  for(const [id,n] of items.slice(0,2))parts.push(`${t(`items.${id}`)} ×${Number(n)}`);
  if(items.length>2)parts.push(`+${items.length-2} ${t('events.more')}`);
  return parts.join(' · ');
}

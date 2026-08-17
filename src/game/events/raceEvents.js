import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';

const STATE_KEY='tdr2:raceEvents:v1';
const HIST_PREFIX='tdr2:ttHist:';

export const RACE_EVENTS=[
  {
    id:'first-stint',
    title:'PRIMER STINT',
    description:'Completa 5 vueltas en cualquier circuito.',
    objective:{type:'laps',target:5,label:'VUELTAS'},
    reward:{coins:150,items:{scrap:6,rubber:3}}
  },
  {
    id:'clean-lines',
    title:'TRAZADA LIMPIA',
    description:'Completa 8 vueltas sin penalizaciones.',
    objective:{type:'clean',target:8,label:'VUELTAS LIMPIAS'},
    reward:{coins:250,items:{alloy:5,compound:4}}
  },
  {
    id:'track-tour',
    title:'CONOCE EL PADDOCK',
    description:'Da 3 vueltas en 3 circuitos diferentes.',
    objective:{type:'tracks',target:3,minPerTrack:3,label:'CIRCUITOS'},
    reward:{coins:400,items:{disc:5,spring:4}}
  },
  {
    id:'race-rhythm',
    title:'RITMO DE CARRERA',
    description:'Encadena 15 vueltas limpias.',
    objective:{type:'clean',target:15,label:'VUELTAS LIMPIAS'},
    reward:{coins:600,items:{gear:5,compound:6,ecu:1}}
  },
  {
    id:'endurance',
    title:'RESISTENCIA',
    description:'Completa 30 vueltas desde la activación.',
    objective:{type:'laps',target:30,label:'VUELTAS'},
    reward:{coins:850,items:{scrap:10,alloy:8,rubber:8,disc:6}}
  },
  {
    id:'circuit-master',
    title:'DOMINIO DE CIRCUITOS',
    description:'Da 5 vueltas en 5 circuitos diferentes.',
    objective:{type:'tracks',target:5,minPerTrack:5,label:'CIRCUITOS'},
    reward:{coins:1200,items:{gear:8,spring:8,compound:10,ecu:2}}
  },
  {
    id:'pro-driver',
    title:'PILOTO PRO',
    description:'Completa 50 vueltas limpias.',
    objective:{type:'clean',target:50,label:'VUELTAS LIMPIAS'},
    reward:{coins:1800,items:{scrap:12,alloy:12,rubber:12,compound:12,disc:10,spring:10,gear:10,ecu:3}}
  }
];

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
  return {value:Math.min(target,Math.max(0,value)),rawValue:Math.max(0,value),target,complete:value>=target,label:objective?.label||'PROGRESO'};
}

export function getCurrentRaceEvent(){
  const state=loadState();
  if(state.index>=RACE_EVENTS.length)return {finished:true,index:state.index,total:RACE_EVENTS.length};
  const event=RACE_EVENTS[state.index];
  const now=snapshotRaceEventStats();
  const delta=deltaStats(now,state.baseline);
  return {finished:false,index:state.index,total:RACE_EVENTS.length,event,progress:evaluateObjective(event.objective,delta)};
}

export function claimCurrentRaceEvent(){
  const state=loadState();
  if(state.index>=RACE_EVENTS.length)return {ok:false,reason:'finished'};
  const event=RACE_EVENTS[state.index];
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

const ITEM_LABELS={scrap:'Chatarra',alloy:'Aleación',rubber:'Goma',compound:'Compuesto',disc:'Disco',spring:'Muelle',gear:'Engranaje',ecu:'ECU'};
export function raceEventRewardLabel(reward){
  const parts=[];
  const coins=Math.max(0,Number(reward?.coins)||0);
  if(coins)parts.push(`${coins} MONEDAS`);
  const items=Object.entries(reward?.items||{}).filter(([,n])=>Number(n)>0);
  for(const [id,n] of items.slice(0,2))parts.push(`${ITEM_LABELS[id]||id} ×${Number(n)}`);
  if(items.length>2)parts.push(`+${items.length-2} MÁS`);
  return parts.join(' · ');
}

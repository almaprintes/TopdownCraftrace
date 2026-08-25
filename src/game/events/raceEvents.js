import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';
import { t, getLanguage } from '../i18n/index.js';
import { loadSeasonTelemetry } from '../seasons/seasonTelemetry.js';

const STATE_KEY='tdr2:seasonInduction:v1';
const HIST_PREFIX='tdr2:ttHist:';

const L=(es,en)=>({es,en});
const EVENT_DEFS=[
  {id:'first-drive',title:L('Primeros metros','First Miles'),description:L('Completa tu primera vuelta válida.','Complete your first valid lap.'),objective:{type:'laps',target:1,label:L('VUELTA','LAP')},reward:{coins:150,items:{scrap:4}}},
  {id:'garage-visit',title:L('Conoce tu máquina','Know Your Machine'),description:L('Entra en el garaje y echa un vistazo a tu coche.','Visit the garage and take a look at your car.'),objective:{type:'garageVisits',target:1,label:L('VISITA','VISIT')},reward:{coins:200,items:{alloy:3}}},
  {id:'material-start',title:L('Primer botín','First Loot'),description:L('Corre hasta conseguir tus primeros materiales.','Race until you earn your first materials.'),objective:{type:'lootDraws',target:8,label:L('BOTINES','LOOT DROPS')},reward:{coins:250,items:{scrap:6,rubber:4}}},
  {id:'first-craft',title:L('Manos a la obra','Hands On'),description:L('Fabrica tu primera pieza para el coche.','Craft your first car part.'),objective:{type:'discoveries',target:1,absolute:true,label:L('PIEZA','PART')},reward:{coins:300,items:{alloy:5,compound:2}}},
  {id:'equip-part',title:L('Ajusta el coche','Tune the Car'),description:L('Equipa una pieza fabricada en uno de tus coches.','Equip a crafted part on one of your cars.'),objective:{type:'equipped',target:1,absolute:true,label:L('EQUIPADA','EQUIPPED')},reward:{coins:350,items:{gear:4}}},
  {id:'clean-start',title:L('Conduce limpio','Drive Clean'),description:L('Completa 2 vueltas limpias sin penalización.','Complete 2 clean laps without penalties.'),objective:{type:'clean',target:2,label:L('LIMPIAS','CLEAN LAPS')},reward:{coins:350,items:{compound:4}}},
  {id:'store-buy',title:L('De compras','Shop Visit'),description:L('Compra un pack de materiales usando monedas del juego.','Buy a material pack using in-game coins.'),objective:{type:'storeBuys',target:1,label:L('COMPRA','PURCHASE')},reward:{coins:400,items:{disc:4,spring:4}}},
  {id:'track-tour',title:L('Cambia de escenario','Change of Scenery'),description:L('Completa al menos una vuelta en 2 circuitos distintos.','Complete at least one lap on 2 different tracks.'),objective:{type:'tracks',target:2,minPerTrack:1,label:L('CIRCUITOS','TRACKS')},reward:{coins:400,items:{rubber:6}}},
  {id:'mode-tour',title:L('Prueba algo diferente','Try Something New'),description:L('Inicia otro modo de juego desde el selector de modos.','Start another game mode from the mode selector.'),objective:{type:'modeStarts',target:1,label:L('MODO','MODE')},reward:{coins:400,items:{gear:5}}},
  {id:'material-hunt',title:L('Coleccionista','Collector'),description:L('Consigue 20 nuevas tiradas de materiales compitiendo.','Earn 20 new material drops by racing.'),objective:{type:'lootDraws',target:20,label:L('BOTINES','LOOT DROPS')},reward:{coins:450,items:{scrap:10,alloy:6}}},
  {id:'clean-rhythm',title:L('Coge el ritmo','Find Your Rhythm'),description:L('Completa 5 vueltas limpias.','Complete 5 clean laps.'),objective:{type:'clean',target:5,label:L('LIMPIAS','CLEAN LAPS')},reward:{coins:450,items:{compound:6,ecu:1}}},
  {id:'distance-run',title:L('Suma kilómetros','Build Mileage'),description:L('Completa 10 vueltas válidas.','Complete 10 valid laps.'),objective:{type:'laps',target:10,label:L('VUELTAS','LAPS')},reward:{coins:500,items:{scrap:12,rubber:8}}},
  {id:'explorer',title:L('Explorador','Explorer'),description:L('Completa al menos 2 vueltas en 3 circuitos distintos.','Complete at least 2 laps on 3 different tracks.'),objective:{type:'tracks',target:3,minPerTrack:2,label:L('CIRCUITOS','TRACKS')},reward:{coins:550,items:{disc:6,spring:6,gear:6}}},
  {id:'induction-final',title:L('Piloto completo','Complete Driver'),description:L('Demuestra lo aprendido: 5 vueltas, 3 limpias y 2 circuitos.','Show what you learned: 5 laps, 3 clean laps and 2 tracks.'),objective:{type:'combined',target:3,label:L('OBJETIVOS','OBJECTIVES'),parts:[{type:'laps',target:5},{type:'clean',target:3},{type:'tracks',target:2,minPerTrack:1}]},reward:{coins:700,items:{scrap:12,alloy:10,rubber:10,compound:8,ecu:2}}}
];

function lang(){return getLanguage()==='en'?'en':'es';}
function localizeEvent(def){
  const k=lang();
  return {...def,title:def.title?.[k]||def.title?.es||def.id,description:def.description?.[k]||def.description?.es||'',objective:{...def.objective,label:def.objective?.label?.[k]||def.objective?.label?.es||''}};
}

export const RACE_EVENTS=EVENT_DEFS;

function readHistory(key){
  try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(parsed?.history)?parsed.history:[];}catch{return [];}
}

function equippedCount(garage){
  const ids=[];
  for(const id of Object.values(garage?.equipped||{}))if(id)ids.push(id);
  for(const set of Object.values(garage?.equippedByCar||{}))for(const id of Object.values(set||{}))if(id)ids.push(id);
  return ids.length;
}

export function snapshotRaceEventStats(){
  const out={laps:0,clean:0,trackLaps:{},garageVisits:0,storeBuys:0,modeStarts:0,lootDraws:0,discoveries:0,equipped:0};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.startsWith(HIST_PREFIX))continue;
      const trackId=key.slice(HIST_PREFIX.length)||key,hist=readHistory(key);let valid=0;
      for(const rec of hist){const ms=Number(rec?.lapMs??rec?.ms??rec?.time);if(!Number.isFinite(ms)||ms<=0)continue;valid++;out.laps++;if(Math.max(0,Number(rec?.penaltyMs)||0)===0)out.clean++;}
      out.trackLaps[trackId]=(out.trackLaps[trackId]||0)+valid;
    }
    const telemetry=loadSeasonTelemetry();
    out.garageVisits=Math.max(0,Number(telemetry.garageVisits)||0);
    out.storeBuys=Math.max(0,Number(telemetry.storeBuys)||0);
    out.modeStarts=Math.max(0,Number(telemetry.modeStarts)||0);
    const garage=loadGarage();
    out.lootDraws=Math.max(0,Number(garage?.lootBalance?.draws)||0);
    out.discoveries=Array.isArray(garage?.discoveries)?garage.discoveries.length:0;
    out.equipped=equippedCount(garage);
  }catch{}
  return out;
}

function normalizedBaseline(s){return {laps:Number(s?.laps||0),clean:Number(s?.clean||0),trackLaps:{...(s?.trackLaps||{})},garageVisits:Number(s?.garageVisits||0),storeBuys:Number(s?.storeBuys||0),modeStarts:Number(s?.modeStarts||0),lootDraws:Number(s?.lootDraws||0),discoveries:Number(s?.discoveries||0),equipped:Number(s?.equipped||0)};}
function loadState(){try{const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(raw&&Number.isInteger(raw.index)&&raw.baseline)return raw;}catch{}const fresh={index:0,baseline:normalizedBaseline(snapshotRaceEventStats()),claimed:[]};try{localStorage.setItem(STATE_KEY,JSON.stringify(fresh));}catch{}return fresh;}
function saveState(state){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}return state;}

function deltaStats(now,base){
  const trackLaps={},keys=new Set([...Object.keys(now?.trackLaps||{}),...Object.keys(base?.trackLaps||{})]);
  for(const key of keys)trackLaps[key]=Math.max(0,Number(now?.trackLaps?.[key]||0)-Number(base?.trackLaps?.[key]||0));
  return {laps:Math.max(0,now.laps-base.laps),clean:Math.max(0,now.clean-base.clean),trackLaps,garageVisits:Math.max(0,now.garageVisits-base.garageVisits),storeBuys:Math.max(0,now.storeBuys-base.storeBuys),modeStarts:Math.max(0,now.modeStarts-base.modeStarts),lootDraws:Math.max(0,now.lootDraws-base.lootDraws),absolute:{discoveries:now.discoveries,equipped:now.equipped}};
}

function rawObjectiveValue(o,d){
  if(o.type==='clean')return d.clean;
  if(o.type==='tracks'){const min=Math.max(1,Number(o.minPerTrack)||1);return Object.values(d.trackLaps||{}).filter(n=>Number(n)>=min).length;}
  if(o.type==='discoveries'||o.type==='equipped')return Number(d.absolute?.[o.type]||0);
  if(o.type==='combined')return (o.parts||[]).filter(p=>rawObjectiveValue(p,d)>=Math.max(1,Number(p.target)||1)).length;
  if(Object.prototype.hasOwnProperty.call(d,o.type))return Number(d[o.type]||0);
  return d.laps;
}
function evaluateObjective(o,d){const target=Math.max(1,Number(o?.target)||1),value=Math.max(0,rawObjectiveValue(o,d));return {value:Math.min(target,value),rawValue:value,target,complete:value>=target,label:o?.label||''};}

export function getCurrentRaceEvent(){const state=loadState();if(state.index>=EVENT_DEFS.length)return {finished:true,index:state.index,total:EVENT_DEFS.length};const event=localizeEvent(EVENT_DEFS[state.index]),now=snapshotRaceEventStats(),delta=deltaStats(now,state.baseline);return {finished:false,index:state.index,total:EVENT_DEFS.length,event,progress:evaluateObjective(event.objective,delta)};}

export function claimCurrentRaceEvent(){
  const state=loadState();if(state.index>=EVENT_DEFS.length)return {ok:false,reason:'finished'};
  const event=localizeEvent(EVENT_DEFS[state.index]),now=snapshotRaceEventStats(),progress=evaluateObjective(event.objective,deltaStats(now,state.baseline));
  if(!progress.complete)return {ok:false,reason:'incomplete'};if((state.claimed||[]).includes(event.id))return {ok:false,reason:'claimed'};
  const garage=loadGarage();garage.coins=Math.max(0,Number(garage.coins)||0)+Math.max(0,Number(event.reward?.coins)||0);
  for(const [id,n] of Object.entries(event.reward?.items||{})){const amount=Math.max(0,Math.floor(Number(n)||0));if(amount)addItem(garage,id,amount);}saveGarage(garage);
  state.claimed=[...(state.claimed||[]),event.id];state.index+=1;state.baseline=normalizedBaseline(now);saveState(state);return {ok:true,event,nextIndex:state.index};
}

export function raceEventRewardLabel(reward){const parts=[],coins=Math.max(0,Number(reward?.coins)||0);if(coins)parts.push(`${coins} ${t('events.coins')}`);const items=Object.entries(reward?.items||{}).filter(([,n])=>Number(n)>0);for(const [id,n] of items.slice(0,2))parts.push(`${t(`items.${id}`)} ×${Number(n)}`);if(items.length>2)parts.push(`+${items.length-2} ${t('events.more')}`);return parts.join(' · ');}

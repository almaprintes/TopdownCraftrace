import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';
import { t, getLanguage } from '../i18n/index.js';
import { loadSeasonTelemetry } from '../seasons/seasonTelemetry.js';
import { loadCleanLapTelemetry } from '../seasons/cleanLapTelemetry.js';
import { unlockCar } from '../cars/carUnlocks.js';

const STATE_KEY='tdr2:seasonInduction:v1';
const HIST_PREFIX='tdr2:ttHist:';

const EVENT_DEFS=[
  {id:'first-drive',titleKey:'induction.firstDrive.title',descriptionKey:'induction.firstDrive.desc',objective:{type:'laps',target:1,labelKey:'induction.label.lap'},reward:{coins:250}},
  {id:'garage-visit',titleKey:'induction.garageVisit.title',descriptionKey:'induction.garageVisit.desc',objective:{type:'garageVisits',target:1,labelKey:'induction.label.visit'},reward:{items:{scrap:8}}},
  {id:'material-start',titleKey:'induction.materialStart.title',descriptionKey:'induction.materialStart.desc',objective:{type:'lootDraws',target:8,labelKey:'induction.label.lootDrops'},reward:{coins:400}},
  {id:'first-craft',titleKey:'induction.firstCraft.title',descriptionKey:'induction.firstCraft.desc',objective:{type:'discoveries',target:1,absolute:true,labelKey:'induction.label.part'},reward:{items:{rubber:6}}},
  {id:'equip-part',titleKey:'induction.equipPart.title',descriptionKey:'induction.equipPart.desc',objective:{type:'equipped',target:1,absolute:true,labelKey:'induction.label.equipped'},reward:{coins:600}},
  {id:'clean-start',titleKey:'induction.cleanStart.title',descriptionKey:'induction.cleanStart.desc',objective:{type:'clean',target:2,labelKey:'induction.label.cleanLaps'},reward:{items:{gear:4}}},
  {id:'store-buy',titleKey:'induction.storeBuy.title',descriptionKey:'induction.storeBuy.desc',objective:{type:'storeBuys',target:1,labelKey:'induction.label.purchase'},reward:{coins:800}},
  {id:'track-tour',titleKey:'induction.trackTour.title',descriptionKey:'induction.trackTour.desc',objective:{type:'tracks',target:2,minPerTrack:1,labelKey:'induction.label.tracks'},reward:{items:{alloy:4}}},
  {id:'mode-tour',titleKey:'induction.modeTour.title',descriptionKey:'induction.modeTour.desc',objective:{type:'modeStarts',target:1,labelKey:'induction.label.mode'},reward:{coins:1000}},
  {id:'material-hunt',titleKey:'induction.materialHunt.title',descriptionKey:'induction.materialHunt.desc',objective:{type:'lootDraws',target:20,labelKey:'induction.label.lootDrops'},reward:{items:{disc:4}}},
  {id:'clean-rhythm',titleKey:'induction.cleanRhythm.title',descriptionKey:'induction.cleanRhythm.desc',objective:{type:'clean',target:5,labelKey:'induction.label.cleanLaps'},reward:{coins:1250}},
  {id:'distance-run',titleKey:'induction.distanceRun.title',descriptionKey:'induction.distanceRun.desc',objective:{type:'laps',target:10,labelKey:'induction.label.laps'},reward:{items:{compound:4}}},
  {id:'explorer',titleKey:'induction.explorer.title',descriptionKey:'induction.explorer.desc',objective:{type:'tracks',target:3,minPerTrack:2,labelKey:'induction.label.tracks'},reward:{items:{ecu:1}}},
  {id:'induction-final',titleKey:'induction.final.title',descriptionKey:'induction.final.desc',objective:{type:'combined',target:3,labelKey:'induction.label.objectives',parts:[{type:'laps',target:5},{type:'clean',target:3},{type:'tracks',target:2,minPerTrack:1}]},reward:{car:{id:'avenir_gripline',nameKey:'induction.reward.avenirGripline',image:'assets/season/reward_cards/avenir_gripline_reward_top_down_race.webp'}}}
];

function localizeEvent(def){return {...def,title:t(def.titleKey),description:t(def.descriptionKey),objective:{...def.objective,label:t(def.objective?.labelKey||'induction.label.progress')}};}
export const RACE_EVENTS=EVENT_DEFS;
function readHistory(key){try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(parsed?.history)?parsed.history:[];}catch{return [];}}
function equippedCount(garage){const ids=[];for(const id of Object.values(garage?.equipped||{}))if(id)ids.push(id);for(const set of Object.values(garage?.equippedByCar||{}))for(const id of Object.values(set||{}))if(id)ids.push(id);return ids.length;}

export function snapshotRaceEventStats(){
  const out={laps:0,clean:0,trackLaps:{},garageVisits:0,storeBuys:0,modeStarts:0,lootDraws:0,discoveries:0,equipped:0};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.startsWith(HIST_PREFIX))continue;
      const trackId=key.slice(HIST_PREFIX.length)||key,hist=readHistory(key);let valid=0;
      for(const rec of hist){const ms=Number(rec?.lapMs??rec?.ms??rec?.time);if(!Number.isFinite(ms)||ms<=0)continue;valid++;out.laps++;}
      out.trackLaps[trackId]=(out.trackLaps[trackId]||0)+valid;
    }
    out.clean=Math.max(0,Number(loadCleanLapTelemetry()?.total)||0);
    const telemetry=loadSeasonTelemetry();out.garageVisits=Math.max(0,Number(telemetry.garageVisits)||0);out.storeBuys=Math.max(0,Number(telemetry.storeBuys)||0);out.modeStarts=Math.max(0,Number(telemetry.modeStarts)||0);
    const garage=loadGarage();out.lootDraws=Math.max(0,Number(garage?.lootBalance?.draws)||0);out.discoveries=Array.isArray(garage?.discoveries)?garage.discoveries.length:0;out.equipped=equippedCount(garage);
  }catch{}
  return out;
}

function normalizedBaseline(s){return {laps:Number(s?.laps||0),clean:Number(s?.clean||0),trackLaps:{...(s?.trackLaps||{})},garageVisits:Number(s?.garageVisits||0),storeBuys:Number(s?.storeBuys||0),modeStarts:Number(s?.modeStarts||0),lootDraws:Number(s?.lootDraws||0),discoveries:Number(s?.discoveries||0),equipped:Number(s?.equipped||0)};}
function loadState(){try{const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(raw&&Number.isInteger(raw.index)&&raw.baseline)return raw;}catch{}const fresh={index:0,baseline:normalizedBaseline(snapshotRaceEventStats()),claimed:[]};try{localStorage.setItem(STATE_KEY,JSON.stringify(fresh));}catch{}return fresh;}
function saveState(state){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}return state;}
function deltaStats(now,base){const trackLaps={},keys=new Set([...Object.keys(now?.trackLaps||{}),...Object.keys(base?.trackLaps||{})]);for(const key of keys)trackLaps[key]=Math.max(0,Number(now?.trackLaps?.[key]||0)-Number(base?.trackLaps?.[key]||0));return {laps:Math.max(0,now.laps-base.laps),clean:Math.max(0,now.clean-base.clean),trackLaps,garageVisits:Math.max(0,now.garageVisits-base.garageVisits),storeBuys:Math.max(0,now.storeBuys-base.storeBuys),modeStarts:Math.max(0,now.modeStarts-base.modeStarts),lootDraws:Math.max(0,now.lootDraws-base.lootDraws),absolute:{discoveries:now.discoveries,equipped:now.equipped}};}
function rawObjectiveValue(o,d){if(o.type==='clean')return d.clean;if(o.type==='tracks'){const min=Math.max(1,Number(o.minPerTrack)||1);return Object.values(d.trackLaps||{}).filter(n=>Number(n)>=min).length;}if(o.type==='discoveries'||o.type==='equipped')return Number(d.absolute?.[o.type]||0);if(o.type==='combined')return (o.parts||[]).filter(p=>rawObjectiveValue(p,d)>=Math.max(1,Number(p.target)||1)).length;if(Object.prototype.hasOwnProperty.call(d,o.type))return Number(d[o.type]||0);return d.laps;}
function evaluateObjective(o,d){const target=Math.max(1,Number(o?.target)||1),value=Math.max(0,rawObjectiveValue(o,d));return {value:Math.min(target,value),rawValue:value,target,complete:value>=target,label:o?.label||''};}
export function getCurrentRaceEvent(){const state=loadState();if(state.index>=EVENT_DEFS.length)return {finished:true,index:state.index,total:EVENT_DEFS.length};const event=localizeEvent(EVENT_DEFS[state.index]),now=snapshotRaceEventStats(),delta=deltaStats(now,state.baseline);return {finished:false,index:state.index,total:EVENT_DEFS.length,event,progress:evaluateObjective(event.objective,delta)};}
export function claimCurrentRaceEvent(){const state=loadState();if(state.index>=EVENT_DEFS.length)return {ok:false,reason:'finished'};const event=localizeEvent(EVENT_DEFS[state.index]),now=snapshotRaceEventStats(),progress=evaluateObjective(event.objective,deltaStats(now,state.baseline));if(!progress.complete)return {ok:false,reason:'incomplete'};if((state.claimed||[]).includes(event.id))return {ok:false,reason:'claimed'};const garage=loadGarage();garage.coins=Math.max(0,Number(garage.coins)||0)+Math.max(0,Number(event.reward?.coins)||0);for(const [id,n] of Object.entries(event.reward?.items||{})){const amount=Math.max(0,Math.floor(Number(n)||0));if(amount)addItem(garage,id,amount);}if(event.reward?.car?.id)unlockCar(event.reward.car.id);saveGarage(garage);state.claimed=[...(state.claimed||[]),event.id];state.index+=1;state.baseline=normalizedBaseline(now);saveState(state);const result={ok:true,event,nextIndex:state.index};try{window.dispatchEvent(new CustomEvent('tdr:seasonRewardClaimed',{detail:{event,nextIndex:state.index}}));}catch{}return result;}
export function raceEventRewardLabel(reward){if(reward?.car?.id)return String(reward.car?.nameKey?t(reward.car.nameKey):reward.car.id);const parts=[],coins=Math.max(0,Number(reward?.coins)||0);if(coins)parts.push(`${coins} ${t('events.coins')}`);const items=Object.entries(reward?.items||{}).filter(([,n])=>Number(n)>0);for(const [id,n] of items)parts.push(`${t(`items.${id}`)} ×${Number(n)}`);return parts.join(' · ');}

// DEV 1.1.107: induction copy is resolved exclusively through i18n keys.

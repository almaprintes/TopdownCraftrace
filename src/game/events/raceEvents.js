import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';
import { t, getLanguage } from '../i18n/index.js';
import { loadSeasonTelemetry } from '../seasons/seasonTelemetry.js';
import { loadCleanLapTelemetry } from '../seasons/cleanLapTelemetry.js';
import {syncCleanLapMissionObjectives,getCleanLapMissionProgress} from '../seasons/cleanLapMissionTelemetry.js';
import { unlockCar, isCarUnlocked } from '../cars/carUnlocks.js';
import {attachSeasonClaimReceipt,reconcileSeasonClaimState,seasonClaimReceipt,isStorageQuotaError,reclaimReplaceableSeasonCaches} from './seasonClaimPersistence.js';
import { grantSeasonSkin } from '../skins/carSkins.js';
import { carMileageKm,loadPlayerStatsPersisted } from '../stats/playerStats.js';
import { CUPER_EVENT_DEFS,CUPER_MILEAGE_GATE_METERS,CUPER_STATE_KEY } from '../seasons/cuperCampaign.js';

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

function localizeEvent(def){const lang=getLanguage()==='en'?'en':'es';return {...def,
 title:def.titleKey?t(def.titleKey):def.title?.[lang]||def.title?.es||def.id,
 description:def.descriptionKey?t(def.descriptionKey):def.description?.[lang]||def.description?.es||'',
 objective:{...def.objective,label:def.objective?.labelKey?t(def.objective.labelKey):def.objective?.label?.[lang]||def.objective?.label?.es||''}};}
export const RACE_EVENTS=EVENT_DEFS;
function readHistory(key){try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(parsed?.history)?parsed.history:[];}catch{return [];}}
function equippedCount(garage){const ids=[];for(const id of Object.values(garage?.equipped||{}))if(id)ids.push(id);for(const set of Object.values(garage?.equippedByCar||{}))for(const id of Object.values(set||{}))if(id)ids.push(id);return ids.length;}

export function snapshotRaceEventStats(){
  const out={laps:0,clean:0,trackLaps:{},garageVisits:0,storeBuys:0,modeStarts:0,lootDraws:0,discoveries:0,equipped:0,ghostStarts:0,recyclerOperations:0,onlinePublishedCuper:0,cuperMeters:0,cuperRallyMeters:0,cuperTrackMeters:{},cuperEquipped:0};
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!key||!key.startsWith(HIST_PREFIX))continue;
      const trackId=key.slice(HIST_PREFIX.length)||key,hist=readHistory(key);let valid=0;
      for(const rec of hist){const ms=Number(rec?.lapMs??rec?.ms??rec?.time);if(!Number.isFinite(ms)||ms<=0)continue;valid++;out.laps++;}
      out.trackLaps[trackId]=(out.trackLaps[trackId]||0)+valid;
    }
    out.clean=Math.max(0,Number(loadCleanLapTelemetry()?.total)||0);
    const telemetry=loadSeasonTelemetry();out.garageVisits=Math.max(0,Number(telemetry.garageVisits)||0);out.storeBuys=Math.max(0,Number(telemetry.storeBuys)||0);out.modeStarts=Math.max(0,Number(telemetry.modeStarts)||0);
    out.ghostStarts=Math.max(0,Number(telemetry.modeCounts?.ghost)||0);
    out.recyclerOperations=Math.max(0,Number(telemetry.recyclerOperations)||0);
    out.onlinePublishedCuper=Math.max(0,Number(telemetry.onlinePublishedCuper)||0);
    const cuper=loadPlayerStatsPersisted()?.cars?.crown_cuper||{};
    out.cuperMeters=Math.max(0,Number(cuper.meters)||0);
    out.cuperRallyMeters=Math.max(0,Number(cuper.tracks?.['rally-arafo-los-loros']?.meters)||0);
    out.cuperTrackMeters=Object.fromEntries(Object.entries(cuper.tracks||{}).map(([id,row])=>[id,Math.max(0,Number(row.meters)||0)]));
    const garage=loadGarage();out.lootDraws=Math.max(0,Number(garage?.lootBalance?.draws)||0);out.discoveries=Array.isArray(garage?.discoveries)?garage.discoveries.length:0;out.equipped=equippedCount(garage);
    out.cuperEquipped=Object.values(garage?.equippedByCar?.crown_cuper||{}).filter(Boolean).length;
  }catch{}
  return out;
}


function normalizedBaseline(s){return {laps:Number(s?.laps||0),clean:Number(s?.clean||0),trackLaps:{...(s?.trackLaps||{})},
 garageVisits:Number(s?.garageVisits||0),storeBuys:Number(s?.storeBuys||0),modeStarts:Number(s?.modeStarts||0),
 lootDraws:Number(s?.lootDraws||0),discoveries:Number(s?.discoveries||0),equipped:Number(s?.equipped||0),
 ghostStarts:Number(s?.ghostStarts||0),recyclerOperations:Number(s?.recyclerOperations||0),
 onlinePublishedCuper:Number(s?.onlinePublishedCuper||0),cuperMeters:Number(s?.cuperMeters||0),
 cuperRallyMeters:Number(s?.cuperRallyMeters||0),cuperTrackMeters:{...(s?.cuperTrackMeters||{})},cuperEquipped:Number(s?.cuperEquipped||0)};}
function loadState(key){
 let state=null;
 try{const v=JSON.parse(localStorage.getItem(key)||'null');
   if(Number.isInteger(v?.index)&&v?.baseline)state=v;
 }catch{}
 if(!state){
   state={index:0,baseline:normalizedBaseline(snapshotRaceEventStats()),claimed:[]};
   try{localStorage.setItem(key,JSON.stringify(state));}catch{}
 }
 // The authoritative claim receipt shares the exact same atomic garage write
 // as the reward. This repairs users stuck on 9/14 after a failed season write.
 const family=key===CUPER_STATE_KEY?'cuper':'induction';
 const definitions=family==='cuper'?CUPER_EVENT_DEFS:EVENT_DEFS;
 return reconcileSeasonClaimState(state,loadGarage(),family,definitions);
}
function saveState(key,v){
 try{const raw=JSON.stringify(v);localStorage.setItem(key,raw);
   return localStorage.getItem(key)===raw;
 }catch{return false;}
}
function deltaMap(n,b){const o={},ids=new Set([...Object.keys(n||{}),...Object.keys(b||{})]);for(const id of ids)o[id]=Math.max(0,Number(n?.[id]||0)-Number(b?.[id]||0));return o;}
function deltaStats(now,base){return{
 laps:Math.max(0,now.laps-base.laps),clean:Math.max(0,now.clean-base.clean),trackLaps:deltaMap(now.trackLaps,base.trackLaps),
 garageVisits:Math.max(0,now.garageVisits-base.garageVisits),storeBuys:Math.max(0,now.storeBuys-base.storeBuys),
 modeStarts:Math.max(0,now.modeStarts-base.modeStarts),lootDraws:Math.max(0,now.lootDraws-base.lootDraws),
 newDiscoveries:Math.max(0,now.discoveries-(base.discoveries||0)),
 ghostStarts:Math.max(0,now.ghostStarts-(base.ghostStarts||0)),
 recyclerOperations:Math.max(0,now.recyclerOperations-(base.recyclerOperations||0)),
 onlinePublishedCuper:Math.max(0,now.onlinePublishedCuper-(base.onlinePublishedCuper||0)),
 cuperMeters:Math.max(0,now.cuperMeters),cuperRallyMeters:Math.max(0,now.cuperRallyMeters),
 cuperTrackMeters:deltaMap(now.cuperTrackMeters,base.cuperTrackMeters),
 cuperEquipped:Math.max(0,now.cuperEquipped),
 absolute:{discoveries:now.discoveries,equipped:now.equipped}
};}
function rawObjectiveValue(o,d,missionId='',path='root'){
 if(o.type==='cleanLaps')return getCleanLapMissionProgress(missionId,path).value;
 if(o.type==='clean')return d.clean;
 if(o.type==='tracks')return Object.values(d.trackLaps||{}).filter(n=>n>=Math.max(1,Number(o.minPerTrack)||1)).length;
 if(o.type==='cuperTracks')return Object.values(d.cuperTrackMeters||{}).filter(n=>n>0).length;
 if(o.type==='discoveries'||o.type==='equipped')return Number(d.absolute?.[o.type]||0);
 if(o.type==='combined')return (o.parts||[]).filter((p,i)=>rawObjectiveValue(p,d,missionId,path+'.'+i)>=Number(p.target||1)).length;
 return Number(d[o.type]||0);
}
function evaluateObjective(o,d,missionId=''){const target=Math.max(1,Number(o.target)||1),value=Math.max(0,rawObjectiveValue(o,d,missionId));return {value:Math.min(target,value),rawValue:value,target,complete:value>=target,label:o.label||''};}
export function getCurrentRaceEvent(){
 const induction=loadState(STATE_KEY);
 if(induction.index<EVENT_DEFS.length){
 const event=localizeEvent(EVENT_DEFS[induction.index]),missionId='induction:'+event.id;
 syncCleanLapMissionObjectives(missionId,event.objective);
 return {family:'induction',finished:false,index:induction.index,total:EVENT_DEFS.length,event,definitions:EVENT_DEFS,
  progress:evaluateObjective(event.objective,deltaStats(snapshotRaceEventStats(),induction.baseline),missionId)};
}
 const mileageMeters=carMileageKm('avenir_gripline')*1000;
 if(mileageMeters<CUPER_MILEAGE_GATE_METERS){syncCleanLapMissionObjectives(null,null);
 return {family:'cuper',gated:true,finished:false,index:0,total:CUPER_EVENT_DEFS.length,
 definitions:CUPER_EVENT_DEFS,mileageMeters,requiredMeters:CUPER_MILEAGE_GATE_METERS};}
 const state=loadState(CUPER_STATE_KEY);
 if(state.index>=CUPER_EVENT_DEFS.length){syncCleanLapMissionObjectives(null,null);
 return {family:'cuper',finished:true,index:state.index,total:CUPER_EVENT_DEFS.length,
 definitions:CUPER_EVENT_DEFS,mileageMeters:carMileageKm('crown_cuper')*1000,requiredMeters:CUPER_MILEAGE_GATE_METERS};}
 const event=localizeEvent(CUPER_EVENT_DEFS[state.index]),missionId='cuper:'+event.id;
 syncCleanLapMissionObjectives(missionId,event.objective);
 return {family:'cuper',finished:false,index:state.index,total:CUPER_EVENT_DEFS.length,
 event,definitions:CUPER_EVENT_DEFS,
 progress:evaluateObjective(event.objective,deltaStats(snapshotRaceEventStats(),state.baseline),missionId)};
}
export function claimCurrentRaceEvent(){
 const current=getCurrentRaceEvent();if(current.finished||current.gated)return {ok:false,reason:current.gated?'mileage-locked':'finished'};
 const key=current.family==='cuper'?CUPER_STATE_KEY:STATE_KEY,defs=current.family==='cuper'?CUPER_EVENT_DEFS:EVENT_DEFS;
 const state=loadState(key);if(state.index>=defs.length)return {ok:false,reason:'finished'};
 const event=localizeEvent(defs[state.index]),now=snapshotRaceEventStats(),
 progress=evaluateObjective(event.objective,deltaStats(now,state.baseline),current.family+':'+event.id);
 if(!progress.complete)return {ok:false,reason:'incomplete'};
 if((state.claimed||[]).includes(event.id))return {ok:false,reason:'claimed'};
 // A receipt and its reward are written together in the GARAGE key. Never
 // award materials first and then silently lose the season index on iOS.
 const garage=loadGarage();
 const nextState={...state,index:state.index+1,
   claimed:[...(state.claimed||[]),event.id],baseline:normalizedBaseline(now)};
 garage.coins=Math.max(0,Number(garage.coins)||0)+Math.max(0,Number(event.reward?.coins)||0);
 for(const [id,n] of Object.entries(event.reward?.items||{})){const count=Math.max(0,Math.floor(Number(n)||0));if(count)addItem(garage,id,count);}
 attachSeasonClaimReceipt(garage,current.family,event.id,nextState);
 // Non-repeatable unlocks must be persisted and checked BEFORE the receipt.
 if(event.reward?.car?.id){
   unlockCar(event.reward.car.id);
   if(!isCarUnlocked(event.reward.car.id))return {ok:false,reason:'storage-unavailable'};
 }
 if(event.reward?.skin&&!grantSeasonSkin(event.reward.skin.carId,event.reward.skin.skinId))
   return {ok:false,reason:'storage-unavailable'};
 let saved=false,storageFailure=null;
 for(let attempt=0;attempt<2&&!saved;attempt++){
   try{
     saveGarage(garage);
     const receipt=seasonClaimReceipt(loadGarage(),current.family);
     saved=receipt?.index===nextState.index&&receipt?.eventId===event.id;
   }catch(error){
     storageFailure=error;
     // Make room only by releasing cheap downloadable/rebuildable caches.
     // NEVER discard ghosts or player progress to make a claim work.
     if(attempt!==0||!isStorageQuotaError(error)||
        !reclaimReplaceableSeasonCaches())break;
   }
 }
 if(!saved){
   console.warn('[season] reward NOT confirmed in storage; no claim',storageFailure);
   return {ok:false,reason:'storage-unavailable'};
 }
 // This key is a convenience view. If its write fails, the durable receipt
 // still advances the season, survives reload and forbids a duplicate grant.
 const stateSaved=saveState(key,nextState);
 const recovered=loadState(key);
 if(recovered.index!==nextState.index)return {ok:false,reason:'storage-unavailable'};
 // Immediately activate the next stage before the player races again.
 const next=defs[nextState.index];
 syncCleanLapMissionObjectives(next?current.family+':'+next.id:null,next?.objective);
 const result={ok:true,event,nextIndex:nextState.index,family:current.family,
   recoveredFromReceipt:!stateSaved};
 try{window.dispatchEvent(new CustomEvent('tdr:seasonRewardClaimed',{detail:result}));}catch{}
 return result;
}
export function raceEventRewardLabel(reward){if(reward?.car?.id)return String(reward.car?.nameKey?t(reward.car.nameKey):reward.car.name?.[getLanguage()==='en'?'en':'es']||reward.car.id);
 if(reward?.skin)return reward.skin.name?.[getLanguage()==='en'?'en':'es']||'Gold skin';const parts=[],coins=Math.max(0,Number(reward?.coins)||0);if(coins)parts.push(`${coins} ${t('events.coins')}`);const items=Object.entries(reward?.items||{}).filter(([,n])=>Number(n)>0);for(const [id,n] of items)parts.push(`${t(`items.${id}`)} ×${Number(n)}`);return parts.join(' · ');}

// DEV 1.1.107: induction copy is resolved exclusively through i18n keys.

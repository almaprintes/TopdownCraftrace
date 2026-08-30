import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST, findRecipe, findStripRecipe, statDeltaForPart, tuningForPart } from './partsCatalog.js';
const KEY='tdr2:garageFusion:v1';
const STARTER={};
const EMPTY_LOOT_COUNTS={scrap:0,alloy:0,rubber:0,disc:0,spring:0,gear:0,compound:0,ecu:0};
const EMPTY_TIME_CREDIT={baseMs:0,bonusMs:0,chestMs:0};
const DEFAULT={inventory:{},equipped:{},equippedByCar:{},discoveries:[],coins:250,lastReward:null,rewardedToday:0,rewardedDay:'',lootPityEcu:0,lootBalance:{draws:0,counts:{...EMPTY_LOOT_COUNTS}},lootTimeCredit:{...EMPTY_TIME_CREDIT}};
function selectedCarId(){try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return'stock';}}
export function loadGarage(){try{const raw=localStorage.getItem(KEY);if(!raw)return structuredClone(DEFAULT);const x=JSON.parse(raw)||{};return{...structuredClone(DEFAULT),...x,inventory:{...STARTER,...(x.inventory||{})},equipped:{...(x.equipped||{})},equippedByCar:{...(x.equippedByCar||{})},lootBalance:{draws:Number(x?.lootBalance?.draws||0),counts:{...EMPTY_LOOT_COUNTS,...(x?.lootBalance?.counts||{})}},lootTimeCredit:{baseMs:Math.max(0,Number(x?.lootTimeCredit?.baseMs||0)),bonusMs:Math.max(0,Number(x?.lootTimeCredit?.bonusMs||0)),chestMs:Math.max(0,Number(x?.lootTimeCredit?.chestMs||0))}};}catch{return structuredClone(DEFAULT);}}
export function saveGarage(s){localStorage.setItem(KEY,JSON.stringify(s));return s;}
export function qty(s,id){return Number(s.inventory?.[id]||0);}
export function addItem(s,id,n=1){s.inventory[id]=(s.inventory[id]||0)+n;return s;}
export function consume(s,id,n=1){if(qty(s,id)<n)return false;s.inventory[id]-=n;return true;}
export function craft(s,a,b){const r=findRecipe(a,b);if(!r)return{ok:false,reason:'Sin receta'};if(a===b){if(qty(s,a)<2)return{ok:false,reason:'Faltan piezas'};consume(s,a,2);}else{if(qty(s,a)<1||qty(s,b)<1)return{ok:false,reason:'Faltan materiales'};consume(s,a);consume(s,b);}addItem(s,r.out,1);if(!s.discoveries.includes(r.out))s.discoveries.push(r.out);saveGarage(s);return{ok:true,item:GARAGE_ITEMS[r.out]};}
export function craftStrip(s,ids){const r=findStripRecipe(ids);if(!r)return{ok:false,reason:'Combinación no válida'};const need={};for(const id of ids)need[id]=(need[id]||0)+1;for(const[id,n]of Object.entries(need))if(qty(s,id)<n)return{ok:false,reason:`Falta ${GARAGE_ITEMS[id]?.name||id}`};for(const[id,n]of Object.entries(need))consume(s,id,n);addItem(s,r.out,1);if(!s.discoveries.includes(r.out))s.discoveries.push(r.out);saveGarage(s);return{ok:true,item:GARAGE_ITEMS[r.out]};}
export function evolve(s,id){const next=EVOLUTION_CHAIN[id];if(!next)return{ok:false,reason:'Nivel máximo'};if(qty(s,id)<EVOLUTION_COST)return{ok:false,reason:`Necesitas ${EVOLUTION_COST}`};consume(s,id,EVOLUTION_COST);addItem(s,next,1);if(!s.discoveries.includes(next))s.discoveries.push(next);saveGarage(s);return{ok:true,item:GARAGE_ITEMS[next]};}
export function getEquippedForCar(s,carId=selectedCarId()){const own=s?.equippedByCar?.[carId];if(own&&typeof own==='object')return own;return s?.equipped||{};}
export function equip(s,id,carId=selectedCarId()){const item=GARAGE_ITEMS[id];if(!item?.family||qty(s,id)<1)return false;if(!s.equippedByCar||typeof s.equippedByCar!=='object')s.equippedByCar={};if(!s.equippedByCar[carId])s.equippedByCar[carId]={...getEquippedForCar(s,carId)};s.equippedByCar[carId][item.family]=id;saveGarage(s);return true;}
export function garageTuning(s,carId=selectedCarId()){const out={accelMult:1,brakeMult:1,dragMult:1,turnRateMult:1,maxFwdAdd:0,maxRevAdd:0,turnMinAdd:0,gripCoastAdd:0,gripDriveAdd:0,gripBrakeAdd:0};for(const id of Object.values(getEquippedForCar(s,carId)||{})){const t=tuningForPart(GARAGE_ITEMS[id]);for(const[k,v]of Object.entries(t)){if(k.endsWith('Mult'))out[k]*=v;else out[k]+=v;}}return out;}
const clamp99=n=>Math.max(1,Math.min(99,Math.round(n)));
const STOCK_DISPLAY_SCALE=.75;
const stockDisplay=n=>clamp99(Number(n||0)*STOCK_DISPLAY_SCALE);
function baseDisplayStats(spec){if(spec?.designStats){const d=spec.designStats;return{speed:stockDisplay(d.VEL??55),accel:stockDisplay(d.ACC??55),grip:stockDisplay(((d.EST??55)+(d.GIR??55))/2),control:stockDisplay(((d.GIR??55)+(d.FRN??55))/2)};}return{speed:stockDisplay(((Number(spec?.maxFwd)||520)-400)/3.2+45),accel:stockDisplay(((Number(spec?.accel)||650)-500)/5+45),grip:stockDisplay(((Number(spec?.gripCoast)||.23)-.16)*260+50),control:stockDisplay(((Number(spec?.turnRate)||3.4)-2.7)*28+50)};}
export function garageDisplayStats(spec,s,carId=selectedCarId(),replacementPartId=null){const out=baseDisplayStats(spec),eq={...(getEquippedForCar(s,carId)||{})},replacement=GARAGE_ITEMS[replacementPartId];if(replacement?.kind==='part'&&replacement.family)eq[replacement.family]=replacement.id;for(const id of Object.values(eq)){const d=statDeltaForPart(GARAGE_ITEMS[id]);out.speed+=d.speed;out.accel+=d.accel;out.grip+=d.grip;out.control+=d.control;}return{speed:clamp99(out.speed),accel:clamp99(out.accel),grip:clamp99(out.grip),control:clamp99(out.control)};}

export const MATERIAL_DROP_TARGETS={scrap:.38,alloy:.10,rubber:.10,disc:.10,spring:.10,gear:.10,compound:.08,ecu:.04};
const MATERIAL_IDS=Object.keys(MATERIAL_DROP_TARGETS);
const BASE_ROLL_MS=36000;
const BONUS_ROLL_MS=120000;
const MAX_CREDIT_LAP_MS=90000;
const CHEST_LAPS=5;
let LOOT_SESSION={trackKey:null,laps:0,totals:{},ecuDrops:0,chests:0,bonusLaps:0};
export function resetRaceLootSession(trackKey=null){LOOT_SESSION={trackKey:trackKey||null,laps:0,totals:{},ecuDrops:0,chests:0,bonusLaps:0};}
export function getRaceLootSessionSummary(){return{trackKey:LOOT_SESSION.trackKey,laps:Number(LOOT_SESSION.laps||0),totals:{...(LOOT_SESSION.totals||{})},ecuDrops:Number(LOOT_SESSION.ecuDrops||0),chests:Number(LOOT_SESSION.chests||0),bonusLaps:Number(LOOT_SESSION.bonusLaps||0)};}
function stackSize(id){if(id==='scrap')return 2+Math.floor(Math.random()*3);if(id==='compound')return 1+Math.floor(Math.random()*2);if(id==='ecu')return 1;return 1+Math.floor(Math.random()*3);}
function adaptiveMaterialRoll(s){if(!s.lootBalance||typeof s.lootBalance!=='object')s.lootBalance={draws:0,counts:{...EMPTY_LOOT_COUNTS}};if(!s.lootBalance.counts||typeof s.lootBalance.counts!=='object')s.lootBalance.counts={...EMPTY_LOOT_COUNTS};const draws=Math.max(0,Number(s.lootBalance.draws||0));let totalW=0;const weighted=[];for(const id of MATERIAL_IDS){const target=MATERIAL_DROP_TARGETS[id],actual=Math.max(0,Number(s.lootBalance.counts[id]||0)),expected=(draws+1)*target,deficit=(expected-actual)/Math.max(.5,expected),jitter=.9+Math.random()*.2,w=target*Math.exp(2*deficit)*jitter;weighted.push([id,w]);totalW+=w;}let r=Math.random()*totalW,id='scrap';for(const [candidate,w]of weighted){r-=w;if(r<=0){id=candidate;break;}}s.lootBalance.draws=draws+1;s.lootBalance.counts[id]=Math.max(0,Number(s.lootBalance.counts[id]||0))+1;return{id,qty:stackSize(id)};}
function readBestMs(key){try{const raw=localStorage.getItem(key);if(!raw)return null;const x=JSON.parse(raw),ms=Number(x?.lapMs);return Number.isFinite(ms)&&ms>0?ms:null;}catch{return null;}}
function validatedLootTimeMs(lapMs,carBestMs,circuitBestMs){const lap=Number(lapMs);if(!Number.isFinite(lap)||lap<=0)return 0;const refs=[Number(carBestMs),Number(circuitBestMs)].filter(v=>Number.isFinite(v)&&v>0);const ref=refs.length?Math.min(...refs):lap;return Math.max(0,Math.min(lap,ref*1.25,MAX_CREDIT_LAP_MS));}
function ensureTimeCredit(s){if(!s.lootTimeCredit||typeof s.lootTimeCredit!=='object')s.lootTimeCredit={...EMPTY_TIME_CREDIT};return s.lootTimeCredit;}
function consumePersistentCredit(credit,field,threshold,onRoll){let count=0;while(credit[field]>=threshold){credit[field]-=threshold;onRoll();count++;}return count;}
export function grantRaceLoot({trackKey='track01',lapMs=null}={}){
  const s=loadGarage(),reward={},add=(id,n=1)=>{reward[id]=(reward[id]||0)+n;},roll=(bucket=null)=>{const d=adaptiveMaterialRoll(s);add(d.id,d.qty);if(bucket)bucket[d.id]=(bucket[d.id]||0)+d.qty;return d;};
  if(LOOT_SESSION.trackKey!==trackKey)resetRaceLootSession(trackKey);LOOT_SESSION.laps+=1;const sessionLap=LOOT_SESSION.laps;
  const carId=selectedCarId(),lap=Number(lapMs),carBestMs=readBestMs(`tdr2:ttBestCar:${trackKey}:${carId}`),circuitBestMs=readBestMs(`tdr2:ttBest:${trackKey}`),carBest=Number.isFinite(lap)&&Number.isFinite(carBestMs)&&Math.abs(lap-carBestMs)<1,circuitRecord=Number.isFinite(lap)&&Number.isFinite(circuitBestMs)&&Math.abs(lap-circuitBestMs)<1,within110=Number.isFinite(lap)&&Number.isFinite(carBestMs)&&lap<=carBestMs*1.10;
  const creditedMs=validatedLootTimeMs(lap,carBestMs,circuitBestMs),credit=ensureTimeCredit(s);credit.baseMs+=creditedMs;credit.bonusMs+=creditedMs;
  // Normal material income remains time-normalized, but the named session chest is
  // intentionally lap-based because the player-facing contract says "Cofre de 5 vueltas".
  // This keeps short circuits honest in the normal economy without making the chest lie.
  const baseRolls=consumePersistentCredit(credit,'baseMs',BASE_ROLL_MS,()=>roll());
  const bonusRolls=consumePersistentCredit(credit,'bonusMs',BONUS_ROLL_MS,()=>roll());
  const chestLoot={};const chestCount=(sessionLap%CHEST_LAPS===0)?1:0;
  if(chestCount){roll(chestLoot);roll(chestLoot);}
  const chest=chestCount>0,bonusCommon=bonusRolls>0;
  for(const[id,n]of Object.entries(reward)){addItem(s,id,n);LOOT_SESSION.totals[id]=(LOOT_SESSION.totals[id]||0)+Number(n||0);}const ecuDrop=Number(reward.ecu||0)>0;if(ecuDrop)LOOT_SESSION.ecuDrops+=Number(reward.ecu||0);if(chest)LOOT_SESSION.chests+=chestCount;if(bonusCommon)LOOT_SESSION.bonusLaps+=bonusRolls;
  const meta={trackKey,lapMs:lap,creditedMs,sessionLap,chest,chestCount,chestLoot,baseRolls,bonusRolls,bonusCommon,within110,carBest,circuitRecord,ecuDrop,adaptive:true,timeNormalized:true,chestEveryLaps:CHEST_LAPS,creditCarry:true,rollRatePerHour:150,label:circuitRecord?'RÉCORD DEL CIRCUITO':carBest?'MEJOR VUELTA':within110?'VUELTA RÁPIDA':'VUELTA VÁLIDA'};
  s.lastReward={...reward,t:Date.now(),trackKey,lapMs:lap,doubled:false,meta};saveGarage(s);Object.defineProperty(reward,'meta',{value:meta,enumerable:false,configurable:true});return reward;
}
export function grantRaceReward(mult=1){const s=loadGarage(),reward={scrap:2*mult,alloy:1*mult,rubber:1*mult};for(const[id,n]of Object.entries(reward))addItem(s,id,n);s.lastReward={...reward,t:Date.now(),doubled:mult>1};saveGarage(s);return reward;}
export function duplicateLastReward(){const s=loadGarage(),r=s.lastReward;if(!r||r.doubled)return null;for(const[id,n]of Object.entries(r)){if(!GARAGE_ITEMS[id]||!Number.isFinite(Number(n))||Number(n)<=0)continue;addItem(s,id,Number(n));}s.lastReward={...r,doubled:true};saveGarage(s);return r;}

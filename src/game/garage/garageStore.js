import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST, findRecipe, findStripRecipe, statDeltaForPart, tuningForPart } from './partsCatalog.js';
const KEY='tdr2:garageFusion:v1';

const STARTER={ scrap:8, alloy:5, rubber:4, compound:4, disc:4, spring:3, gear:3, ecu:2 };
const DEFAULT={ inventory:{...STARTER}, equipped:{}, equippedByCar:{}, discoveries:[], coins:250, lastReward:null, rewardedToday:0, rewardedDay:'', lootPityEcu:0 };

function selectedCarId(){
  try { return localStorage.getItem('tdr2:carId') || 'stock'; } catch { return 'stock'; }
}

export function loadGarage(){
  try{
    const raw=localStorage.getItem(KEY); if(!raw) return structuredClone(DEFAULT);
    const x=JSON.parse(raw)||{};
    return {
      ...structuredClone(DEFAULT),
      ...x,
      inventory:{...STARTER,...(x.inventory||{})},
      equipped:{...(x.equipped||{})},
      equippedByCar:{...(x.equippedByCar||{})}
    };
  }catch{ return structuredClone(DEFAULT); }
}
export function saveGarage(s){ localStorage.setItem(KEY,JSON.stringify(s)); return s; }
export function qty(s,id){ return Number(s.inventory?.[id]||0); }
export function addItem(s,id,n=1){ s.inventory[id]=(s.inventory[id]||0)+n; return s; }
export function consume(s,id,n=1){ if(qty(s,id)<n) return false; s.inventory[id]-=n; return true; }

export function craft(s,a,b){
  const r=findRecipe(a,b); if(!r) return {ok:false,reason:'Sin receta'};
  if(a===b){ if(qty(s,a)<2) return {ok:false,reason:'Faltan piezas'}; consume(s,a,2); }
  else { if(qty(s,a)<1||qty(s,b)<1) return {ok:false,reason:'Faltan materiales'}; consume(s,a); consume(s,b); }
  addItem(s,r.out,1); if(!s.discoveries.includes(r.out)) s.discoveries.push(r.out); saveGarage(s);
  return {ok:true,item:GARAGE_ITEMS[r.out]};
}

export function craftStrip(s,ids){
  const r=findStripRecipe(ids); if(!r) return {ok:false,reason:'Combinación no válida'};
  const need={}; for(const id of ids) need[id]=(need[id]||0)+1;
  for(const [id,n] of Object.entries(need)) if(qty(s,id)<n) return {ok:false,reason:`Falta ${GARAGE_ITEMS[id]?.name||id}`};
  for(const [id,n] of Object.entries(need)) consume(s,id,n);
  addItem(s,r.out,1); if(!s.discoveries.includes(r.out)) s.discoveries.push(r.out); saveGarage(s);
  return {ok:true,item:GARAGE_ITEMS[r.out]};
}

export function evolve(s,id){
  const next=EVOLUTION_CHAIN[id]; if(!next) return {ok:false,reason:'Nivel máximo'};
  if(qty(s,id)<EVOLUTION_COST) return {ok:false,reason:`Necesitas ${EVOLUTION_COST}`};
  consume(s,id,EVOLUTION_COST); addItem(s,next,1); if(!s.discoveries.includes(next)) s.discoveries.push(next); saveGarage(s);
  return {ok:true,item:GARAGE_ITEMS[next]};
}

export function getEquippedForCar(s,carId=selectedCarId()){
  const own=s?.equippedByCar?.[carId];
  if(own && typeof own==='object') return own;
  return s?.equipped || {};
}

export function equip(s,id,carId=selectedCarId()){
  const item=GARAGE_ITEMS[id]; if(!item?.family || qty(s,id)<1) return false;
  if(!s.equippedByCar || typeof s.equippedByCar!=='object') s.equippedByCar={};
  if(!s.equippedByCar[carId]) s.equippedByCar[carId]={...getEquippedForCar(s,carId)};
  s.equippedByCar[carId][item.family]=id;
  saveGarage(s); return true;
}

export function garageTuning(s,carId=selectedCarId()){
  const out={ accelMult:1, brakeMult:1, dragMult:1, turnRateMult:1, maxFwdAdd:0, maxRevAdd:0, turnMinAdd:0, gripCoastAdd:0, gripDriveAdd:0, gripBrakeAdd:0 };
  for(const id of Object.values(getEquippedForCar(s,carId)||{})){
    const t=tuningForPart(GARAGE_ITEMS[id]);
    for(const [k,v] of Object.entries(t)){
      if(k.endsWith('Mult')) out[k] *= v;
      else out[k] += v;
    }
  }
  return out;
}

const clamp99=n=>Math.max(1,Math.min(99,Math.round(n)));
function baseDisplayStats(spec){
  if(spec?.designStats){
    const d=spec.designStats;
    return { speed:clamp99(d.VEL??55), accel:clamp99(d.ACC??55), grip:clamp99(((d.EST??55)+(d.GIR??55))/2), control:clamp99(((d.GIR??55)+(d.FRN??55))/2) };
  }
  return {
    speed:clamp99(((Number(spec?.maxFwd)||520)-400)/3.2+45),
    accel:clamp99(((Number(spec?.accel)||650)-500)/5+45),
    grip:clamp99(((Number(spec?.gripCoast)||.23)-.16)*260+50),
    control:clamp99(((Number(spec?.turnRate)||3.4)-2.7)*28+50)
  };
}

export function garageDisplayStats(spec,s,carId=selectedCarId(),replacementPartId=null){
  const out=baseDisplayStats(spec);
  const eq={...(getEquippedForCar(s,carId)||{})};
  const replacement=GARAGE_ITEMS[replacementPartId];
  if(replacement?.kind==='part'&&replacement.family) eq[replacement.family]=replacement.id;
  for(const id of Object.values(eq)){
    const d=statDeltaForPart(GARAGE_ITEMS[id]);
    out.speed+=d.speed; out.accel+=d.accel; out.grip+=d.grip; out.control+=d.control;
  }
  return {speed:clamp99(out.speed),accel:clamp99(out.accel),grip:clamp99(out.grip),control:clamp99(out.control)};
}

const COMMON_LOOT=['scrap','alloy','rubber','compound','disc','spring','gear'];
let LOOT_SESSION={trackKey:null,laps:0,totals:{},ecuDrops:0,chests:0,bonusLaps:0};

export function resetRaceLootSession(trackKey=null){
  LOOT_SESSION={trackKey:trackKey||null,laps:0,totals:{},ecuDrops:0,chests:0,bonusLaps:0};
}

export function getRaceLootSessionSummary(){
  return {
    trackKey:LOOT_SESSION.trackKey,
    laps:Number(LOOT_SESSION.laps||0),
    totals:{...(LOOT_SESSION.totals||{})},
    ecuDrops:Number(LOOT_SESSION.ecuDrops||0),
    chests:Number(LOOT_SESSION.chests||0),
    bonusLaps:Number(LOOT_SESSION.bonusLaps||0)
  };
}

function hashText(s){
  let h=2166136261>>>0;
  for(const ch of String(s||'track')){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619)>>>0; }
  return h>>>0;
}

function trackAffinity(trackKey){
  const h=hashText(trackKey);
  const start=h%COMMON_LOOT.length;
  const step=(h%3)+2;
  const out=[];
  for(let i=0;out.length<3&&i<20;i++){
    const id=COMMON_LOOT[(start+i*step)%COMMON_LOOT.length];
    if(!out.includes(id))out.push(id);
  }
  for(const id of COMMON_LOOT) if(out.length<3&&!out.includes(id))out.push(id);
  return out.slice(0,3);
}

function weightedCommon(affinity){
  const bag=[];
  for(const id of COMMON_LOOT){
    const w=affinity.includes(id)?2:1;
    for(let i=0;i<w;i++)bag.push(id);
  }
  return bag[Math.floor(Math.random()*bag.length)]||'scrap';
}

function readBestMs(key){
  try{
    const raw=localStorage.getItem(key); if(!raw)return null;
    const x=JSON.parse(raw); const ms=Number(x?.lapMs);
    return Number.isFinite(ms)&&ms>0?ms:null;
  }catch{return null;}
}

export function grantRaceLoot({trackKey='track01',lapMs=null}={}){
  const s=loadGarage();
  const reward={};
  const affinity=trackAffinity(trackKey);
  const add=(id,n=1)=>{reward[id]=(reward[id]||0)+n;};
  const addCommon=(n=1)=>{for(let i=0;i<n;i++)add(weightedCommon(affinity),1);};

  if(LOOT_SESSION.trackKey!==trackKey) resetRaceLootSession(trackKey);
  LOOT_SESSION.laps+=1;
  const sessionLap=LOOT_SESSION.laps;

  const carId=selectedCarId();
  const lap=Number(lapMs);
  const carBestMs=readBestMs(`tdr2:ttBestCar:${trackKey}:${carId}`);
  const circuitBestMs=readBestMs(`tdr2:ttBest:${trackKey}`);
  const carBest=Number.isFinite(lap)&&Number.isFinite(carBestMs)&&Math.abs(lap-carBestMs)<1;
  const circuitRecord=Number.isFinite(lap)&&Number.isFinite(circuitBestMs)&&Math.abs(lap-circuitBestMs)<1;
  const within110=Number.isFinite(lap)&&Number.isFinite(carBestMs)&&lap<=carBestMs*1.10;

  addCommon(2);

  let bonusCommon=false;
  if(circuitRecord||carBest){ addCommon(1); bonusCommon=true; }
  else if(within110&&Math.random()<0.25){ addCommon(1); bonusCommon=true; }

  const pity=Math.max(0,Number(s.lootPityEcu||0));
  const pityChance=Math.min(.24,.08+.02*pity);
  const ecuChance=circuitRecord?1:(carBest?Math.max(.20,pityChance):pityChance);
  const ecuDrop=Math.random()<ecuChance;
  if(ecuDrop){ add('ecu',1); s.lootPityEcu=0; }
  else s.lootPityEcu=pity+1;

  const chest=sessionLap%5===0;
  const chestLoot={};
  if(chest){
    for(let i=0;i<2;i++){
      const id=weightedCommon(affinity);
      add(id,1);
      chestLoot[id]=(chestLoot[id]||0)+1;
    }
  }

  for(const [id,n] of Object.entries(reward)){
    addItem(s,id,n);
    LOOT_SESSION.totals[id]=(LOOT_SESSION.totals[id]||0)+Number(n||0);
  }
  if(ecuDrop)LOOT_SESSION.ecuDrops+=1;
  if(chest)LOOT_SESSION.chests+=1;
  if(bonusCommon)LOOT_SESSION.bonusLaps+=1;

  const meta={
    trackKey,lapMs:lap,affinity,sessionLap,chest,chestLoot,bonusCommon,
    within110,carBest,circuitRecord,ecuDrop,ecuChance,pityBefore:pity,
    label:circuitRecord?'RÉCORD DEL CIRCUITO':carBest?'MEJOR VUELTA':within110?'VUELTA RÁPIDA':'VUELTA VÁLIDA'
  };
  s.lastReward={...reward,t:Date.now(),trackKey,lapMs:lap,doubled:false,meta};
  saveGarage(s);
  Object.defineProperty(reward,'meta',{value:meta,enumerable:false,configurable:true});
  return reward;
}

export function grantRaceReward(mult=1){
  const s=loadGarage();
  const reward={ scrap:2*mult, alloy:1*mult, rubber:1*mult };
  for(const [id,n] of Object.entries(reward)) addItem(s,id,n);
  s.lastReward={...reward,t:Date.now(),doubled:mult>1}; saveGarage(s); return reward;
}
export function duplicateLastReward(){
  const s=loadGarage(); const r=s.lastReward;
  if(!r || r.doubled) return null;
  for(const [id,n] of Object.entries(r)){
    if(!GARAGE_ITEMS[id] || !Number.isFinite(Number(n)) || Number(n)<=0) continue;
    addItem(s,id,Number(n));
  }
  s.lastReward={...r,doubled:true}; saveGarage(s); return r;
}

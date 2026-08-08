import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST, findRecipe, tuningForPart } from './partsCatalog.js';
const KEY='tdr2:garageFusion:v1';

const STARTER={ scrap:8, alloy:5, rubber:4, compound:4, disc:4, spring:3, gear:3, ecu:2 };
const DEFAULT={ inventory:{...STARTER}, equipped:{}, discoveries:[], coins:250, lastReward:null, rewardedToday:0, rewardedDay:'' };

export function loadGarage(){
  try{
    const raw=localStorage.getItem(KEY); if(!raw) return structuredClone(DEFAULT);
    const x=JSON.parse(raw)||{};
    return { ...structuredClone(DEFAULT), ...x, inventory:{...STARTER,...(x.inventory||{})}, equipped:{...(x.equipped||{})} };
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
export function evolve(s,id){
  const next=EVOLUTION_CHAIN[id]; if(!next) return {ok:false,reason:'Nivel máximo'};
  if(qty(s,id)<EVOLUTION_COST) return {ok:false,reason:`Necesitas ${EVOLUTION_COST}`};
  consume(s,id,EVOLUTION_COST); addItem(s,next,1); if(!s.discoveries.includes(next)) s.discoveries.push(next); saveGarage(s);
  return {ok:true,item:GARAGE_ITEMS[next]};
}
export function equip(s,id){
  const item=GARAGE_ITEMS[id]; if(!item?.family || qty(s,id)<1) return false;
  s.equipped[item.family]=id; saveGarage(s); return true;
}
export function garageTuning(s){
  const out={ accelMult:1, brakeMult:1, dragMult:1, turnRateMult:1, maxFwdAdd:0, maxRevAdd:0, turnMinAdd:0, gripCoastAdd:0, gripDriveAdd:0, gripBrakeAdd:0 };
  for(const id of Object.values(s.equipped||{})){
    const t=tuningForPart(GARAGE_ITEMS[id]);
    for(const [k,v] of Object.entries(t)){
      if(k.endsWith('Mult')) out[k] *= v;
      else out[k] += v;
    }
  }
  return out;
}

const COMMON_LOOT=['scrap','alloy','rubber','compound','disc','spring','gear'];

// Small-scale race -> materials loop. A valid completed time-trial lap counts as a race reward.
// Two common drops are granted, with a small ECU chance. The reward is intentionally modest
// so short circuits cannot flood the crafting economy.
export function grantRaceLoot({trackKey='track01',lapMs=null}={}){
  const s=loadGarage();
  const reward={};
  const picks=2;
  for(let i=0;i<picks;i++){
    const id=COMMON_LOOT[Math.floor(Math.random()*COMMON_LOOT.length)];
    reward[id]=(reward[id]||0)+1;
  }
  if(Math.random()<0.10) reward.ecu=(reward.ecu||0)+1;
  for(const [id,n] of Object.entries(reward)) addItem(s,id,n);
  s.lastReward={...reward,t:Date.now(),trackKey,lapMs,doubled:false};
  saveGarage(s);
  return reward;
}

// Legacy helper kept for compatibility with older code paths.
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

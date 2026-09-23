import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';
import { recordStoreBuy } from '../seasons/seasonTelemetry.js';
import { storeRewardedWindow } from '../monetization/rewardedActions.js';

// Balanced against Economy 2.0 natural material income (171 scrap/h, 30 family/h,
// 18 compound/h, 6 ECU/h). Pack progression value scales roughly 30/37/50/60
// minutes with price while preserving the five-family recipe symmetry.
export const MATERIAL_PACKS=[
  {id:'mechanic',name:'PACK MECÁNICA',price:450,items:{scrap:85,alloy:15,disc:15,gear:15}},
  {id:'chassis',name:'PACK CHASIS',price:500,items:{rubber:18,spring:18,compound:11,alloy:18}},
  {id:'technology',name:'PACK TECNOLOGÍA',price:650,items:{ecu:5,compound:15,alloy:25,gear:25}},
  {id:'mixed',name:'PACK PADDOCK',price:800,items:{scrap:170,alloy:30,rubber:30,compound:18,disc:30,spring:30,gear:30,ecu:6}}
];


const FOUR_HOURS=4*60*60*1000;
const DAY=24*60*60*1000;

export function buyMaterialPack(id){
  const pack=MATERIAL_PACKS.find(p=>p.id===id); if(!pack)return {ok:false,reason:'Pack no válido'};
  const s=loadGarage(); if(Number(s.coins||0)<pack.price)return {ok:false,reason:'MONEDAS INSUFICIENTES'};
  s.coins-=pack.price; for(const [item,n] of Object.entries(pack.items))addItem(s,item,n); saveGarage(s); recordStoreBuy(); return {ok:true,pack,state:s};
}

export function rewardedStatus(now=Date.now()){
  const s=loadGarage(),last=Number(s.storeRewardedAt||0);
  return storeRewardedWindow(last,now,FOUR_HOURS);
}

export function claimRewardedCoins(amount=100,now=Date.now()){
  const st=rewardedStatus(now); if(!st.available)return {ok:false,reason:'AÚN NO DISPONIBLE',remaining:st.remaining};
  const s=loadGarage(); s.coins=Number(s.coins||0)+amount; s.storeRewardedAt=now; saveGarage(s); return {ok:true,amount,state:s};
}

export function dailyStatus(now=Date.now()){
  const s=loadGarage(),last=Number(s.storeDailyAt||0),remaining=Math.max(0,DAY-(now-last));
  return {available:!last||remaining<=0,remaining};
}
export function claimDailyCoins(amount=250,now=Date.now()){
  const st=dailyStatus(now); if(!st.available)return {ok:false,reason:'YA RECLAMADA',remaining:st.remaining};
  const s=loadGarage(); s.coins=Number(s.coins||0)+amount; s.storeDailyAt=now; saveGarage(s); return {ok:true,amount,state:s};
}

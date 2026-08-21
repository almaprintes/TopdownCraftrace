import { loadGarage, saveGarage, addItem } from '../garage/garageStore.js';

export const MATERIAL_PACKS=[
  {id:'mechanic',name:'PACK MECÁNICA',price:450,items:{scrap:28,disc:12,gear:10}},
  {id:'chassis',name:'PACK CHASIS',price:500,items:{alloy:22,compound:12,spring:10}},
  {id:'technology',name:'PACK TECNOLOGÍA',price:650,items:{alloy:16,gear:10,ecu:6}},
  {id:'mixed',name:'PACK PADDOCK',price:800,items:{scrap:24,alloy:18,rubber:18,compound:10,disc:8,spring:8,gear:8,ecu:4}}
];

export const COIN_PACKS=[
  {id:'coins_s',name:'2.500 MONEDAS',coins:2500,priceLabel:'DESARROLLO'},
  {id:'coins_m',name:'7.500 MONEDAS',coins:7500,priceLabel:'DESARROLLO'},
  {id:'coins_l',name:'20.000 MONEDAS',coins:20000,priceLabel:'DESARROLLO'},
  {id:'coins_xl',name:'50.000 MONEDAS',coins:50000,priceLabel:'DESARROLLO'}
];

const FOUR_HOURS=4*60*60*1000;
const dayKey=()=>new Date().toISOString().slice(0,10);

export function buyMaterialPack(id){
  const pack=MATERIAL_PACKS.find(p=>p.id===id); if(!pack)return {ok:false,reason:'Pack no válido'};
  const s=loadGarage(); if(Number(s.coins||0)<pack.price)return {ok:false,reason:'MONEDAS INSUFICIENTES'};
  s.coins-=pack.price; for(const [item,n] of Object.entries(pack.items))addItem(s,item,n); saveGarage(s); return {ok:true,pack,state:s};
}

export function rewardedStatus(now=Date.now()){
  const s=loadGarage(),last=Number(s.storeRewardedAt||0),remaining=Math.max(0,FOUR_HOURS-(now-last));
  return {available:!last||remaining<=0,remaining};
}

export function claimRewardedCoins(amount=250,now=Date.now()){
  const st=rewardedStatus(now); if(!st.available)return {ok:false,reason:'AÚN NO DISPONIBLE',remaining:st.remaining};
  const s=loadGarage(); s.coins=Number(s.coins||0)+amount; s.storeRewardedAt=now; saveGarage(s); return {ok:true,amount,state:s};
}

export function dailyStatus(){const s=loadGarage();return {available:s.storeDailyDay!==dayKey()};}
export function claimDailyCoins(amount=100){
  const s=loadGarage(),today=dayKey(); if(s.storeDailyDay===today)return {ok:false,reason:'YA RECLAMADA'};
  s.coins=Number(s.coins||0)+amount; s.storeDailyDay=today; saveGarage(s); return {ok:true,amount,state:s};
}

// Development purchase provider. Native builds will replace this with IAP.
export function simulateCoinPurchase(id){
  const pack=COIN_PACKS.find(p=>p.id===id); if(!pack)return {ok:false};
  const s=loadGarage(); s.coins=Number(s.coins||0)+pack.coins; saveGarage(s); return {ok:true,pack,state:s,simulated:true};
}

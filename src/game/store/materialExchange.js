import { loadGarage, saveGarage, qty } from '../garage/garageStore.js';

export const EXCHANGE_MATERIALS=['scrap','alloy','rubber','disc','spring','gear','compound','ecu'];

// Internal relative values derived from Prototype recipe effort, then rounded conservatively.
// Scrap is the unit. Secondary materials stay close to scrap because recipes demand nearly as many.
// Compound and ECU are far more valuable per unit because recipes need dramatically fewer of them.
export const MATERIAL_EXCHANGE_VALUE={
  scrap:1,
  alloy:1.2,
  rubber:1.2,
  disc:1.2,
  spring:1.2,
  gear:1.2,
  compound:8,
  ecu:20
};

export const MATERIAL_EXCHANGE_EFFICIENCY=.75;
export const MATERIAL_EXCHANGES_PER_DAY=3;

function dayKey(now=Date.now()){
  const d=new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function materialExchangeStatus(now=Date.now()){
  const s=loadGarage();
  const day=dayKey(now);
  const used=s.materialExchangeDay===day?Math.max(0,Number(s.materialExchangeCount||0)):0;
  return {day,used,remaining:Math.max(0,MATERIAL_EXCHANGES_PER_DAY-used),available:used<MATERIAL_EXCHANGES_PER_DAY};
}

export function quoteMaterialExchange(fromId,toId,fromQty){
  if(!EXCHANGE_MATERIALS.includes(fromId)||!EXCHANGE_MATERIALS.includes(toId)||fromId===toId)return {ok:false,reason:'INTERCAMBIO NO VÁLIDO'};
  const spend=Math.max(0,Math.floor(Number(fromQty)||0));
  if(spend<1)return {ok:false,reason:'CANTIDAD NO VÁLIDA'};
  const fromValue=Number(MATERIAL_EXCHANGE_VALUE[fromId]||0),toValue=Number(MATERIAL_EXCHANGE_VALUE[toId]||0);
  const receive=Math.floor(spend*fromValue*MATERIAL_EXCHANGE_EFFICIENCY/toValue);
  if(receive<1)return {ok:false,reason:'CANTIDAD DEMASIADO PEQUEÑA',spend,receive:0};
  return {ok:true,fromId,toId,spend,receive,efficiency:MATERIAL_EXCHANGE_EFFICIENCY,fromValue,toValue};
}

export function executeMaterialExchange(fromId,toId,fromQty,now=Date.now()){
  const st=materialExchangeStatus(now);
  if(!st.available)return {ok:false,reason:'LÍMITE DIARIO ALCANZADO',status:st};
  const q=quoteMaterialExchange(fromId,toId,fromQty);
  if(!q.ok)return q;
  const s=loadGarage();
  if(qty(s,fromId)<q.spend)return {ok:false,reason:'MATERIAL INSUFICIENTE'};
  if(!s.inventory||typeof s.inventory!=='object')s.inventory={};
  s.inventory[fromId]=Math.max(0,qty(s,fromId)-q.spend);
  s.inventory[toId]=qty(s,toId)+q.receive;
  s.materialExchangeDay=st.day;
  s.materialExchangeCount=st.used+1;
  saveGarage(s);
  return {ok:true,...q,state:s,status:materialExchangeStatus(now)};
}

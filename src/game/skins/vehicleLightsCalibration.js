import official from './vehicleLights.json' with {type:'json'};
import {getEquippedCarSkin} from './carSkins.js';

export const VEHICLE_LIGHTS_EXPORT='tdr-vehicle-lights.json';
export const FRONT_FACING_CARS=new Set(['helix_comet','helix_pulse','helix_vortex']);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const sane=(v,fallback,lo,hi)=>Number.isFinite(Number(v))?Math.round(clamp(Number(v),lo,hi)*1000000)/1000000:fallback;
const hex=(v,fallback)=>/^#[0-9a-fA-F]{6}$/.test(String(v))?String(v).toLowerCase():fallback;

export function defaultVehicleLights(carId){
 const frontFacing=FRONT_FACING_CARS.has(String(carId||''));
 return {
  front:{enabled:false,color:'#fff8ed',intensity:.86,halo:.3,
   left:{x:-.255,y:-.385,size:.14},right:{x:.255,y:-.385,size:.14}},
  rear:{enabled:!frontFacing,color:'#ff0000',intensity:1,tailIntensity:.52,halo:.18,
   left:{x:-.285,y:.385,size:.18},right:{x:.285,y:.385,size:.18}}
 };
}
export function normalizeVehicleLights(value,carId=''){
 const base=defaultVehicleLights(carId),data=value&&typeof value==='object'?value:{};
 const pair=(name)=>{
  const original=base[name],row=data[name]&&typeof data[name]==='object'?data[name]:{};
  const point=(key)=>{
   const p=row[key]&&typeof row[key]==='object'?row[key]:{};
   const d=original[key];
   return{x:sane(p.x,d.x,-.8,.8),y:sane(p.y,d.y,-.8,.8),size:sane(p.size,d.size,.02,.5)};
  };
  return{enabled:typeof row.enabled==='boolean'?row.enabled:original.enabled,
    color:hex(row.color,original.color),intensity:sane(row.intensity,original.intensity,0,1),
    ...(name==='rear'?{tailIntensity:sane(row.tailIntensity,original.tailIntensity,0,1)}:{}),
    halo:sane(row.halo,original.halo,0,1),left:point('left'),right:point('right')};
 };
 return{front:pair('front'),rear:pair('rear')};
}
export function vehicleLightsForCar(carId,skinId='original',override=null){
 const perCar=override?.[carId]??official?.cars?.[carId];
 if(!perCar||typeof perCar!=='object')return null; // Uncalibrated cars keep the approved legacy renderer.
 const row=perCar[skinId]??perCar.original;
 return row?normalizeVehicleLights(row,carId):null;
}
export function vehicleLightsForEquippedCar(carId,spec=null,{dev=false,storage=globalThis.localStorage}={}){
 const skin=getEquippedCarSkin(carId,{spec,dev,storage});
 return{skinId:skin.id,lights:vehicleLightsForCar(carId,skin.id)};
}
export function mergeVehicleLights(saved,draft){
 const cars={...(saved?.cars||{})};
 for(const [id,skins] of Object.entries(draft||{})){
  if(!skins||typeof skins!=='object')continue;
  cars[id]={...(cars[id]||{})};
  for(const [skin,value] of Object.entries(skins))cars[id][skin]=normalizeVehicleLights(value,id);
 }
 return{schema_version:1,units:'sprite_width_height_ratio',cars};
}
export function lightCoordinates(point,width,height){
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
 return{x:point.x*w,y:point.y*h,size:point.size*Math.min(w,h)};
}

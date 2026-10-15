import cuperStatus from './cuperAssetsStatus.json' with {type:'json'};
// A cosmetic skin never creates a new car profile, stats, or record.
export const CAR_SKIN_CATALOG=Object.freeze({
 crown_cuper:Object.freeze([
  Object.freeze({id:'original',name:'Original',file:'skin_crown_cuper_original.webp',factory:'assets/cars/workshop/mini_cooper_black_white.webp',premium:false}),
  Object.freeze({id:'gold',name:'Gold Edition',file:'skin_crown_cuper_gold.webp',factory:'assets/cars/workshop/mini_cooper_black_gold.webp',premium:true})
 ])
});
// Generated from verified WebP binaries by GitHub Actions before each build.
export const CUPER_ASSETS_PUBLISHED=cuperStatus.published===true;
export function hasPublishedCarArt(carId){return carId!=='crown_cuper'||CUPER_ASSETS_PUBLISHED;}
const KEY='tdr2:equippedSkins:v1';
export const SEASON_SKIN_UNLOCKS_KEY='tdr2:seasonSkinUnlocks:v1';
export function seasonSkinUnlocks(storage=globalThis.localStorage){
 try{const list=JSON.parse(storage?.getItem?.(SEASON_SKIN_UNLOCKS_KEY)||'[]');return Array.isArray(list)?list.filter(x=>typeof x==='string'):[];}catch{return [];}
}
export function grantSeasonSkin(carId,skinId,storage=globalThis.localStorage){
 if(!availableCarSkins(carId).some(s=>s.id===skinId))return false;
 const id=`${carId}:${skinId}`,previous=seasonSkinUnlocks(storage);
 if(previous.includes(id))return true;
 try{storage?.setItem(SEASON_SKIN_UNLOCKS_KEY,JSON.stringify([...previous,id]));return true;}catch{return false;}
}

export function availableCarSkins(carId,spec=null){
 const id=String(carId||'');
 return CAR_SKIN_CATALOG[id]||[{id:'original',name:'Original',file:String(spec?.skin||''),premium:false}];
}
export function skinIsUnlocked(carId,skinId,{dev=false,entitlements=null}={}){
 const skin=availableCarSkins(carId).find(s=>s.id===skinId);
 if(!skin)return false;
 return !skin.premium||dev||entitlements?.includes?.(`${carId}:${skinId}`)===true||seasonSkinUnlocks().includes(`${carId}:${skinId}`);
}
function readSelection(storage){
 try{
  const data=JSON.parse(storage?.getItem(KEY)||'{}');
  return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 }catch{return{};}
}
export function getEquippedCarSkin(carId,{spec=null,storage=globalThis.localStorage,dev=false,entitlements=null}={}){
 const choices=availableCarSkins(carId,spec),picked=String(readSelection(storage)[carId]||'original');
 const skin=choices.find(s=>s.id===picked&&skinIsUnlocked(carId,s.id,{dev,entitlements}))||choices[0];
 return {...skin};
}
export function equipCarSkin(carId,skinId,{spec=null,storage=globalThis.localStorage,dev=false,entitlements=null}={}){
 const skin=availableCarSkins(carId,spec).find(s=>s.id===skinId);
 if(!skin)return{ok:false,reason:'unknown-skin'};
 if(!skinIsUnlocked(carId,skinId,{dev,entitlements}))return{ok:false,reason:'locked'};
 try{
  const next=readSelection(storage);
  next[carId]=skinId;
  storage?.setItem(KEY,JSON.stringify(next));
  return{ok:true,carId,skinId};
 }catch{return{ok:false,reason:'storage-failed'};}
}
export function selectedCarSkinFile(carId,spec=null,opts={}){
 return getEquippedCarSkin(carId,{...opts,spec}).file||String(spec?.skin||'');
}
export function hasAlternativeSkins(carId){return availableCarSkins(carId).length>1;}

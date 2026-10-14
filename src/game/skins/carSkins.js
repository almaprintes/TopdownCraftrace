// A cosmetic skin never creates a new car profile, stats, or record.
export const CAR_SKIN_CATALOG=Object.freeze({
 crown_cuper:Object.freeze([
  Object.freeze({id:'original',name:'Original',file:'skin_crown_cuper_original.webp',premium:false}),
  Object.freeze({id:'gold',name:'Gold Edition',file:'skin_crown_cuper_gold.webp',premium:true})
 ])
});
const KEY='tdr2:equippedSkins:v1';
export function availableCarSkins(carId,spec=null){
 const id=String(carId||'');
 return CAR_SKIN_CATALOG[id]||[{id:'original',name:'Original',file:String(spec?.skin||''),premium:false}];
}
export function skinIsUnlocked(carId,skinId,{dev=false,entitlements=null}={}){
 const skin=availableCarSkins(carId).find(s=>s.id===skinId);
 if(!skin)return false;
 return !skin.premium||dev||entitlements?.includes?.(`${carId}:${skinId}`)===true;
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

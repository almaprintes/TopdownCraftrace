import {availableCarSkins,getEquippedCarSkin,hasAlternativeSkins} from './carSkins.js';
// Factory artwork is the original three-quarter showroom view (NOT an
// orthographic hard side profile). Player equipment is read-only here.
export function workshopCarArtworkCandidates(carId,{spec=null,storage=globalThis.localStorage,dev=false,entitlements=null}={}){
 const basic=`assets/cars/workshop/${carId}.webp`;
 if(!hasAlternativeSkins(carId))return[basic];
 const options=availableCarSkins(carId,spec);
 const original=options.find(s=>s.id==='original')||options[0];
 const equipped=getEquippedCarSkin(carId,{spec,storage,dev,entitlements});
 const order=[
  equipped.factory,
  original.factory||basic,
  original.file?`assets/skins/${original.file}`:null
 ];
 return [...new Set(order.filter(Boolean))];
}

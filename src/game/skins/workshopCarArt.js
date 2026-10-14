import {availableCarSkins,getEquippedCarSkin,hasAlternativeSkins} from './carSkins.js';
import {skinGeometryForSprite} from './skinGeometry.js';
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

// Separate factory-view calibration per car and skin; does not affect the top-down racer.
export const factorySkinGeometryId=skinId=>`factory_${String(skinId||'original')}`;
export function workshopCarPlacement(carId,skinId,width,height,overrides=null){
 return skinGeometryForSprite(carId,factorySkinGeometryId(skinId),width,height,overrides);
}

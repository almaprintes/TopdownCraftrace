import {selectedCarSkinFile,hasAlternativeSkins} from './carSkins.js';
// Statistics and race loading show the equipped car; collection cards NEVER do.
export function carVisualCandidates(carId,spec=null,{base='',storage=globalThis.localStorage,dev=false}={}){
 const id=String(carId||''),prefix=String(base||'');
 const variantCar=hasAlternativeSkins(id);
 const selected=variantCar
  ?`${prefix}assets/skins/${encodeURIComponent(selectedCarSkinFile(id,spec,{storage,dev}))}`:null;
 // Cars with authored alternative skins (currently CROWN Cuper) intentionally
 // have no generic lobby/{id}.webp. Fall back directly to the original skin.
 const lobby=variantCar?null:`${prefix}assets/cars/lobby/${encodeURIComponent(id)}.webp`;
 const original=spec?.skin?`${prefix}assets/skins/${encodeURIComponent(spec.skin)}`:null;
 return [...new Set([selected,lobby,original].filter(Boolean))];
}
export function applyCarVisual(img,carId,spec=null,options={}){
 if(!img)return;
 const candidates=carVisualCandidates(carId,spec,options);
 let index=0;img.style.visibility='';
 img.onerror=()=>{if(++index<candidates.length)img.src=candidates[index];else img.style.visibility='hidden';};
 if(candidates.length)img.src=candidates[0];else img.style.visibility='hidden';
}

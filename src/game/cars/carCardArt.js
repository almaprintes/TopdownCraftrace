// A collection card is bound to its base car model, never equipped cosmetic skins.
export function carCardFile(carId,spec={}){
 if(carId==='crown_cuper')return 'card_crown_cuper_raro_018.svg';
 const rarity=String(spec?.rarity||'comun').toLowerCase().replace(/\s+/g,'_').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const no=String(spec?.collectionNo||0).padStart(3,'0');
 return `card_${carId}_${rarity}_${no}.webp`;
}
export function carCardUrl(carId,spec={},base=''){
 return `${base}assets/cars/runtime/${carCardFile(carId,spec)}?v=${encodeURIComponent(spec?.cardAssetVersion||1)}`;
}

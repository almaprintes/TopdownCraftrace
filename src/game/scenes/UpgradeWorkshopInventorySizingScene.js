import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopQuickInstallScene.js';

const CRAFT_BASE=`${import.meta.env.BASE_URL || './'}assets/crafting/`;
const MATERIAL_FILES={
  scrap:'materials/chatarra.webp',alloy:'materials/aleacion.webp',rubber:'materials/goma.webp',compound:'materials/compuesto.webp',
  disc:'materials/disco_metalico.webp',spring:'materials/muelle.webp',gear:'materials/engranaje.webp',ecu:'materials/electronica.webp'
};
const PART_FILES={
  engine_street:'parts/engine/engine_street.webp',engine_sport:'parts/engine/engine_sport.webp',engine_racing:'parts/engine/engine_racing.webp',engine_prototype:'parts/engine/engine_prototype.webp',
  brakes_street:'parts/brakes/brakes_street.webp',brakes_sport:'parts/brakes/brakes_sport.webp',brakes_racing:'parts/brakes/brakes_racing.webp',brakes_prototype:'parts/brakes/brakes_prototype.webp',
  tires_street:'parts/tires/tires_street.webp',tires_sport:'parts/tires/tires_sport.webp',tires_racing:'parts/tires/tires_racing_t3.webp',tires_prototype:'parts/tires/tires_prototype_t4.webp',
  suspension_street:'parts/suspension/suspension_street_t1.webp',suspension_sport:'parts/suspension/suspension_sport_t2.webp',suspension_racing:'parts/suspension/suspension_racing_t3.webp',suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',
  transmission_street:'parts/transmission/transmission_street_t1.webp',transmission_sport:'parts/transmission/transmission_sport_t2.webp',transmission_racing:'parts/transmission/transmission_racing_t3.webp',transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};

function assetPath(item){
  if(!item)return null;
  const rel=item.kind==='material'?MATERIAL_FILES[item.id]:PART_FILES[item.id];
  return rel?`${CRAFT_BASE}${rel}?v=20260815-fullbleed1`:null;
}

export class UpgradeShopScene extends PreviousWorkshop {
  _loadFullBleed(A,item,r,onReady){
    // Outside inventory/equipment modals, preserve the original large artwork behavior.
    if(!this._factoryInventoryModal?.scene)return super._loadFullBleed(A,item,r,onReady);

    const path=assetPath(item);
    if(!path)return false;
    const key=`craft_fullbleed_${item.id}`;
    const draw=()=>{
      if(!this.textures.exists(key))return false;
      const img=A(this.add.image(r.x+r.w/2,r.y+r.h/2,key));
      // Inventory standard: never crop. Fit the whole asset inside the same visual box used by lobby inventory.
      const scale=Math.min(r.w/(img.width||1),r.h/(img.height||1));
      img.setScale(scale);
      return true;
    };
    if(draw())return true;
    if(this.failedAssets?.has(key))return false;
    if(!this.loadingAssets?.has(key)){
      this.loadingAssets.add(key);
      const cleanup=()=>{this.loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();if(this._factoryInventoryModal?.scene){onReady?.();this._openFactoryInventoryModal?.('parts',0,0);}};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets?.add?.(key);};
      this.load.once(`filecomplete-image-${key}`,ok);
      this.load.on('loaderror',err);
      this.load.image(key,path);
      if(!this.load.isLoading())this.load.start();
    }
    return false;
  }
}

import { UpgradeShopScene as SimpleCraftWorkshop } from './UpgradeWorkshopSimpleCraftScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

export class UpgradeShopScene extends SimpleCraftWorkshop {
  _doEvolve(id){
    const item=GARAGE_ITEMS[id];
    if(!item?.kind || item.kind!=='part'){
      this._toast?.('Esta pieza no puede evolucionar');
      return false;
    }
    if(Number(item.tier||0)>=4){
      this._toast?.('PROTOTYPE · NIVEL MÁXIMO');
      return false;
    }
    return super._doEvolve?.(id);
  }
}

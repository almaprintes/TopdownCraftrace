import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopInventoryAccessScene.js';
import { preloadTdrCoin, replaceProceduralCoins } from '../ui/CoinAssetUi.js';

export class UpgradeShopScene extends PreviousWorkshop {
  preload(){
    super.preload?.();
    preloadTdrCoin(this);
  }

  _header(A,w,compact){
    super._header(A,w,compact);
    this.time?.delayedCall?.(0,()=>replaceProceduralCoins(this,this.root,compact?22:26));
  }
}

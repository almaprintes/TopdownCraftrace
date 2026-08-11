import { UpgradeShopScene as PremiumWorkshopV2 } from './UpgradeWorkshopPremiumV2Scene.js';

const WORKSHOP_BASE='assets/cars/workshop/';

export class UpgradeShopScene extends PremiumWorkshopV2 {
  _carImage(A,spec,r){
    const cleanKey=`workshop_car_${this.car}`;
    const cx=r.x+r.w*.49,cy=r.y+r.h*.46,w=r.w*.90,h=r.h*.88;
    const img=A(this.add.image(cx,cy,'__MISSING').setVisible(false));
    const apply=()=>{
      if(!img?.scene||!this.textures.exists(cleanKey))return false;
      img.setTexture(cleanKey).setVisible(true);
      img.setScale(Math.min(w/(img.width||1),h/(img.height||1)));
      return true;
    };
    if(apply())return;
    if(this.failedAssets.has(cleanKey)){
      img.destroy();
      return super._carImage(A,spec,r);
    }
    if(this.loadingAssets.has(cleanKey))return;
    this.loadingAssets.add(cleanKey);
    const cleanup=()=>{
      this.loadingAssets.delete(cleanKey);
      this.load.off(`filecomplete-image-${cleanKey}`,ok);
      this.load.off('loaderror',err);
    };
    const ok=()=>{
      cleanup();
      if(!apply()){
        img.destroy();
        super._carImage(A,spec,r);
      }
    };
    const err=f=>{
      if(f?.key!==cleanKey)return;
      cleanup();
      this.failedAssets.add(cleanKey);
      img.destroy();
      super._carImage(A,spec,r);
    };
    this.load.once(`filecomplete-image-${cleanKey}`,ok);
    this.load.on('loaderror',err);
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp`);
    if(!this.load.isLoading())this.load.start();
  }
}

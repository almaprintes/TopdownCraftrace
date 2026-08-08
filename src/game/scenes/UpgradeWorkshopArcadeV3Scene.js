import { UpgradeShopScene as ArcadeWorkshopV2 } from './UpgradeWorkshopArcadeV2Scene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

const CARD_BASE='assets/cars/runtime/';

function raritySlug(spec){
  return String(spec?.rarity||'comun').toLowerCase().replace(' ','_').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

export class UpgradeShopScene extends ArcadeWorkshopV2{
  _drawArcadeCar(A,cx,cy,w,h){
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const texKey=`workshop_car_${this.car}`;
    const img=A(this.add.image(cx,cy,'__MISSING').setVisible(false));

    const apply=()=>{
      if(!img?.scene||!this.textures.exists(texKey))return;
      img.setTexture(texKey).setVisible(true);
      const s=Math.min(w/(img.width||1),h/(img.height||1));
      img.setScale(s);
      img.setAlpha(0);
      this.tweens.add({targets:img,alpha:1,scaleX:s*1.03,scaleY:s*1.03,duration:180,ease:'Cubic.easeOut'});
    };

    if(this.textures.exists(texKey)){apply();return;}

    const file=`card_${this.car}_${raritySlug(spec)}_${String(spec.collectionNo||0).padStart(3,'0')}.webp`;
    const url=`${CARD_BASE}${file}`;
    const ok=(key)=>{if(key!==texKey)return;cleanup();apply();};
    const err=(fileObj)=>{if(!fileObj||fileObj.key!==texKey)return;cleanup();};
    const cleanup=()=>{
      this.load.off(`filecomplete-image-${texKey}`,ok);
      this.load.off('loaderror',err);
    };
    this.load.once(`filecomplete-image-${texKey}`,ok);
    this.load.on('loaderror',err);
    this.load.image(texKey,url);
    if(!this.load.isLoading())this.load.start();
  }
}

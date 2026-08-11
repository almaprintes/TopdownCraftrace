import { UpgradeShopScene as PremiumWorkshopV2 } from './UpgradeWorkshopPremiumV2Scene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

const WORKSHOP_BASE=`${import.meta.env.BASE_URL || './'}assets/cars/workshop/`;

export class UpgradeShopScene extends PremiumWorkshopV2 {
  create(){
    this._workshopMissing=new Set();
    super.create();
  }

  _carPanel(A,r,compact){
    this._panel(A,r,0x2bcfff);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const y=r.y+(compact?10:14);
    A(this.add.text(r.x+15,y,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#8da3ae'}));
    A(this.add.text(r.x+15,y+(compact?17:20),spec.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#fff'}));
    A(this.add.text(r.x+r.w-15,y+2,String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#ffd05a'}).setOrigin(1,0));

    const imageH=Math.round(r.h*(compact?0.47:0.55));
    const carR={x:r.x+10,y:r.y+(compact?53:66),w:r.w-20,h:imageH};
    this._platform(A,carR);
    this._carImage(A,spec,carR);
    this._stats(A,spec,{x:r.x+14,y:carR.y+carR.h+8,w:r.w-28,h:r.y+r.h-carR.y-carR.h-16},compact);
  }

  _carImage(A,spec,r){
    const cleanKey=`workshop_render_v4_${this.car}`;
    const cx=r.x+r.w*.49,cy=r.y+r.h*.47,w=r.w*.92,h=r.h*.94;

    const showClean=()=>{
      if(!this.textures.exists(cleanKey))return false;
      const img=A(this.add.image(cx,cy,cleanKey));
      img.setScale(Math.min(w/(img.width||1),h/(img.height||1)));
      return true;
    };

    if(showClean())return;
    if(this._workshopMissing?.has(cleanKey))return super._carImage(A,spec,r);
    if(this.loadingAssets.has(cleanKey))return;

    this.loadingAssets.add(cleanKey);
    const cleanup=()=>{
      this.loadingAssets.delete(cleanKey);
      this.load.off(`filecomplete-image-${cleanKey}`,ok);
      this.load.off('loaderror',err);
    };
    const ok=()=>{
      cleanup();
      if(this.root?.scene)this.render();
    };
    const err=f=>{
      if(f?.key!==cleanKey)return;
      cleanup();
      this._workshopMissing?.add(cleanKey);
      if(this.root?.scene)this.render();
    };

    this.load.once(`filecomplete-image-${cleanKey}`,ok);
    this.load.on('loaderror',err);
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp?v=20260811-4`);
    if(!this.load.isLoading())this.load.start();
  }
}

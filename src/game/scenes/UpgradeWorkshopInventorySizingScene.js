import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopQuickInstallScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

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
const LEGACY_CAR_IDS=new Set(['stock','touring','power']);
const WORKSHOP_CAR_IDS=Object.keys(CAR_SPECS).filter(id=>!LEGACY_CAR_IDS.has(id)&&CAR_SPECS[id]);

function assetPath(item){
  if(!item)return null;
  const rel=item.kind==='material'?MATERIAL_FILES[item.id]:PART_FILES[item.id];
  return rel?`${CRAFT_BASE}${rel}?v=20260815-fullbleed1`:null;
}

export class UpgradeShopScene extends PreviousWorkshop {
  _compactCarPanel(A,r,compact){
    // Draw this panel once, with the navigation integrated into the real title.
    // This replaces the old two-layer approach that duplicated/covered the name.
    this._panel(A,r,0x2bcfff);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const index=WORKSHOP_CAR_IDS.indexOf(this.car);
    const titleY=r.y+(compact?25:34);
    const navCenterX=r.x+r.w*.40;

    const title=A(this.add.text(navCenterX,titleY,String(spec?.name||this.car).toUpperCase(),{
      fontFamily:'Arial Narrow,system-ui',fontSize:compact?'17px':'23px',fontStyle:'900 italic',color:'#fff'
    }).setOrigin(.5));

    A(this.add.text(r.x+r.w-12,r.y+(compact?10:14),String(spec?.rarity||'COMÚN').toUpperCase(),{
      fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#ffd05a'
    }).setOrigin(1,0));

    if(index>=0){
      const leftEnabled=index>0;
      const rightEnabled=index<WORKSHOP_CAR_IDS.length-1;
      const gap=compact?18:24;
      const buttonW=compact?28:34;
      const leftX=Math.max(r.x+buttonW/2+8,navCenterX-title.width/2-gap-buttonW/2);
      const rightX=Math.min(r.x+r.w-buttonW/2-8,navCenterX+title.width/2+gap+buttonW/2);
      this._workshopNavGeometry={rowY:titleY,leftX,rightX,buttonW,buttonH:compact?24:28};

      const arrow=(x,glyph,enabled,delta)=>{
        const hit=A(this.add.rectangle(x,titleY,buttonW,compact?24:28,0x10273a,enabled?.92:.32)
          .setStrokeStyle(1,enabled?0x45dfff:0x405262,enabled?.90:.30));
        A(this.add.text(x,titleY,glyph,{
          fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'900',color:enabled?'#ffffff':'#607080'
        }).setOrigin(.5));
        if(enabled){
          hit.setInteractive({useHandCursor:true});
          hit.on('pointerdown',()=>this._browseWorkshopCar(delta));
        }
      };
      arrow(leftX,'‹',leftEnabled,-1);
      arrow(rightX,'›',rightEnabled,1);
    }

    const imageH=Math.round(r.h*(compact?.43:.50));
    const carR={x:r.x+9,y:r.y+(compact?45:57),w:r.w-18,h:imageH};
    this._platform(A,carR);
    this._carImage(A,spec,carR);

    const statsR={x:r.x+13,y:carR.y+carR.h+7,w:r.w-26,h:r.y+r.h-carR.y-carR.h-14};
    this._miniStats(A,spec,statsR,compact);
  }

  _browseWorkshopCar(delta){
    if(this.busy)return;
    const index=WORKSHOP_CAR_IDS.indexOf(this.car);
    if(index<0)return;
    const next=index+Number(delta||0);
    if(next<0||next>=WORKSHOP_CAR_IDS.length)return;
    this.car=WORKSHOP_CAR_IDS[next];
    try{localStorage.setItem('tdr2:carId',this.car);}catch{}
    // Keep craftFamily/craftTier untouched while making the browsed car the
    // persistent active car used by the garage and the rest of the game.
    this.render();
  }

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

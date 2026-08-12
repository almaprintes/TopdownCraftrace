import { UpgradeShopScene as PremiumWorkshopV3 } from './UpgradeWorkshopPremiumV3Scene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { getEquippedForCar } from '../garage/garageStore.js';

const CRAFT_BASE = `${import.meta.env.BASE_URL || './'}assets/crafting/`;
const FAMILIES = ['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL = {
  engine:'MOTOR',
  brakes:'FRENOS',
  tires:'NEUMÁTICOS',
  suspension:'SUSPENSIÓN',
  transmission:'TRANSMISIÓN'
};

const MATERIAL_FILES = {
  scrap:'chatarra.webp',
  alloy:'aleacion.webp',
  rubber:'goma.webp',
  compound:'compuesto.webp',
  disc:'disco_metalico.webp',
  spring:'muelle.webp',
  gear:'engranaje.webp',
  ecu:'electronica.webp'
};

const PART_FILES = {
  engine_street:'engine_street.webp',
  engine_sport:'engine_sport.webp',
  engine_racing:'engine_racing.webp',
  engine_prototype:'engine_prototype.webp',

  brakes_street:'brakes_street.webp',
  brakes_sport:'brakes_sport.webp',
  brakes_racing:'brakes_racing.webp',
  brakes_prototype:'brakes_prototype.webp',

  tires_street:'tires_street.webp',
  tires_sport:'tires_sport.webp',
  tires_racing:'tires_racing_t3.webp',
  tires_prototype:'tires_prototype_t4.webp',

  suspension_street:'suspension_street_t1.webp',
  suspension_sport:'suspension_sport_t2.webp',
  suspension_racing:'suspension_racing_t3.webp',
  suspension_prototype:'suspension_prototype_t4.webp',

  transmission_street:'transmission_street_t1.webp',
  transmission_sport:'transmission_sport_t2.webp',
  transmission_racing:'transmission_racing_t3.webp',
  transmission_prototype:'transmission_prototype_t4.webp'
};

function assetPath(item){
  if(!item) return null;
  if(item.kind === 'material'){
    const file = MATERIAL_FILES[item.id];
    return file ? `${CRAFT_BASE}materials/${file}?v=20260812-1` : null;
  }
  if(item.kind === 'part'){
    const file = PART_FILES[item.id];
    return file ? `${CRAFT_BASE}parts/${item.family}/${file}?v=20260812-1` : null;
  }
  return null;
}

export class UpgradeShopScene extends PremiumWorkshopV3 {
  _itemArt(A,item,cx,cy,size){
    const path = assetPath(item);
    if(!path) return super._itemArt(A,item,cx,cy,size);

    const key = `craft_asset_v4_${item.id}`;
    const apply = () => {
      if(!this.textures.exists(key)) return false;
      const img = A(this.add.image(cx,cy,key));
      const max = size * 1.18;
      img.setScale(Math.min(max/(img.width||1), max/(img.height||1)));
      return true;
    };

    if(apply()) return;

    if(!this.failedAssets.has(key) && !this.loadingAssets.has(key)){
      this.loadingAssets.add(key);
      const cleanup = () => {
        this.loadingAssets.delete(key);
        this.load.off(`filecomplete-image-${key}`,ok);
        this.load.off('loaderror',err);
      };
      const ok = () => {
        cleanup();
        if(this.root?.scene) this.render();
      };
      const err = f => {
        if(f?.key !== key) return;
        cleanup();
        this.failedAssets.add(key);
        if(this.root?.scene) this.render();
      };
      this.load.once(`filecomplete-image-${key}`,ok);
      this.load.on('loaderror',err);
      this.load.image(key,path);
      if(!this.load.isLoading()) this.load.start();
    }

    // Placeholder limpio mientras carga el WebP.
    const g = A(this.add.graphics());
    g.fillStyle(item.tone||0x2dcfff,.10);
    g.fillCircle(cx,cy,size*.48);
    g.lineStyle(1,item.tone||0x2dcfff,.45);
    g.strokeCircle(cx,cy,size*.46);
  }

  _equippedStrip(A,r,compact){
    const g=A(this.add.graphics());
    g.fillStyle(0x03080b,.98);
    g.fillRoundedRect(r.x,r.y,r.w,r.h,9);
    g.lineStyle(1,0x223c47,.9);
    g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);

    const eq=getEquippedForCar(this.state,this.car)||{};
    const gap=5,cw=(r.w-gap*4)/5;

    FAMILIES.forEach((f,i)=>{
      const x=r.x+i*(cw+gap);
      const item=eq[f]?GARAGE_ITEMS[eq[f]]:null;
      const q=A(this.add.graphics());
      q.fillStyle(item?0x0a1b21:0x081116);
      q.fillRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);
      q.lineStyle(1,item?(item.tone||0x2dcfff):0x2b424c,.65);
      q.strokeRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);

      A(this.add.text(x+cw/2,r.y+(compact?10:12),FAMILY_LABEL[f],{
        fontFamily:'Arial Narrow,system-ui',
        fontSize:compact?'8px':'10px',
        fontStyle:'900',
        color:'#fff'
      }).setOrigin(.5));

      if(item){
        const artSize=Math.min(cw*.22,r.h*(compact?.34:.38));
        this._itemArt(A,item,x+cw*.20,r.y+r.h*.61,artSize);
        A(this.add.text(x+cw*.58,r.y+r.h*.60,`${item.name}\nT${item.tier}`,{
          fontFamily:'system-ui',
          fontSize:compact?'7px':'8px',
          fontStyle:'700',
          color:'#66dfff',
          align:'center',
          wordWrap:{width:cw*.70}
        }).setOrigin(.5));
      }else{
        A(this.add.text(x+cw/2,r.y+r.h-(compact?11:14),'SIN EQUIPAR',{
          fontFamily:'system-ui',
          fontSize:compact?'7px':'8px',
          fontStyle:'700',
          color:'#667a83'
        }).setOrigin(.5));
      }
    });
  }
}

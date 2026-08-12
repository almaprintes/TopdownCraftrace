import { UpgradeShopScene as PremiumWorkshopV2 } from './UpgradeWorkshopPremiumV2Scene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { getEquippedForCar } from '../garage/garageStore.js';

const WORKSHOP_BASE=`${import.meta.env.BASE_URL || './'}assets/cars/workshop/`;
const CRAFT_BASE=`${import.meta.env.BASE_URL || './'}assets/crafting/`;

const CRAFT_ASSETS={
  scrap:'materials/chatarra.webp',
  alloy:'materials/aleacion.webp',
  rubber:'materials/goma.webp',
  compound:'materials/compuesto.webp',
  disc:'materials/disco_metalico.webp',
  spring:'materials/muelle.webp',
  gear:'materials/engranaje.webp',
  ecu:'materials/electronica.webp',

  engine_street:'parts/engine/engine_street.webp',
  engine_sport:'parts/engine/engine_sport.webp',
  engine_racing:'parts/engine/engine_racing.webp',
  engine_prototype:'parts/engine/engine_prototype.webp',

  brakes_street:'parts/brakes/brakes_street.webp',
  brakes_sport:'parts/brakes/brakes_sport.webp',
  brakes_racing:'parts/brakes/brakes_racing.webp',
  brakes_prototype:'parts/brakes/brakes_prototype.webp',

  tires_street:'parts/tires/tires_street.webp',
  tires_sport:'parts/tires/tires_sport.webp',
  tires_racing:'parts/tires/tires_racing_t3.webp',
  tires_prototype:'parts/tires/tires_prototype_t4.webp',

  suspension_street:'parts/suspension/suspension_street_t1.webp',
  suspension_sport:'parts/suspension/suspension_sport_t2.webp',
  suspension_racing:'parts/suspension/suspension_racing_t3.webp',
  suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',

  transmission_street:'parts/transmission/transmission_street_t1.webp',
  transmission_sport:'parts/transmission/transmission_sport_t2.webp',
  transmission_racing:'parts/transmission/transmission_racing_t3.webp',
  transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};

const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const CRAFT_ART_SCALE=1.5;

// Ajustes visuales por coche para que cada render apoye correctamente sobre la plataforma.
// x/y son proporciones del rectángulo del coche; scale multiplica el tamaño calculado automáticamente.
const WORKSHOP_CAR_LAYOUT={
  avenir_gripline:{x:0.49,y:0.55,scale:1.18},
  avenir_apex:{x:0.47,y:0.55,scale:1.13},
};

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
    const cleanKey=`workshop_render_v5_${this.car}`;
    const layout=WORKSHOP_CAR_LAYOUT[this.car]||{x:0.49,y:0.53,scale:1.08};
    const cx=r.x+r.w*layout.x,cy=r.y+r.h*layout.y,w=r.w*.92,h=r.h*.94;

    const showClean=()=>{
      if(!this.textures.exists(cleanKey))return false;
      const img=A(this.add.image(cx,cy,cleanKey));
      const baseScale=Math.min(w/(img.width||1),h/(img.height||1));
      img.setScale(baseScale*layout.scale);
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
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp?v=20260811-5`);
    if(!this.load.isLoading())this.load.start();
  }

  _itemArt(A,item,cx,cy,size){
    const rel=CRAFT_ASSETS[item?.id];
    if(!rel)return super._itemArt(A,item,cx,cy,size*CRAFT_ART_SCALE);

    const visualSize=size*CRAFT_ART_SCALE;
    const key=`craft_real_${item.id}`;
    if(this.textures.exists(key)){
      const img=A(this.add.image(cx,cy,key));
      img.setScale(Math.min(visualSize/(img.width||1),visualSize/(img.height||1)));
      return;
    }

    if(!this.failedAssets.has(key)&&!this.loadingAssets.has(key)){
      this.loadingAssets.add(key);
      const cleanup=()=>{
        this.loadingAssets.delete(key);
        this.load.off(`filecomplete-image-${key}`,ok);
        this.load.off('loaderror',err);
      };
      const ok=()=>{cleanup();if(this.root?.scene)this.render();};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets.add(key);if(this.root?.scene)this.render();};
      this.load.once(`filecomplete-image-${key}`,ok);
      this.load.on('loaderror',err);
      this.load.image(key,`${CRAFT_BASE}${rel}?v=20260812-2`);
      if(!this.load.isLoading())this.load.start();
    }

    // Fallback temporal mientras carga o si falta el fichero.
    const g=A(this.add.graphics());
    g.fillStyle(item.tone||0x2dcfff,.12);g.fillCircle(cx,cy,visualSize*.48);
    g.lineStyle(2,item.tone||0x2dcfff,.55);g.strokeCircle(cx,cy,visualSize*.46);
    A(this.add.text(cx,cy,item.icon||'◆',{fontFamily:'system-ui',fontSize:`${Math.max(18,Math.round(visualSize*.55))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5));
  }

  _equippedStrip(A,r,compact){
    const families=['engine','brakes','tires','suspension','transmission'];
    const eq=getEquippedForCar(this.state,this.car)||{};
    const g=A(this.add.graphics());
    g.fillStyle(0x03080b,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,9);
    g.lineStyle(1,0x223c47,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);
    const gap=5,cw=(r.w-gap*4)/5;

    families.forEach((f,i)=>{
      const x=r.x+i*(cw+gap),item=eq[f]?GARAGE_ITEMS[eq[f]]:null;
      const q=A(this.add.graphics());
      q.fillStyle(item?0x0a1b21:0x081116);q.fillRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);
      q.lineStyle(1,item?(item.tone||0x2dcfff):0x2b424c,.65);q.strokeRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);

      if(item){
        const artSize=Math.min(compact?30:40,r.h*.58,cw*.30);
        this._itemArt(A,item,x+10+artSize/2,r.y+r.h/2,artSize);
        A(this.add.text(x+cw*.61,r.y+(compact?12:15),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
        A(this.add.text(x+cw*.61,r.y+r.h-(compact?12:15),`${item.name} · T${item.tier}`,{fontFamily:'system-ui',fontSize:compact?'7px':'8.5px',fontStyle:'700',color:'#66dfff',align:'center',wordWrap:{width:cw*.66}}).setOrigin(.5));
      }else{
        A(this.add.text(x+cw/2,r.y+(compact?14:17),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
        A(this.add.text(x+cw/2,r.y+r.h-(compact?13:16),'SIN EQUIPAR',{fontFamily:'system-ui',fontSize:compact?'8px':'9px',fontStyle:'700',color:'#667a83'}).setOrigin(.5));
      }
    });
  }
}

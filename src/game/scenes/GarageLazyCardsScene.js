import { GarageScene as CurrentGarageScene } from './GarageResponsiveHeroScene.js';
import { recordGarageVisit } from '../seasons/seasonTelemetry.js';
import { devFullCarAccessEnabled, isCarUnlocked, STARTER_CAR_ID } from '../cars/carUnlocks.js';

const CARDS = [
  ['card_avenir_apex','card_avenir_apex_raro_008.webp'],
  ['card_avenir_gripline','card_avenir_gripline_poco_comun_007.webp'],
  ['card_avenir_torque','card_avenir_torque_elite_009.webp'],
  ['card_crown_axis','card_crown_axis_poco_comun_004.webp'],
  ['card_crown_equinox','card_crown_equinox_raro_006.webp'],
  ['card_crown_vector','card_crown_vector_raro_005.webp'],
  ['card_forge_anvil','card_forge_anvil_elite_014.webp'],
  ['card_forge_colossus','card_forge_colossus_legendario_015.webp'],
  ['card_forge_hammer','card_forge_hammer_raro_013.webp'],
  ['card_helix_comet','card_helix_comet_poco_comun_002.webp'],
  ['card_helix_pulse','card_helix_pulse_poco_comun_003.webp'],
  ['card_helix_spark','card_helix_spark_comun_001.webp'],
  ['card_helix_vortex','card_helix_vortex_raro_016.webp'],
  ['card_veloce_flash','card_veloce_flash_poco_comun_010.webp'],
  ['card_veloce_photon','card_veloce_photon_elite_012.webp'],
  ['card_veloce_surge','card_veloce_surge_raro_011.webp']
];

export class GarageScene extends CurrentGarageScene {
  preload(){
    super.preload?.();
    this.load.setPath('assets/cars/runtime');
    for(const [key,file] of CARDS){if(!this.textures.exists(key))this.load.image(key,file);}
    this.load.setPath('');
  }

  _fullAccess(){return this._mode==='admin'||devFullCarAccessEnabled();}
  _lockedCar(carId){return !this._fullAccess()&&!isCarUnlocked(carId);}

  create(){
    super.create();
    if(!this._fullAccess()){
      let savedCarId=null;try{savedCarId=localStorage.getItem('tdr2:carId');}catch{}
      if(!savedCarId||this._lockedCar(savedCarId)){
        const starterIndex=(this._cars||[]).findIndex(car=>car?.id===STARTER_CAR_ID);
        this._selectedIndex=starterIndex>=0?starterIndex:0;
        const starter=this._cars?.[this._selectedIndex];
        if(starter)try{localStorage.setItem('tdr2:carId',starter.id);}catch{}
      }
      // Keep the complete collection visible; progression is represented by
      // silhouettes instead of removing content from the garage.
      this._rebuild();
    }
    recordGarageVisit();
    if(window.__tdrIosSafeMode===true){this.events.once('shutdown',()=>{for(const [key] of CARDS){try{if(this.textures?.exists?.(key))this.textures.remove(key);}catch{}}});}
  }

  _createThumbItem(...args){
    const item=super._createThumbItem(...args),carId=args[4];
    if(!item||!this._lockedCar(carId))return item;
    try{item.name?.setText('???');item.meta?.setText('🔒  COCHE BLOQUEADO\nDESCÚBRELO JUGANDO');item.cardImg?.setTint?.(0x000000);item.bg?.setFillStyle?.(0x080d16,.82);item.accent?.setFillStyle?.(0x52606d,.75);}catch{}
    return item;
  }

  _showDomHeroCard(carId,spec,heroCard){
    super._showDomHeroCard(carId,spec,heroCard);
    const locked=this._lockedCar(carId),dom=this._garageDomCard;
    if(dom?.img){dom.img.style.filter=locked?'brightness(0) drop-shadow(0 0 8px rgba(70,221,255,.35))':'';dom.img.alt=locked?'Coche misterioso':'';}
    if(dom?.root)dom.root.classList.toggle('is-holographic',!locked&&(spec?.cardEffect==='holographic'||['épico','epico','legendario'].includes(String(spec?.rarity||'').toLowerCase())));
  }

  _refreshSelection(...args){
    super._refreshSelection(...args);
    const selected=this._cars?.[this._selectedIndex];if(!selected||!this._lockedCar(selected.id))return;
    try{
      this._uiRefs?.title?.setText('???');
      this._uiRefs?.brand?.setText('COCHE MISTERIOSO');
      this._uiRefs?.meta?.setText('🔒 BLOQUEADO\n\nConsíguelo mediante temporadas, eventos o progresión.');
      this._uiRefs?.statText?.setText('VEL PUNTA   ???\nACELERACIÓN ???\nFRENADA     ???');
      this._uiRefs?.btnMainLabel?.setText('BLOQUEADO');
      const thumb=this._thumbItems?.[this._selectedIndex];thumb?.cardImg?.setTint?.(0x000000);
    }catch{}
  }

  _activatePrimary(){
    const selected=this._cars?.[this._selectedIndex];
    if(selected&&this._lockedCar(selected.id))return;
    super._activatePrimary();
  }

  _rebuild(...args){super._rebuild(...args);this._applyFloatingHeader();}
  _applyFloatingHeader(){
    const W=this.scale.width,top=8,h=56,side=Math.max(10,Math.min(24,W*.015));
    for(const obj of this.children?.list||[]){const type=String(obj?.type||'');if((type==='Text'||type==='Rectangle')&&Number.isFinite(Number(obj?.y))&&obj.y<64){obj.y+=top;try{obj.setDepth?.(1002);}catch{}}}
    const plate=this.add.graphics().setDepth(1000);plate.fillStyle(0x06121d,.95).fillRoundedRect(side,top,W-side*2,h,13);plate.lineStyle(1,0x46ddff,.34).strokeRoundedRect(side,top,W-side*2,h,13);plate.lineStyle(2,0xe6b84e,.82).lineBetween(side+16,top+1,side+Math.min(260,W*.22),top+1);
  }
}

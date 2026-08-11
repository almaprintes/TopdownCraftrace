import { UpgradeShopScene as PremiumWorkshopV2 } from './UpgradeWorkshopPremiumV2Scene.js';

const WORKSHOP_BASE='assets/cars/workshop/';

export class UpgradeShopScene extends PremiumWorkshopV2 {
  create(){
    // Reintentar los renders limpios cada vez que se entra al taller.
    // Esto permite añadir nuevos WebP al repositorio sin que una búsqueda 404 anterior
    // deje al coche condenado a mostrar la carta durante toda la sesión.
    this._workshopMissing=new Set();
    super.create();
  }

  _carImage(A,spec,r){
    // Clave separada y versionada: jamás reutiliza la textura de las cartas runtime.
    const cleanKey=`workshop_render_v2_${this.car}`;
    const cx=r.x+r.w*.49,cy=r.y+r.h*.46,w=r.w*.90,h=r.h*.88;

    const showClean=()=>{
      if(!this.textures.exists(cleanKey))return false;
      const img=A(this.add.image(cx,cy,cleanKey));
      img.setScale(Math.min(w/(img.width||1),h/(img.height||1)));
      return true;
    };

    if(showClean())return;

    // Solo hacemos un intento por entrada a la escena; si no existe, usamos la carta.
    if(this._workshopMissing?.has(cleanKey)){
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
      // Reconstruimos el panel para mostrar el render limpio recién cargado.
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
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp?v=2`);
    if(!this.load.isLoading())this.load.start();
  }
}

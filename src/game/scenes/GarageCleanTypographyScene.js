import { GarageScene as CurrentGarageScene } from './GarageUiStabilityScene.js';

const GARAGE_PERSONALITY={
  helix_spark:'Facilísimo y predecible. Su límite llega pronto: perfecto para aprender, enseguida querrás hacerlo correr más.',
  helix_comet:'Sumamente divertido y permisivo. Mantiene el ADN HÉLIX, pero ya invita a buscar ritmo en cada curva.',
  helix_pulse:'Muy fácil de llevar y magnífico al salir de curva. Rápido, limpio y con una respuesta que engancha.',
  crown_axis:'Refinado y muy accesible. Hace fácil ir deprisa y transmite control desde las primeras curvas.',
  crown_vector:'Fluido y progresivo. Te deja construir la vuelta y cada décima aparece cuando entiendes mejor la trazada.',
  crown_equinox:'Potencia seria con riesgo real. Cuando lo clavas vuela; si te pasas, te recuerda enseguida dónde está el límite.',
  avenir_gripline:'Mucho control y bastante velocidad. Preciso de morro, inspira confianza y coloca el coche donde se lo pides.',
  avenir_apex:'Nervioso al principio, pero se deja domar rápido. Exige atención y recompensa enseguida cuando entiendes su giro.',
  avenir_torque:'Sublime: se come los pianos como un poseso y parece ir por raíles. Potente al salir y muy veloz cuando estira.',
  veloce_flash:'Rápido y exigente. La trasera se mueve mucho y obliga a frenar de verdad antes de atacar la salida.',
  veloce_surge:'Más salvaje que el Flash. Hay que orientar bien el coche antes de abrir gas o la pista se acaba muy deprisa.',
  veloce_photon:'Potro indomable. Aceleración de otro planeta y cero paciencia con una mala colocación: dominarlo es parte del premio.',
  forge_hammer:'Tremendamente complicado y muy peculiar. Se va incluso a poca velocidad, aunque la hierba apenas castiga sus excesos.',
  forge_anvil:'Brutal en las chicanes: exige casi parar para reorientarlo. El gas a pequeños empujones es la clave para domarlo.',
  forge_colossus:'Un gigante que pide peso y anticipación. Si lo fuerzas, el morro tiembla y la zaga baila mucho más de lo esperado.'
};

export class GarageScene extends CurrentGarageScene {
  _queueSelectedThumbCenter(){
    try{this._selectedCenterTimer?.remove?.(false);}catch(_){}
    this._selectedCenterTimer=this.time.delayedCall(0,()=>{
      if(!this.sys?.isActive?.())return;
      const selected=this._thumbItems?.[this._selectedIndex];
      if(!selected?.item||!selected?.bg||!this._thumbViewport)return;
      const itemCenter=selected.item.y+(selected.bg.height*.5);
      const viewCenter=this._thumbViewport.height*.5;
      const target=Math.max(this._thumbMinScroll,Math.min(0,-(itemCenter-viewCenter)));
      this._scrollVelocity=0;
      this.tweens?.killTweensOf?.(this);
      this._setThumbScroll(target);
    });
  }

  _rebuild(...args){
    super._rebuild(...args);
    // iOS can issue a stabilising resize immediately after scene creation.
    // Recenter after that rebuild instead of restoring the list to its top.
    this._queueSelectedThumbCenter();
  }

  _createThumbItem(x,y,w,h,carId,spec,index){
    const entry=super._createThumbItem(x,y,w,h,carId,spec,index);
    entry?.hit?.on('pointerup',()=>{
      if(this._selectedIndex!==index||this._isDraggingThumbs)return;
      const selected=this._thumbItems?.[index]||entry;
      if(!selected?.item||!selected?.bg||!this._thumbViewport)return;
      const centered=this._thumbViewport.height/2-(selected.item.y+selected.bg.height/2);
      this._scrollVelocity=0;
      this.tweens?.killTweensOf?.(this);
      this._setThumbScroll(centered);
    });
    return entry;
  }

  _buildHeroPanel(x,y,w,h){
    this._hero.removeAll(true);
    this._hero.setPosition(0,0);

    const panel=this.add.graphics();
    panel.fillStyle(0x0b1020,.36).fillRoundedRect(x,y,w,h,28);
    panel.lineStyle(2,0xb7c0ff,.18).strokeRoundedRect(x,y,w,h,28);
    const glow=this.add.graphics();
    glow.fillStyle(0x2bff88,.04).fillEllipse(x+w*.65,y+h*.52,w*.55,h*.65);

    const cardZoneW=Math.floor(w*.46);
    const infoX=x+cardZoneW+18;
    const infoW=w-cardZoneW-32;

    const heroCard=this.add.image(x+Math.floor(cardZoneW/2),y+Math.floor(h*.46),'__MISSING').setVisible(false);

    const title=this.add.text(infoX,y+20,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'27px',fontStyle:'bold',color:'#fff',wordWrap:{width:infoW}});
    const brand=this.add.text(infoX,y+72,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'16px',fontStyle:'bold',color:'#2bff88'});
    const meta=this.add.text(infoX,y+103,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'13px',color:'#b7c0ff',lineSpacing:4,wordWrap:{width:infoW}});
    const personality=this.add.text(infoX,y+185,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'12px',fontStyle:'italic',color:'#dfe6ff',lineSpacing:3,wordWrap:{width:infoW},maxLines:3});

    const statH=78;
    const statY=y+h-146;
    const statPanel=this.add.rectangle(infoX+Math.floor(infoW/2),statY+statH/2,infoW,statH,0x111a33,.58).setStrokeStyle(1,0xffffff,.09);
    const statText=this.add.text(infoX+16,statY+10,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'13px',fontStyle:'600',color:'#fff',lineSpacing:5});

    const btnMain=this._makeHeroButton(infoX,y+h-58,Math.floor(infoW*.60),46,this._mode==='admin'?'EDITAR COCHE':'SELECCIONAR',true);
    const btnSecondary=this._makeHeroButton(infoX+Math.floor(infoW*.60)+12,y+h-58,Math.floor(infoW*.34),46,this._mode==='admin'?'VER FICHA':'VOLVER',false);

    this._hero.add([panel,glow,heroCard,title,brand,meta,personality,statPanel,statText,btnMain.container,btnSecondary.container]);
    btnMain.hit.on('pointerdown',()=>this._activatePrimary());
    btnSecondary.hit.on('pointerdown',()=>this._activateSecondary());

    this._uiRefs.heroCard=heroCard;
    this._uiRefs.title=title;
    this._uiRefs.brand=brand;
    this._uiRefs.meta=meta;
    this._uiRefs.personality=personality;
    this._uiRefs.statText=statText;
    this._uiRefs.btnMainLabel=btnMain.label;
    this._uiRefs.btnSecondaryLabel=btnSecondary.label;
  }

  _refreshSelection(){
    super._refreshSelection();
    const selected=this._cars?.[this._selectedIndex];
    if(this._uiRefs?.personality){
      this._uiRefs.personality.setText(GARAGE_PERSONALITY[selected?.id]||'');
    }
  }
}

import { GarageScene as CurrentGarageScene } from './GarageUiStabilityScene.js';
import { t } from '../i18n/index.js';

export class GarageScene extends CurrentGarageScene {
  create(){
    super.create();
    let probe=false;
    try{probe=sessionStorage.getItem('tdr2:adminInputProbe')==='1'&&this._mode==='admin';}catch{}
    if(probe)this._installAdminInputProbe();
  }

  _installAdminInputProbe(){
    const canvas=this.game?.canvas;
    const host=canvas?.parentElement||document.body;
    if(!canvas||!host)return;
    let domDown=0,domUp=0,phDown=0,phUp=0;
    const box=document.createElement('div');
    box.style.cssText='position:absolute;left:8px;top:8px;z-index:999999;pointer-events:none;background:rgba(0,0,0,.86);border:2px solid #ffcc33;color:#fff;padding:7px 9px;font:700 11px/1.35 system-ui;white-space:pre;';
    const render=()=>{box.textContent=`INPUT PROBE\nDOM ↓${domDown} ↑${domUp}\nPHASER ↓${phDown} ↑${phUp}\ninput.enabled=${this.input?.enabled!==false}`;};
    render();
    host.appendChild(box);
    const onDomDown=()=>{domDown++;render();};
    const onDomUp=()=>{domUp++;render();};
    const onPhDown=()=>{phDown++;render();};
    const onPhUp=()=>{phUp++;render();};
    canvas.addEventListener('pointerdown',onDomDown,true);
    canvas.addEventListener('pointerup',onDomUp,true);
    this.input.on('pointerdown',onPhDown);
    this.input.on('pointerup',onPhUp);
    this.events.once('shutdown',()=>{
      canvas.removeEventListener('pointerdown',onDomDown,true);
      canvas.removeEventListener('pointerup',onDomUp,true);
      try{this.input.off('pointerdown',onPhDown);this.input.off('pointerup',onPhUp);}catch{}
      try{box.remove();}catch{}
      try{sessionStorage.removeItem('tdr2:adminInputProbe');}catch{}
    });
  }

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

    const btnMain=this._makeHeroButton(infoX,y+h-58,Math.floor(infoW*.60),46,this._mode==='admin'?t('garage.editCar'):t('garage.select'),true);
    const btnSecondary=this._makeHeroButton(infoX+Math.floor(infoW*.60)+12,y+h-58,Math.floor(infoW*.34),46,this._mode==='admin'?t('garage.viewSpecs'):t('garage.back'),false);

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
      this._uiRefs.personality.setText(selected?.id?t(`garage.personality.${selected.id}`):'');
    }
  }
}

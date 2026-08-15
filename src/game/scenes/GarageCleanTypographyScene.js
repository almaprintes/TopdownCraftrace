import { GarageScene as CurrentGarageScene } from './GarageUiStabilityScene.js';

export class GarageScene extends CurrentGarageScene {
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

    // Performance has its own reserved block; it can no longer collide with
    // collection/category metadata on short iPhone landscape heights.
    const statH=78;
    const statY=y+h-146;
    const statPanel=this.add.rectangle(infoX+Math.floor(infoW/2),statY+statH/2,infoW,statH,0x111a33,.58).setStrokeStyle(1,0xffffff,.09);
    const statText=this.add.text(infoX+16,statY+10,'',{fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:'13px',fontStyle:'600',color:'#fff',lineSpacing:5});

    const btnMain=this._makeHeroButton(infoX,y+h-58,Math.floor(infoW*.60),46,this._mode==='admin'?'EDITAR COCHE':'SELECCIONAR',true);
    const btnSecondary=this._makeHeroButton(infoX+Math.floor(infoW*.60)+12,y+h-58,Math.floor(infoW*.34),46,this._mode==='admin'?'VER FICHA':'VOLVER',false);

    this._hero.add([panel,glow,heroCard,title,brand,meta,statPanel,statText,btnMain.container,btnSecondary.container]);
    btnMain.hit.on('pointerdown',()=>this._activatePrimary());
    btnSecondary.hit.on('pointerdown',()=>this._activateSecondary());

    this._uiRefs.heroCard=heroCard;
    this._uiRefs.title=title;
    this._uiRefs.brand=brand;
    this._uiRefs.meta=meta;
    this._uiRefs.statText=statText;
    this._uiRefs.btnMainLabel=btnMain.label;
    this._uiRefs.btnSecondaryLabel=btnSecondary.label;
  }
}

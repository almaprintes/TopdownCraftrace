import { GarageScene as CurrentGarageScene } from './GarageCleanTypographyScene.js';
import { t } from '../i18n/index.js';

export class GarageScene extends CurrentGarageScene {
  _buildHeroPanel(x,y,w,h){
    this._hero.removeAll(true);
    this._hero.setPosition(0,0);

    const compact=h<430;
    const veryCompact=h<370;
    const panel=this.add.graphics();
    panel.fillStyle(0x0b1020,.36).fillRoundedRect(x,y,w,h,28);
    panel.lineStyle(2,0xb7c0ff,.18).strokeRoundedRect(x,y,w,h,28);
    const glow=this.add.graphics();
    glow.fillStyle(0x2bff88,.04).fillEllipse(x+w*.65,y+h*.52,w*.55,h*.65);

    const cardZoneW=Math.floor(w*(compact?.43:.46));
    const infoX=x+cardZoneW+18;
    const infoW=w-cardZoneW-32;
    const padTop=compact?12:18;
    const buttonH=compact?40:46;
    const buttonY=y+h-buttonH-10;
    const statsH=compact?64:76;
    const statsY=buttonY-statsH-(compact?8:12);

    const heroCard=this.add.image(x+Math.floor(cardZoneW/2),y+Math.floor(h*.47),'__MISSING').setVisible(false);

    const title=this.add.text(infoX,y+padTop,'',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:veryCompact?'20px':compact?'23px':'27px',fontStyle:'bold',color:'#fff',
      wordWrap:{width:infoW},maxLines:2
    });
    const brandY=y+padTop+(veryCompact?38:compact?44:52);
    const brand=this.add.text(infoX,brandY,'',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:compact?'14px':'16px',fontStyle:'bold',color:'#2bff88'
    });
    const metaY=brandY+(compact?24:30);
    const meta=this.add.text(infoX,metaY,'',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:veryCompact?'10px':compact?'11px':'13px',color:'#b7c0ff',
      lineSpacing:compact?2:4,wordWrap:{width:infoW},maxLines:3
    });

    const personalityY=Math.min(metaY+(compact?54:68),statsY-(compact?46:58));
    const personality=this.add.text(infoX,personalityY,'',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:veryCompact?'9px':compact?'10px':'12px',fontStyle:'italic',color:'#dfe6ff',
      lineSpacing:compact?1:3,wordWrap:{width:infoW},maxLines:compact?2:3
    });

    const statPanel=this.add.rectangle(infoX+Math.floor(infoW/2),statsY+statsH/2,infoW,statsH,0x111a33,.64)
      .setStrokeStyle(1,0xffffff,.10);
    const statText=this.add.text(infoX+12,statsY+(compact?7:9),'',{
      fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize:veryCompact?'10px':compact?'11px':'13px',fontStyle:'600',color:'#fff',
      lineSpacing:compact?2:5,wordWrap:{width:infoW-24}
    });

    const mainW=Math.floor(infoW*.60);
    const secondaryW=Math.max(72,infoW-mainW-10);
    const btnMain=this._makeHeroButton(infoX,buttonY,mainW,buttonH,this._mode==='admin'?t('garage.editCar'):t('garage.select'),true);
    const btnSecondary=this._makeHeroButton(infoX+mainW+10,buttonY,secondaryW,buttonH,this._mode==='admin'?t('garage.viewSpecs'):t('garage.back'),false);

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
}

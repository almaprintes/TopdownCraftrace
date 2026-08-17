import { GarageScene as CurrentGarageScene } from './GarageUiStabilityScene.js';
import { loadGarage } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

const INVENTORY_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];

export class GarageScene extends CurrentGarageScene {
  _rebuild(){
    super._rebuild();
    this._renderInventoryButton();
  }

  _renderInventoryButton(){
    const {width}=this.scale;
    const cx=width-104,cy=55;
    const bg=this.add.rectangle(cx,cy,152,28,0x10273a,.96)
      .setStrokeStyle(1,0x35cfff,.52)
      .setDepth(10020)
      .setInteractive({useHandCursor:true});
    const label=this.add.text(cx,cy,'INVENTARIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#8deaff',letterSpacing:1})
      .setOrigin(.5).setDepth(10021);
    bg.on('pointerover',()=>bg.setFillStyle(0x16364d,.98));
    bg.on('pointerout',()=>bg.setFillStyle(0x10273a,.96));
    bg.on('pointerup',()=>this._openInventoryModal());
    this._uiRefs.inventoryButton=bg;
    this._uiRefs.inventoryButtonLabel=label;
  }

  _openInventoryModal(){
    if(this._inventoryModal?.scene)return;
    const {width,height}=this.scale;
    const garage=loadGarage();
    const panelW=Math.min(width-36,760);
    const panelH=Math.min(height-30,390);
    const cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(20000);
    this._inventoryModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.82).setOrigin(0).setInteractive();
    root.add(veil);
    const panel=this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.99).setStrokeStyle(2,0x45dfff,.72);
    root.add(panel);

    root.add(this.add.text(cx,cy-panelH/2+18,'INVENTARIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+52,`◈ ${Math.max(0,Number(garage.coins)||0)} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    const cols=4;
    const gap=10;
    const pad=22;
    const gridW=panelW-pad*2;
    const cardW=(gridW-gap*(cols-1))/cols;
    const cardH=Math.min(92,(panelH-132-gap)/2);
    const startX=cx-gridW/2;
    const startY=cy-panelH/2+88;

    INVENTORY_IDS.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{};
      const col=i%cols,row=Math.floor(i/cols);
      const x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);
      const qty=Math.max(0,Number(garage.inventory?.[id])||0);
      root.add(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(1,qty>0?0x355064:0x24323e,qty>0 ? .9 : .55));
      root.add(this.add.text(x+cardW/2,y+10,item.icon||'◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',color:qty>0?'#ffffff':'#65717c'}).setOrigin(.5,0));
      root.add(this.add.text(x+cardW/2,y+39,String(item.name||id).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:qty>0?'#aebdca':'#667583',align:'center',wordWrap:{width:cardW-12}}).setOrigin(.5,0));
      root.add(this.add.text(x+cardW/2,y+cardH-28,`×${qty}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color:qty>0?'#62ffb2':'#71808d'}).setOrigin(.5,0));
    });

    const closeBg=this.add.rectangle(cx,cy+panelH/2-26,180,34,0x153244,.98).setStrokeStyle(1,0x45dfff,.65).setInteractive({useHandCursor:true});
    const closeText=this.add.text(cx,cy+panelH/2-26,'CERRAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([closeBg,closeText]);
    const close=()=>{try{root.destroy(true);}catch{} if(this._inventoryModal===root)this._inventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',close);
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

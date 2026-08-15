import { UpgradeShopScene as CraftAssetsScene } from './UpgradeWorkshopCraftAssetsScene.js';
import { GARAGE_ITEMS, stripRecipeCanAccept } from '../garage/partsCatalog.js';
import { qty } from '../garage/garageStore.js';

const UI_FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const CRAFT_BASE=`${import.meta.env.BASE_URL || './'}assets/crafting/`;
const MATERIAL_FILES={
  scrap:'materials/chatarra.webp',
  alloy:'materials/aleacion.webp',
  rubber:'materials/goma.webp',
  compound:'materials/compuesto.webp',
  disc:'materials/disco_metalico.webp',
  spring:'materials/muelle.webp',
  gear:'materials/engranaje.webp',
  ecu:'materials/electronica.webp'
};
const PART_FILES={
  engine_street:'parts/engine/engine_street.webp',engine_sport:'parts/engine/engine_sport.webp',engine_racing:'parts/engine/engine_racing.webp',engine_prototype:'parts/engine/engine_prototype.webp',
  brakes_street:'parts/brakes/brakes_street.webp',brakes_sport:'parts/brakes/brakes_sport.webp',brakes_racing:'parts/brakes/brakes_racing.webp',brakes_prototype:'parts/brakes/brakes_prototype.webp',
  tires_street:'parts/tires/tires_street.webp',tires_sport:'parts/tires/tires_sport.webp',tires_racing:'parts/tires/tires_racing_t3.webp',tires_prototype:'parts/tires/tires_prototype_t4.webp',
  suspension_street:'parts/suspension/suspension_street_t1.webp',suspension_sport:'parts/suspension/suspension_sport_t2.webp',suspension_racing:'parts/suspension/suspension_racing_t3.webp',suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',
  transmission_street:'parts/transmission/transmission_street_t1.webp',transmission_sport:'parts/transmission/transmission_sport_t2.webp',transmission_racing:'parts/transmission/transmission_racing_t3.webp',transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};

function craftPath(item){
  if(!item)return null;
  const rel=item.kind==='material'?MATERIAL_FILES[item.id]:PART_FILES[item.id];
  return rel?`${CRAFT_BASE}${rel}?v=20260815-fullbleed1`:null;
}

export class UpgradeShopScene extends CraftAssetsScene {
  create(){
    this._invPage=0;
    super.create();
  }

  _bg(A,w,h){
    const g=A(this.add.graphics());
    g.fillStyle(0x0b1d42,1);g.fillRect(0,0,w,h);
    g.fillStyle(0x14336c,.82);g.fillEllipse(w*.72,h*.37,w*.62,h*.74);
    g.fillStyle(0x0b2a4e,.52);g.fillEllipse(w*.34,h*.68,w*.82,h*.62);
    g.lineStyle(1,0x7aa5d8,.09);
    const step=Math.max(42,Math.round(w/18));
    for(let x=0;x<w;x+=step)g.lineBetween(x,0,x,h);
    for(let y=0;y<h;y+=step)g.lineBetween(0,y,w,y);
    g.fillStyle(0x020711,.18);g.fillRect(0,0,w,h);
  }

  _header(A,w,compact){
    const h=compact?50:62;
    const g=A(this.add.graphics());
    g.fillStyle(0x071226,.94);g.fillRect(0,0,w,h);
    g.lineStyle(1,0x5173a8,.50);g.lineBetween(0,h-1,w,h-1);

    const back=A(this.add.text(18,h/2,'←',{fontFamily:UI_FONT,fontSize:compact?'25px':'30px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
    A(this.add.text(compact?55:64,h/2,'GARAJE',{fontFamily:UI_FONT,fontSize:compact?'16px':'20px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5));
    A(this.add.text(w*.57,h/2,'FABRICACIÓN',{fontFamily:UI_FONT,fontSize:compact?'21px':'27px',fontStyle:'700',color:'#ffffff'}).setOrigin(.5));
    A(this.add.text(w-20,h/2,`●  ${Number(this.state?.coins||0).toLocaleString('es-ES')}`,{fontFamily:UI_FONT,fontSize:compact?'13px':'17px',fontStyle:'700',color:'#ffd45a'}).setOrigin(1,.5));
  }

  _panel(A,r,accent=0x2bff88){
    const g=A(this.add.graphics());
    g.fillStyle(0x0a1732,.82);g.fillRoundedRect(r.x,r.y,r.w,r.h,22);
    g.lineStyle(2,0x5776ad,.35);g.strokeRoundedRect(r.x,r.y,r.w,r.h,22);
    g.lineStyle(2,accent,.55);g.lineBetween(r.x+18,r.y+1,r.x+Math.min(r.w*.32,220),r.y+1);
    return g;
  }

  _forgePanel(A,r,compact){
    this._panel(A,r,0x2bff88);
    A(this.add.text(r.x+18,r.y+12,'MESA DE FUSIÓN',{fontFamily:UI_FONT,fontSize:compact?'14px':'19px',fontStyle:'700',color:'#ffffff'}));
    A(this.add.text(r.x+r.w-18,r.y+14,'3 COMPONENTES  →  1 PIEZA',{fontFamily:UI_FONT,fontSize:compact?'7px':'9px',fontStyle:'700',color:'#72f1b8'}).setOrigin(1,0));

    const inner={x:r.x+14,y:r.y+(compact?37:47),w:r.w-28,h:r.h-(compact?47:59)};
    const inventoryH=compact?80:112;
    const forgeH=inner.h-inventoryH-(compact?8:11);
    const forge={x:inner.x,y:inner.y,w:inner.w,h:forgeH};
    const inv={x:inner.x,y:inner.y+forgeH+(compact?8:11),w:inner.w,h:inventoryH};
    this._forgeCore(A,forge,compact);
    this._inventoryShelf(A,inv,compact);
  }

  _forgeCore(A,r,compact){
    const g=A(this.add.graphics());
    g.fillStyle(0x07111f,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,16);
    g.lineStyle(1,0x42628a,.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,16);

    const cx=r.x+r.w*.54,cy=r.y+r.h*.46;
    const resultW=r.w*(compact?.37:.40),resultH=r.h*(compact?.58:.62);
    const result={x:cx-resultW/2,y:cy-resultH/2,w:resultW,h:resultH};
    const slotW=r.w*(compact?.20:.21),slotH=r.h*(compact?.27:.29);
    const s0={x:r.x+r.w*.035,y:r.y+r.h*.08,w:slotW,h:slotH};
    const s1={x:r.x+r.w*.035,y:r.y+r.h*.62,w:slotW,h:slotH};
    const s2={x:r.x+r.w*.765,y:r.y+r.h*.35,w:slotW,h:slotH};

    const line=A(this.add.graphics());
    line.lineStyle(compact?2:3,0x42d5ff,.32);
    [[s0,result],[s1,result],[s2,result]].forEach(([s,t])=>line.lineBetween(s.x+s.w,s.y+s.h/2,t.x,t.y+t.h/2));
    line.fillStyle(0x2bff88,.05);line.fillCircle(cx,cy,Math.min(resultW,resultH)*.56);
    line.lineStyle(2,0x2bff88,.23);line.strokeCircle(cx,cy,Math.min(resultW,resultH)*.54);

    this._forgeSlot(A,0,s0,compact);this._forgeSlot(A,1,s1,compact);this._forgeSlot(A,2,s2,compact);this._forgeResult(A,result,compact);
  }

  _loadFullBleed(A,item,r,onReady){
    const path=craftPath(item);
    if(!path)return false;
    const key=`craft_fullbleed_${item.id}`;
    const draw=()=>{
      if(!this.textures.exists(key))return false;
      const img=A(this.add.image(r.x+r.w/2,r.y+r.h/2,key));
      // The asset IS the tile: no inner plate, no circle, no secondary background.
      // Fill the whole usable card while keeping its aspect ratio; crop overflow naturally.
      const scale=Math.max(r.w/(img.width||1),r.h/(img.height||1));
      img.setScale(scale);
      const maskG=this.make.graphics({add:false});
      maskG.fillStyle(0xffffff,1);maskG.fillRoundedRect(r.x,r.y,r.w,r.h,Math.min(12,r.h*.12));
      img.setMask(maskG.createGeometryMask());
      return true;
    };
    if(draw())return true;
    if(this.failedAssets?.has(key))return false;
    if(!this.loadingAssets?.has(key)){
      this.loadingAssets.add(key);
      const cleanup=()=>{this.loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();if(this.root?.scene){onReady?.();this.render();}};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets.add(key);if(this.root?.scene)this.render();};
      this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,path);if(!this.load.isLoading())this.load.start();
    }
    return false;
  }

  _overlayText(A,x,y,text,size,originX=.5,originY=.5,color='#ffffff'){
    return A(this.add.text(x,y,text,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:'800',color,shadow:{offsetX:2,offsetY:2,color:'#000000',blur:4,fill:true,stroke:true}}).setOrigin(originX,originY));
  }

  _forgeSlot(A,i,r,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null;
    if(!item){
      const g=A(this.add.graphics());g.fillStyle(0x091116,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,0x334b55,.75);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
      this._overlayText(A,r.x+r.w/2,r.y+r.h/2,`+ ${i+1}`,compact?18:27,.5,.5,'#4b6570');
      return;
    }

    this._loadFullBleed(A,item,r);
    const border=A(this.add.graphics());border.lineStyle(2,item.tone||0x2bff88,1);border.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    this._overlayText(A,r.x+r.w-6,r.y+5,`×${qty(this.state,id)}`,compact?8:10,1,0);
    this._overlayText(A,r.x+r.w/2,r.y+r.h-7,item.name.toUpperCase(),compact?8:11,.5,1);
    A(this.add.rectangle(r.x,r.y,r.w,r.h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true})).on('pointerdown',()=>{if(!this.busy){this.slots.splice(i,1);this.render();}});
  }

  _itemArt(A,item,cx,cy,size){
    // Used outside the inventory cards (result/equipment). Keep the original asset clean,
    // but never add a dark inner plate around it.
    super._itemArt(A,item,cx,cy,size*1.12);
  }

  _inventoryShelf(A,r,compact){
    const g=A(this.add.graphics());
    g.fillStyle(0x081425,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,13);
    g.lineStyle(1,0x4f6e9a,.45);g.strokeRoundedRect(r.x,r.y,r.w,r.h,13);

    const tabW=compact?72:98,tabH=compact?21:27;
    this._miniTab(A,r.x+8,r.y+7,tabW,tabH,'MATERIALES','materials',compact);
    this._miniTab(A,r.x+14+tabW,r.y+7,tabW,tabH,'PIEZAS','parts',compact);

    const used={};for(const id of this.slots)used[id]=(used[id]||0)+1;
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>{
      const item=GARAGE_ITEMS[id],part=item.kind==='part';
      if(this.filter==='parts'?!part:part)return false;
      if(this.filter==='parts'&&this.selectedFamily&&item.family!==this.selectedFamily)return false;
      if(qty(this.state,id)<=0)return false;
      if(this.slots.length<3&&stripRecipeCanAccept(this.slots,id))return true;
      return(used[id]||0)>0;
    });

    const controlsW=compact?135:185;
    const startX=r.x+controlsW;
    const areaW=r.x+r.w-startX-8;
    const gap=compact?6:8,perPage=4,cw=(areaW-gap*(perPage-1))/perPage,ch=r.h-14;
    const pages=Math.max(1,Math.ceil(ids.length/perPage));
    this._invPage=Math.max(0,Math.min(this._invPage||0,pages-1));

    A(this.add.text(r.x+12,r.y+r.h-(compact?14:18),`${this._invPage+1}/${pages}`,{fontFamily:UI_FONT,fontSize:compact?'8px':'10px',fontStyle:'700',color:'#91a7c8'}));
    const mkArrow=(x,char,delta)=>{
      const b=A(this.add.rectangle(x,r.y+r.h/2,compact?28:34,compact?28:34,0x112341,.92).setStrokeStyle(1,0x5e7da9,.6).setInteractive({useHandCursor:true}));
      A(this.add.text(x,r.y+r.h/2,char,{fontFamily:UI_FONT,fontSize:compact?'15px':'18px',fontStyle:'700',color:'#ffffff'}).setOrigin(.5));
      b.on('pointerdown',()=>{if(this.busy||pages<=1)return;this._invPage=(this._invPage+delta+pages)%pages;this.render();});
    };
    mkArrow(r.x+(compact?88:118),'‹',-1);mkArrow(r.x+(compact?120:158),'›',1);

    const pageIds=ids.slice(this._invPage*perPage,this._invPage*perPage+perPage);
    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],x=startX+i*(cw+gap),y=r.y+7,card={x,y,w:cw,h:ch};
      const total=qty(this.state,id),onTable=used[id]||0,available=total-onTable;
      const enabled=this.slots.length<3&&available>0&&stripRecipeCanAccept(this.slots,id);

      // NO card background: the complete asset image is the button surface.
      this._loadFullBleed(A,item,card);
      const frame=A(this.add.graphics());frame.lineStyle(enabled?2:1,enabled?0x2bff88:0x58708f,enabled?1:.65);frame.strokeRoundedRect(x,y,cw,ch,10);

      this._overlayText(A,x+cw-7,y+6,`×${total}`,compact?9:11,1,0);
      if(onTable>0)this._overlayText(A,x+7,y+6,`EN MESA ×${onTable}`,compact?6:8,0,0,'#8effc5');
      this._overlayText(A,x+cw/2,y+ch-7,item.name.toUpperCase(),compact?8:10,.5,1,enabled?'#ffffff':'#c6cfdd');

      const hit=A(this.add.rectangle(x,y,cw,ch,0x000000,.001).setOrigin(0));
      if(enabled){hit.setInteractive({useHandCursor:true});hit.on('pointerdown',()=>this._select(id));}
    });

    if(!ids.length)this._overlayText(A,startX+areaW/2,r.y+r.h/2,'SIN COMPONENTES EN INVENTARIO',compact?8:10,.5,.5,'#72849f');
  }

  _miniTab(A,x,y,w,h,label,key,compact){
    const on=this.filter===key;
    const q=A(this.add.rectangle(x,y,w,h,on?0x123b34:0x10213b,.96).setOrigin(0).setStrokeStyle(on?2:1,on?0x2bff88:0x506c96,on?1:.5).setInteractive({useHandCursor:true}));
    A(this.add.text(x+w/2,y+h/2,label,{fontFamily:UI_FONT,fontSize:compact?'7px':'9px',fontStyle:'700',color:on?'#8effc5':'#d6deec'}).setOrigin(.5));
    q.on('pointerdown',()=>{if(!this.busy){this.filter=key;this._invPage=0;this.render();}});
  }

  _familyDock(A,r,compact){
    const oldPage=this._invPage;super._familyDock(A,r,compact);this._invPage=oldPage;
  }
}

import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopUnifiedStyleScene.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { qty, saveGarage } from '../garage/garageStore.js';

const UI='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const TIERS=['street','sport','racing','prototype'];
const TIER_LABEL={street:'STREET',sport:'SPORT',racing:'RACING',prototype:'PROTOTYPE'};
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};

export class UpgradeShopScene extends PreviousWorkshop {
  create(){
    this.craftFamily=this.craftFamily||'engine';
    this.craftTier=this.craftTier||'street';
    super.create();
  }

  _forgePanel(A,r,compact){
    this._panel(A,r,TIER_COLOR[this.craftTier]);
    A(this.add.text(r.x+18,r.y+12,'FABRICACIÓN DIRECTA',{fontFamily:UI,fontSize:compact?'14px':'19px',fontStyle:'700',color:'#fff'}));
    A(this.add.text(r.x+r.w-18,r.y+14,'ELIGE PIEZA · REVISA · FABRICA',{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'700',color:'#9fb4ce'}).setOrigin(1,0));
    const inner={x:r.x+14,y:r.y+(compact?38:49),w:r.w-28,h:r.h-(compact?49:62)};
    const familyH=compact?42:55,tierH=compact?45:60,gap=compact?7:10;
    this._familySelector(A,{x:inner.x,y:inner.y,w:inner.w,h:familyH},compact);
    this._tierSelector(A,{x:inner.x,y:inner.y+familyH+gap,w:inner.w,h:tierH},compact);
    this._recipeCard(A,{x:inner.x,y:inner.y+familyH+tierH+gap*2,w:inner.w,h:inner.h-familyH-tierH-gap*2},compact);
  }

  _familySelector(A,r,compact){
    const gap=compact?5:7,cw=(r.w-gap*4)/5;
    FAMILIES.forEach((f,i)=>{
      const on=this.craftFamily===f,x=r.x+i*(cw+gap);
      const b=A(this.add.rectangle(x,r.y,cw,r.h,on?0x153a55:0x0b1830,on?.98:.9).setOrigin(0).setStrokeStyle(on?2:1,on?0x5ce5ff:0x486384,on?1:.6).setInteractive({useHandCursor:true}));
      A(this.add.text(x+cw/2,r.y+r.h/2,LABEL[f],{fontFamily:UI,fontSize:compact?'8px':'11px',fontStyle:'800',color:on?'#fff':'#9aacc4'}).setOrigin(.5));
      b.on('pointerdown',()=>{if(this.busy)return;this.craftFamily=f;this.craftTier='street';this.render();});
    });
  }

  _tierSelector(A,r,compact){
    const gap=compact?6:9,cw=(r.w-gap*3)/4;
    TIERS.forEach((t,i)=>{
      const on=this.craftTier===t,x=r.x+i*(cw+gap),id=`${this.craftFamily}_${t}`,owned=qty(this.state,id);
      const b=A(this.add.rectangle(x,r.y,cw,r.h,on?0x17223c:0x09152a,.96).setOrigin(0).setStrokeStyle(on?2:1,TIER_COLOR[t],on?1:.45).setInteractive({useHandCursor:true}));
      A(this.add.text(x+cw/2,r.y+r.h*.39,TIER_LABEL[t],{fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'800',color:'#fff'}).setOrigin(.5));
      A(this.add.text(x+cw/2,r.y+r.h*.73,owned?`TIENES ×${owned}`:'SIN FABRICAR',{fontFamily:UI,fontSize:compact?'6px':'8px',fontStyle:'700',color:owned?'#73f2a7':'#74849b'}).setOrigin(.5));
      b.on('pointerdown',()=>{if(this.busy)return;this.craftTier=t;this.render();});
    });
  }

  _recipeCard(A,r,compact){
    const out=`${this.craftFamily}_${this.craftTier}`,item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out];
    const g=A(this.add.graphics());g.fillStyle(0x071225,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,15);g.lineStyle(1,TIER_COLOR[this.craftTier],.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,15);
    if(!item||!recipe)return;
    const art={x:r.x+10,y:r.y+10,w:r.w*(compact?.28:.31),h:r.h-20};
    this._loadFullBleed(A,item,art);
    A(this.add.text(art.x+art.w+14,r.y+10,item.name.toUpperCase(),{fontFamily:UI,fontSize:compact?'14px':'20px',fontStyle:'800',color:'#fff'}));
    A(this.add.text(art.x+art.w+14,r.y+(compact?29:38),'NECESITAS',{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'800',color:'#8ea5c3'}));
    const reqX=art.x+art.w+14,reqW=r.x+r.w-reqX-12;
    const rows=recipe.requires.length,rowH=Math.min(compact?31:43,(r.h-(compact?67:88))/Math.max(1,rows));
    let can=true,missing=[];
    recipe.requires.forEach((req,i)=>{
      const have=qty(this.state,req.id),ok=have>=req.qty;can=can&&ok;if(!ok)missing.push(`${req.qty-have} ${GARAGE_ITEMS[req.id]?.name||req.id}`);
      const y=r.y+(compact?42:55)+i*rowH;
      A(this.add.text(reqX,y,(GARAGE_ITEMS[req.id]?.name||req.id).toUpperCase(),{fontFamily:UI,fontSize:compact?'7px':'10px',fontStyle:'700',color:'#dbe7f5'}));
      A(this.add.text(reqX+reqW,y,`${have} / ${req.qty}`,{fontFamily:UI,fontSize:compact?'8px':'11px',fontStyle:'800',color:ok?'#62ef9c':'#ff6d76'}).setOrigin(1,0));
      const barY=y+(compact?12:16),barW=reqW,bh=compact?4:6;const q=A(this.add.graphics());q.fillStyle(0x16243a,1);q.fillRoundedRect(reqX,barY,barW,bh,bh/2);q.fillStyle(ok?0x4ee1a0:0xff5964,1);q.fillRoundedRect(reqX,barY,barW*Math.min(1,have/req.qty),bh,bh/2);
    });
    const bh=compact?31:40,by=r.y+r.h-bh-8;
    const button=A(this.add.rectangle(reqX,by,reqW,bh,can?0x17683f:0x273247,.98).setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9));
    const text=can?'FABRICAR':`FALTAN ${missing[0]||'MATERIALES'}`;
    A(this.add.text(reqX+reqW/2,by+bh/2,text.toUpperCase(),{fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'800',color:can?'#fff':'#aab5c5'}).setOrigin(.5));
    if(can){button.setInteractive({useHandCursor:true});button.on('pointerdown',()=>this._craftDirect(out,recipe));}
  }

  _craftDirect(out,recipe){
    if(this.busy||!recipe)return;
    if(!this.state.inventory||typeof this.state.inventory!=='object')this.state.inventory={};
    if(recipe.requires.some(r=>qty(this.state,r.id)<r.qty)){this.render();return;}
    recipe.requires.forEach(r=>{this.state.inventory[r.id]=Math.max(0,qty(this.state,r.id)-r.qty);});
    this.state.inventory[out]=qty(this.state,out)+1;
    saveGarage(this.state);
    this.render();
  }
}

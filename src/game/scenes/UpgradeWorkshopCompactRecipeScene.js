import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopInventorySizingScene.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { qty } from '../garage/garageStore.js';

const UI='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};

export class UpgradeShopScene extends PreviousWorkshop {
  _recipeCard(A,r,compact){
    const out=`${this.craftFamily}_${this.craftTier}`;
    const item=GARAGE_ITEMS[out];
    const recipe=DIRECT_CRAFT_RECIPES[out];
    const g=A(this.add.graphics());
    const accent=TIER_COLOR[this.craftTier]||0x66c6ff;
    g.fillStyle(0x071225,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,15);
    g.lineStyle(1,accent,.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,15);
    if(!item||!recipe)return;

    // Give the part artwork the left third. All material requirements now share
    // a single horizontal row, so long recipes never disappear below the card.
    const artW=r.w*(compact?.27:.30);
    const buttonH=compact?31:40;
    const pad=compact?9:12;
    const buttonY=r.y+r.h-buttonH-pad;
    const art={x:r.x+pad,y:r.y+pad,w:artW,h:Math.max(44,buttonY-r.y-pad*2)};
    this._loadFullBleed(A,item,art);

    const infoX=art.x+art.w+(compact?10:14);
    const infoW=r.x+r.w-infoX-pad;
    A(this.add.text(infoX,r.y+(compact?9:11),item.name.toUpperCase(),{
      fontFamily:UI,fontSize:compact?'13px':'19px',fontStyle:'800',color:'#fff'
    }));

    const reqs=recipe.requires||[];
    let can=true;
    const state=reqs.map(req=>{
      const have=qty(this.state,req.id);
      const ok=have>=req.qty;
      if(!ok)can=false;
      return {req,have,ok,item:GARAGE_ITEMS[req.id]};
    });

    const rowTop=r.y+(compact?36:48);
    const rowBottom=buttonY-(compact?7:9);
    const rowH=Math.max(compact?36:48,rowBottom-rowTop);
    const gap=compact?4:6;
    const count=Math.max(1,state.length);
    const cellW=(infoW-gap*(count-1))/count;

    state.forEach((s,i)=>{
      const x=infoX+i*(cellW+gap);
      const tone=s.ok?0x4ee1a0:0xff5964;
      const bg=s.ok?0x0d2c25:0x301820;
      const cell=A(this.add.graphics());
      cell.fillStyle(bg,.92);cell.fillRoundedRect(x,rowTop,cellW,rowH,compact?6:8);
      cell.lineStyle(1,tone,.8);cell.strokeRoundedRect(x,rowTop,cellW,rowH,compact?6:8);
      cell.fillStyle(tone,.95);cell.fillRect(x,rowTop,compact?3:4,rowH);

      const name=String(s.item?.name||s.req.id).toUpperCase();
      A(this.add.text(x+cellW/2,rowTop+rowH*(compact?.27:.25),name,{
        fontFamily:UI,fontSize:compact?'6px':'8px',fontStyle:'800',color:'#dbe7f5',
        align:'center',wordWrap:{width:cellW-8,useAdvancedWrap:true}
      }).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*(compact?.57:.55),`${s.have} / ${s.req.qty}`,{
        fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'900',color:s.ok?'#62ef9c':'#ff747c'
      }).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*(compact?.81:.82),s.ok?'LISTO':`FALTAN ${Math.max(0,s.req.qty-s.have)}`,{
        fontFamily:UI,fontSize:compact?'6px':'8px',fontStyle:'800',color:s.ok?'#68c99b':'#ff9aa0'
      }).setOrigin(.5));
    });

    const button=A(this.add.rectangle(infoX,buttonY,infoW,buttonH,can?0x17683f:0x273247,.98)
      .setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9));
    const missingCount=state.filter(s=>!s.ok).length;
    const text=can?'FABRICAR':missingCount===1?'FALTA 1 MATERIAL':`FALTAN ${missingCount} MATERIALES`;
    A(this.add.text(infoX+infoW/2,buttonY+buttonH/2,text,{
      fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'800',color:can?'#fff':'#aab5c5'
    }).setOrigin(.5));
    if(can){
      button.setInteractive({useHandCursor:true});
      button.on('pointerup',()=>this._craftDirect(out,recipe));
    }
  }
}

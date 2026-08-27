import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopInventorySizingScene.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { qty } from '../garage/garageStore.js';

const UI='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};
const EXCHANGEABLE=new Set(['scrap','alloy','rubber','disc','spring','gear','compound','ecu']);

function lerp(a,b,t){return Math.round(a+(b-a)*Math.max(0,Math.min(1,t)));}
function mixColor(a,b,t){const ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;const br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;return (lerp(ar,br,t)<<16)|(lerp(ag,bg,t)<<8)|lerp(ab,bb,t);}
function progressColor(p){const v=Math.max(0,Math.min(1,Number(p)||0));return v<.5?mixColor(0xff4f5e,0xffbf3f,v/.5):mixColor(0xffbf3f,0x42e58b,(v-.5)/.5);}
function hexColor(n){return `#${Number(n||0).toString(16).padStart(6,'0')}`;}

export class UpgradeShopScene extends PreviousWorkshop {
  _openRecyclerForMaterial(materialId){
    if(!EXCHANGEABLE.has(materialId))return;
    this.scene.start('menu',{openMaterialRecycler:true,materialExchangeTo:materialId});
  }

  _recipeCard(A,r,compact){
    const out=`${this.craftFamily}_${this.craftTier}`;
    const item=GARAGE_ITEMS[out];
    const recipe=DIRECT_CRAFT_RECIPES[out];
    const g=A(this.add.graphics());
    const accent=TIER_COLOR[this.craftTier]||0x66c6ff;
    g.fillStyle(0x071225,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,15);
    g.lineStyle(1,accent,.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,15);
    if(!item||!recipe)return;

    const artW=r.w*(compact?.27:.30);
    const buttonH=compact?28:36;
    const pad=compact?9:12;
    const artButtonGap=compact?5:7;
    const buttonY=r.y+r.h-buttonH-pad;
    const art={x:r.x+pad,y:r.y+pad,w:artW,h:Math.max(44,buttonY-r.y-pad-artButtonGap)};
    this._loadFullBleed(A,item,art);

    const infoX=art.x+art.w+(compact?10:14);
    const infoW=r.x+r.w-infoX-pad;
    A(this.add.text(infoX,r.y+(compact?8:10),item.name.toUpperCase(),{
      fontFamily:UI,fontSize:compact?'14px':'20px',fontStyle:'900',color:'#ffffff'
    }));

    const reqs=recipe.requires||[];
    let can=true;
    const state=reqs.map(req=>{
      const have=qty(this.state,req.id);
      const need=Math.max(1,Number(req.qty)||1);
      const ok=have>=need;
      if(!ok)can=false;
      const raw=have/need;
      return {req,have,need,ok,progress:Math.max(0,Math.min(1,raw)),percent:Math.round(raw*100),item:GARAGE_ITEMS[req.id]};
    });

    const rowTop=r.y+(compact?35:47);
    const rowBottom=r.y+r.h-pad;
    const rowH=Math.max(compact?50:62,rowBottom-rowTop);
    const gap=compact?4:6;
    const count=Math.max(1,state.length);
    const cellW=(infoW-gap*(count-1))/count;

    state.forEach((s,i)=>{
      const x=infoX+i*(cellW+gap);
      const radius=compact?7:9;
      const tone=progressColor(s.progress);
      const toneHex=hexColor(tone);
      const cell=A(this.add.graphics());
      cell.fillStyle(0x101722,.96);cell.fillRoundedRect(x,rowTop,cellW,rowH,radius);

      const innerPad=compact?3:4;
      const innerX=x+innerPad,innerY=rowTop+innerPad;
      const innerW=Math.max(1,cellW-innerPad*2),innerH=Math.max(1,rowH-innerPad*2);
      const fillH=innerH*s.progress;
      if(fillH>0){
        const fillY=innerY+innerH-fillH;
        cell.fillStyle(tone,.28);cell.fillRect(innerX,fillY,innerW,fillH);
        cell.fillStyle(tone,.88);cell.fillRect(innerX,fillY,compact?3:4,fillH);
        cell.fillStyle(tone,.82);cell.fillRect(innerX,fillY,innerW,compact?2:3);
      }
      cell.lineStyle(s.ok?2:1,tone,s.ok?1:.92);cell.strokeRoundedRect(x,rowTop,cellW,rowH,radius);

      const name=String(s.item?.name||s.req.id).toUpperCase();
      A(this.add.text(x+cellW/2,rowTop+rowH*.20,name,{
        fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'900',color:'#ffffff',align:'center',wordWrap:{width:cellW-8,useAdvancedWrap:true},shadow:{offsetX:1,offsetY:1,color:'#000000',blur:2,fill:true}
      }).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.43,`${Math.min(999,s.percent)}%`,{
        fontFamily:UI,fontSize:compact?'11px':'15px',fontStyle:'900',color:toneHex,shadow:{offsetX:1,offsetY:1,color:'#000000',blur:2,fill:true}
      }).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.65,`${s.have} / ${s.need}`,{
        fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'900',color:'#ffffff',shadow:{offsetX:1,offsetY:1,color:'#000000',blur:2,fill:true}
      }).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.84,s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`,{
        fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'900',color:s.ok?'#7dffb6':'#ffd4d7',shadow:{offsetX:1,offsetY:1,color:'#000000',blur:2,fill:true}
      }).setOrigin(.5));

      if(!s.ok&&EXCHANGEABLE.has(s.req.id)){
        const hit=A(this.add.rectangle(x,rowTop,cellW,rowH,0xffffff,0.001).setOrigin(0).setInteractive({useHandCursor:true}));
        hit.on('pointerup',()=>this._openRecyclerForMaterial(s.req.id));
      }
    });

    const button=A(this.add.rectangle(art.x,buttonY,art.w,buttonH,can?0x17683f:0x273247,.98)
      .setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9));
    const missingCount=state.filter(s=>!s.ok).length;
    const text=can?'FABRICAR':missingCount===1?'FALTA 1 MATERIAL':`FALTAN ${missingCount} MATERIALES`;
    A(this.add.text(art.x+art.w/2,buttonY+buttonH/2,text,{
      fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:can?'#fff':'#d8e0e8',align:'center',wordWrap:{width:art.w-8,useAdvancedWrap:true}
    }).setOrigin(.5));
    if(can){
      button.setInteractive({useHandCursor:true});
      button.on('pointerup',()=>this._craftDirect(out,recipe));
    }
  }
}

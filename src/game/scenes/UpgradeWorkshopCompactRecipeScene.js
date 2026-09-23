import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopInventorySizingScene.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { loadGarage, qty } from '../garage/garageStore.js';
import { EXCHANGE_MATERIALS } from '../store/materialExchange.js';

const UI='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};
const EXCHANGEABLE=new Set(EXCHANGE_MATERIALS);

function lerp(a,b,t){return Math.round(a+(b-a)*Math.max(0,Math.min(1,t)));}
function mixColor(a,b,t){const ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;const br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;return (lerp(ar,br,t)<<16)|(lerp(ag,bg,t)<<8)|lerp(ab,bb,t);}
function progressColor(p){const v=Math.max(0,Math.min(1,Number(p)||0));return v<.5?mixColor(0xff4f5e,0xffbf3f,v/.5):mixColor(0xffbf3f,0x42e58b,(v-.5)/.5);}
function hexColor(n){return `#${Number(n||0).toString(16).padStart(6,'0')}`;}

export class UpgradeShopScene extends PreviousWorkshop {
  _isWorkshopTablet(){
    try{
      const w=Number(this.scale?.width||0),h=Number(this.scale?.height||0),ratio=w/Math.max(1,h);
      const coarse=window.matchMedia?.('(pointer: coarse)')?.matches ?? (Number(navigator?.maxTouchPoints||0)>1);
      return Boolean(coarse&&w>=820&&h>=600&&w>=h&&ratio<=1.6);
    }catch{return false;}
  }

  _tabletRecipeCard(A,r){
    const out=`${this.craftFamily}_${this.craftTier}`;
    const item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out],accent=TIER_COLOR[this.craftTier]||0x66c6ff;
    const g=A(this.add.graphics());g.fillStyle(0x071225,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,15);g.lineStyle(1,accent,.7);g.strokeRoundedRect(r.x,r.y,r.w,r.h,15);
    if(!item||!recipe)return;

    const pad=14,gap=16,titleH=42,buttonH=38;
    const artW=Math.round(r.w*.39),art={x:r.x+pad,y:r.y+titleH,w:artW,h:r.h-titleH-buttonH-pad*2-gap};
    A(this.add.text(r.x+r.w/2,r.y+12,item.name.toUpperCase(),{fontFamily:UI,fontSize:'20px',fontStyle:'900',color:'#fff'}).setOrigin(.5,0));

    const artBg=A(this.add.graphics());artBg.fillStyle(0x09182b,.72);artBg.fillRoundedRect(art.x,art.y,art.w,art.h,14);artBg.lineStyle(1,accent,.32);artBg.strokeRoundedRect(art.x,art.y,art.w,art.h,14);
    this._itemArt(A,item,art.x+art.w/2,art.y+art.h*.48,Math.min(art.w*.88,art.h*.82));

    let can=true;
    const state=(recipe.requires||[]).map(req=>{const have=qty(this.state,req.id),need=Math.max(1,Number(req.qty)||1),ok=have>=need;if(!ok)can=false;const raw=have/need;return{req,have,need,ok,progress:Math.max(0,Math.min(1,raw)),percent:Math.round(raw*100),item:GARAGE_ITEMS[req.id]};});
    const infoX=art.x+art.w+gap,infoW=r.x+r.w-pad-infoX;
    A(this.add.text(infoX,art.y-25,'MATERIALES NECESARIOS',{fontFamily:UI,fontSize:'10px',fontStyle:'900',color:'#9fb4ce'}));

    const cols=state.length<=1?1:2,rows=Math.max(1,Math.ceil(state.length/cols)),cardGap=10;
    const availableH=art.h,cardH=Math.min(170,(availableH-cardGap*(rows-1))/rows),gridH=cardH*rows+cardGap*(rows-1),gridY=art.y+Math.max(0,(availableH-gridH)/2),cardW=(infoW-cardGap*(cols-1))/cols;
    state.forEach((s,i)=>{
      const col=i%cols,row=Math.floor(i/cols),x=infoX+col*(cardW+cardGap),y=gridY+row*(cardH+cardGap),tone=progressColor(s.progress),toneHex=hexColor(tone);
      const cell=A(this.add.graphics());cell.fillStyle(0x101b2b,.98);cell.fillRoundedRect(x,y,cardW,cardH,11);cell.lineStyle(s.ok?2:1,tone,s.ok?1:.9);cell.strokeRoundedRect(x,y,cardW,cardH,11);
      const artSize=Math.min(64,cardH*.38,cardW*.28);this._itemArt(A,s.item,x+cardW*.22,y+cardH*.30,artSize);
      const name=String(s.item?.name||s.req.id).toUpperCase();
      A(this.add.text(x+cardW*.43,y+cardH*.17,name,{fontFamily:UI,fontSize:'9px',fontStyle:'900',color:'#fff',wordWrap:{width:cardW*.52,useAdvancedWrap:true}}));
      A(this.add.text(x+cardW*.43,y+cardH*.39,`${Math.min(999,s.percent)}%`,{fontFamily:UI,fontSize:'16px',fontStyle:'900',color:toneHex}));
      A(this.add.text(x+cardW*.08,y+cardH*.66,`${s.have} / ${s.need}`,{fontFamily:UI,fontSize:'11px',fontStyle:'900',color:'#fff'}));
      A(this.add.text(x+cardW*.92,y+cardH*.66,s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`,{fontFamily:UI,fontSize:'8px',fontStyle:'900',color:s.ok?'#7dffb6':'#ffd4d7'}).setOrigin(1,0));
      const barX=x+cardW*.08,barY=y+cardH*.83,barW=cardW*.84,bh=7;cell.fillStyle(0x18263a,1);cell.fillRoundedRect(barX,barY,barW,bh,4);cell.fillStyle(tone,1);cell.fillRoundedRect(barX,barY,barW*s.progress,bh,4);
      if(!s.ok&&EXCHANGEABLE.has(s.req.id)){const hit=A(this.add.rectangle(x,y,cardW,cardH,0xffffff,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerup',()=>this._openRecyclerForMaterial(s.req.id));}
    });

    const by=r.y+r.h-buttonH-pad,b=A(this.add.rectangle(art.x,by,art.w,buttonH,can?0x17683f:0x273247,.98).setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9));
    const missingCount=state.filter(s=>!s.ok).length,label=can?'FABRICAR':missingCount===1?'FALTA 1 MATERIAL':`FALTAN ${missingCount} MATERIALES`;
    A(this.add.text(art.x+art.w/2,by+buttonH/2,label,{fontFamily:UI,fontSize:'11px',fontStyle:'900',color:can?'#fff':'#d8e0e8'}).setOrigin(.5));
    if(can){b.setInteractive({useHandCursor:true});b.on('pointerup',()=>this._craftDirect(out,recipe));}
  }


  _recipeCard(A,r,compact){
    if(this._isWorkshopTablet())return this._tabletRecipeCard(A,r);
    const out=`${this.craftFamily}_${this.craftTier}`;
    const item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out],g=A(this.add.graphics()),accent=TIER_COLOR[this.craftTier]||0x66c6ff;
    g.fillStyle(0x071225,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,15);g.lineStyle(1,accent,.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,15);if(!item||!recipe)return;
    const artW=r.w*(compact?.27:.30),buttonH=compact?28:36,pad=compact?9:12,artButtonGap=compact?5:7,buttonY=r.y+r.h-buttonH-pad,art={x:r.x+pad,y:r.y+pad,w:artW,h:Math.max(44,buttonY-r.y-pad-artButtonGap)};this._loadFullBleed(A,item,art);
    const infoX=art.x+art.w+(compact?10:14),infoW=r.x+r.w-infoX-pad;A(this.add.text(infoX,r.y+(compact?8:10),item.name.toUpperCase(),{fontFamily:UI,fontSize:compact?'14px':'20px',fontStyle:'900',color:'#fff'}));
    let can=true;const state=(recipe.requires||[]).map(req=>{const have=qty(this.state,req.id),need=Math.max(1,Number(req.qty)||1),ok=have>=need;if(!ok)can=false;const raw=have/need;return{req,have,need,ok,progress:Math.max(0,Math.min(1,raw)),percent:Math.round(raw*100),item:GARAGE_ITEMS[req.id]};});
    const rowTop=r.y+(compact?35:47),rowBottom=r.y+r.h-pad,rowH=Math.max(compact?50:62,rowBottom-rowTop),gap=compact?4:6,count=Math.max(1,state.length),cellW=(infoW-gap*(count-1))/count;
    state.forEach((s,i)=>{const x=infoX+i*(cellW+gap),radius=compact?7:9,tone=progressColor(s.progress),toneHex=hexColor(tone),cell=A(this.add.graphics());cell.fillStyle(0x101722,.96);cell.fillRoundedRect(x,rowTop,cellW,rowH,radius);const innerPad=compact?3:4,innerX=x+innerPad,innerY=rowTop+innerPad,innerW=Math.max(1,cellW-innerPad*2),innerH=Math.max(1,rowH-innerPad*2),fillH=innerH*s.progress;if(fillH>0){const fillY=innerY+innerH-fillH;cell.fillStyle(tone,.28);cell.fillRect(innerX,fillY,innerW,fillH);cell.fillStyle(tone,.88);cell.fillRect(innerX,fillY,compact?3:4,fillH);cell.fillStyle(tone,.82);cell.fillRect(innerX,fillY,innerW,compact?2:3);}cell.lineStyle(s.ok?2:1,tone,s.ok?1:.92);cell.strokeRoundedRect(x,rowTop,cellW,rowH,radius);const name=String(s.item?.name||s.req.id).toUpperCase();A(this.add.text(x+cellW/2,rowTop+rowH*.20,name,{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:cellW-8,useAdvancedWrap:true},shadow:{offsetX:1,offsetY:1,color:'#000',blur:2,fill:true}}).setOrigin(.5));A(this.add.text(x+cellW/2,rowTop+rowH*.43,`${Math.min(999,s.percent)}%`,{fontFamily:UI,fontSize:compact?'11px':'15px',fontStyle:'900',color:toneHex,shadow:{offsetX:1,offsetY:1,color:'#000',blur:2,fill:true}}).setOrigin(.5));A(this.add.text(x+cellW/2,rowTop+rowH*.65,`${s.have} / ${s.need}`,{fontFamily:UI,fontSize:compact?'9px':'12px',fontStyle:'900',color:'#fff',shadow:{offsetX:1,offsetY:1,color:'#000',blur:2,fill:true}}).setOrigin(.5));A(this.add.text(x+cellW/2,rowTop+rowH*.84,s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`,{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'900',color:s.ok?'#7dffb6':'#ffd4d7',shadow:{offsetX:1,offsetY:1,color:'#000',blur:2,fill:true}}).setOrigin(.5));if(!s.ok&&EXCHANGEABLE.has(s.req.id)){const hit=A(this.add.rectangle(x,rowTop,cellW,rowH,0xffffff,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerup',()=>this._openRecyclerForMaterial(s.req.id));}});
    const button=A(this.add.rectangle(art.x,buttonY,art.w,buttonH,can?0x17683f:0x273247,.98).setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9)),missingCount=state.filter(s=>!s.ok).length,text=can?'FABRICAR':missingCount===1?'FALTA 1 MATERIAL':`FALTAN ${missingCount} MATERIALES`;A(this.add.text(art.x+art.w/2,buttonY+buttonH/2,text,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:can?'#fff':'#d8e0e8',align:'center',wordWrap:{width:art.w-8,useAdvancedWrap:true}}).setOrigin(.5));if(can){button.setInteractive({useHandCursor:true});button.on('pointerup',()=>this._craftDirect(out,recipe));}
  }
}

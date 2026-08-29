import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopCompactRecipeScene.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { qty } from '../garage/garageStore.js';

const UI='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const TIERS=['street','sport','racing','prototype'];
const TIER_LABEL={street:'STREET',sport:'SPORT',racing:'RACING',prototype:'PROTOTYPE'};
const EXCHANGEABLE=new Set(['scrap','alloy','rubber','compound','disc','spring','gear','ecu']);
const CRAFT_BASE=`${import.meta.env.BASE_URL || './'}assets/crafting/`;
const MATERIAL_FILES={
  scrap:'materials/chatarra.webp',alloy:'materials/aleacion.webp',rubber:'materials/goma.webp',compound:'materials/compuesto.webp',
  disc:'materials/disco_metalico.webp',spring:'materials/muelle.webp',gear:'materials/engranaje.webp',ecu:'materials/electronica.webp'
};
const PART_FILES={
  engine_street:'parts/engine/engine_street.webp',engine_sport:'parts/engine/engine_sport.webp',engine_racing:'parts/engine/engine_racing.webp',engine_prototype:'parts/engine/engine_prototype.webp',
  brakes_street:'parts/brakes/brakes_street.webp',brakes_sport:'parts/brakes/brakes_sport.webp',brakes_racing:'parts/brakes/brakes_racing.webp',brakes_prototype:'parts/brakes/brakes_prototype.webp',
  tires_street:'parts/tires/tires_street.webp',tires_sport:'parts/tires/tires_sport.webp',tires_racing:'parts/tires/tires_racing_t3.webp',tires_prototype:'parts/tires/tires_prototype_t4.webp',
  suspension_street:'parts/suspension/suspension_street_t1.webp',suspension_sport:'parts/suspension/suspension_sport_t2.webp',suspension_racing:'parts/suspension/suspension_racing_t3.webp',suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',
  transmission_street:'parts/transmission/transmission_street_t1.webp',transmission_sport:'parts/transmission/transmission_sport_t2.webp',transmission_racing:'parts/transmission/transmission_racing_t3.webp',transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};

function assetPath(item){
  if(!item)return null;
  const rel=item.kind==='material'?MATERIAL_FILES[item.id]:PART_FILES[item.id];
  return rel?`${CRAFT_BASE}${rel}?v=20260815-fullbleed1`:null;
}
function lerp(a,b,t){return Math.round(a+(b-a)*Math.max(0,Math.min(1,t)));}
function mixColor(a,b,t){const ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;const br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;return (lerp(ar,br,t)<<16)|(lerp(ag,bg,t)<<8)|lerp(ab,bb,t);}
function progressColor(p){const v=Math.max(0,Math.min(1,Number(p)||0));return v<.5?mixColor(0xff4f5e,0xffbf3f,v/.5):mixColor(0xffbf3f,0x42e58b,(v-.5)/.5);}
function hexColor(n){return `#${Number(n||0).toString(16).padStart(6,'0')}`;}

export class UpgradeShopScene extends PreviousWorkshop {
  _isWorkshopUltraShort(){return Number(this.scale?.height||0)<=390;}

  _forgePanel(A,r,compact){
    if(!this._isWorkshopUltraShort())return super._forgePanel(A,r,compact);

    this._panel(A,r,TIER_COLOR[this.craftTier]);
    A(this.add.text(r.x+14,r.y+8,'FABRICACIÓN DIRECTA',{fontFamily:UI,fontSize:'12px',fontStyle:'800',color:'#fff'}));
    A(this.add.text(r.x+r.w-14,r.y+10,'ELIGE · REVISA · FABRICA',{fontFamily:UI,fontSize:'6px',fontStyle:'800',color:'#9fb4ce'}).setOrigin(1,0));

    const inner={x:r.x+10,y:r.y+28,w:r.w-20,h:r.h-34};
    const familyH=27,tierH=29,gap=4;
    this._familySelector(A,{x:inner.x,y:inner.y,w:inner.w,h:familyH},true);
    this._tierSelector(A,{x:inner.x,y:inner.y+familyH+gap,w:inner.w,h:tierH},true);
    const recipeY=inner.y+familyH+tierH+gap*2;
    this._recipeCard(A,{x:inner.x,y:recipeY,w:inner.w,h:Math.max(42,inner.y+inner.h-recipeY)},true);
  }

  _familySelector(A,r,compact){
    if(!this._isWorkshopUltraShort())return super._familySelector(A,r,compact);
    const gap=3,cw=(r.w-gap*4)/5;
    FAMILIES.forEach((f,i)=>{
      const on=this.craftFamily===f,x=r.x+i*(cw+gap);
      const b=A(this.add.rectangle(x,r.y,cw,r.h,on?0x174765:0x0b1830,.97).setOrigin(0)
        .setStrokeStyle(on?2:1,on?0x5ce5ff:0x405873,on?1:.7).setInteractive({useHandCursor:true}));
      A(this.add.text(x+cw/2,r.y+r.h/2,FAMILY_LABEL[f],{fontFamily:UI,fontSize:'8px',fontStyle:'900',color:on?'#fff':'#a9b8c9'}).setOrigin(.5));
      b.on('pointerdown',()=>{if(this.busy)return;this.craftFamily=f;this.craftTier='street';this.render();});
    });
  }

  _tierSelector(A,r,compact){
    if(!this._isWorkshopUltraShort())return super._tierSelector(A,r,compact);
    const gap=3,cw=(r.w-gap*3)/4;
    TIERS.forEach((t,i)=>{
      const on=this.craftTier===t,x=r.x+i*(cw+gap),id=`${this.craftFamily}_${t}`,owned=qty(this.state,id);
      const b=A(this.add.rectangle(x,r.y,cw,r.h,on?0x17223c:0x09152a,.97).setOrigin(0)
        .setStrokeStyle(on?2:1,TIER_COLOR[t],on?1:.55).setInteractive({useHandCursor:true}));
      const label=owned?`${TIER_LABEL[t]}  ×${owned}`:TIER_LABEL[t];
      A(this.add.text(x+cw/2,r.y+r.h/2,label,{fontFamily:UI,fontSize:'9px',fontStyle:'900',color:on?'#fff':'#c0cad6'}).setOrigin(.5));
      b.on('pointerdown',()=>{if(this.busy)return;this.craftTier=t;this.render();});
    });
  }

  _loadFullBleed(A,item,r,onReady){
    if(!this._isWorkshopUltraShort())return super._loadFullBleed(A,item,r,onReady);
    const path=assetPath(item);
    if(!path)return super._loadFullBleed(A,item,r,onReady);
    const key=`craft_fullbleed_${item.id}`;
    const draw=()=>{
      if(!this.textures.exists(key))return false;
      const img=A(this.add.image(r.x+r.w/2,r.y+r.h/2,key));
      const scale=Math.min((r.w-4)/(img.width||1),(r.h-4)/(img.height||1));
      img.setScale(Math.max(.01,scale));
      return true;
    };
    if(draw())return true;
    if(this.failedAssets?.has?.(key))return false;
    if(!this.loadingAssets?.has?.(key)){
      this.loadingAssets?.add?.(key);
      const cleanup=()=>{this.loadingAssets?.delete?.(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();onReady?.();this.render?.();};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets?.add?.(key);};
      this.load.once(`filecomplete-image-${key}`,ok);
      this.load.on('loaderror',err);
      this.load.image(key,path);
      if(!this.load.isLoading())this.load.start();
    }
    return false;
  }

  _recipeCard(A,r,compact){
    if(!this._isWorkshopUltraShort())return super._recipeCard(A,r,compact);

    const out=`${this.craftFamily}_${this.craftTier}`;
    const item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out],g=A(this.add.graphics()),accent=TIER_COLOR[this.craftTier]||0x66c6ff;
    g.fillStyle(0x071225,.96);g.fillRoundedRect(r.x,r.y,r.w,r.h,12);g.lineStyle(1,accent,.55);g.strokeRoundedRect(r.x,r.y,r.w,r.h,12);if(!item||!recipe)return;

    const pad=6,buttonH=25,artButtonGap=4,artW=r.w*.23,buttonY=r.y+r.h-buttonH-pad;
    const art={x:r.x+pad,y:r.y+pad,w:artW,h:Math.max(40,buttonY-r.y-pad-artButtonGap)};
    this._loadFullBleed(A,item,art);

    const infoX=art.x+art.w+8,infoW=Math.max(80,r.x+r.w-infoX-pad);
    A(this.add.text(infoX,r.y+7,item.name.toUpperCase(),{fontFamily:UI,fontSize:'12px',fontStyle:'900',color:'#fff'}));

    let can=true;
    const state=(recipe.requires||[]).map(req=>{
      const have=qty(this.state,req.id),need=Math.max(1,Number(req.qty)||1),ok=have>=need;
      if(!ok)can=false;
      const raw=have/need;
      return{req,have,need,ok,progress:Math.max(0,Math.min(1,raw)),percent:Math.round(raw*100),item:GARAGE_ITEMS[req.id]};
    });

    const rowTop=r.y+28,rowBottom=r.y+r.h-pad,rowH=Math.max(34,rowBottom-rowTop),gap=4,count=Math.max(1,state.length),cellW=(infoW-gap*(count-1))/count;
    state.forEach((s,i)=>{
      const x=infoX+i*(cellW+gap),radius=6,tone=progressColor(s.progress),toneHex=hexColor(tone),cell=A(this.add.graphics());
      cell.fillStyle(0x101722,.96);cell.fillRoundedRect(x,rowTop,cellW,rowH,radius);
      const innerPad=2,innerX=x+innerPad,innerY=rowTop+innerPad,innerW=Math.max(1,cellW-innerPad*2),innerH=Math.max(1,rowH-innerPad*2),fillH=innerH*s.progress;
      if(fillH>0){const fillY=innerY+innerH-fillH;cell.fillStyle(tone,.28);cell.fillRect(innerX,fillY,innerW,fillH);cell.fillStyle(tone,.88);cell.fillRect(innerX,fillY,2,fillH);cell.fillStyle(tone,.82);cell.fillRect(innerX,fillY,innerW,2);}
      cell.lineStyle(s.ok?2:1,tone,s.ok?1:.92);cell.strokeRoundedRect(x,rowTop,cellW,rowH,radius);
      const name=String(s.item?.name||s.req.id).toUpperCase();
      A(this.add.text(x+cellW/2,rowTop+rowH*.17,name,{fontFamily:UI,fontSize:'7px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:Math.max(24,cellW-6),useAdvancedWrap:true},shadow:{offsetX:1,offsetY:1,color:'#000',blur:1,fill:true}}).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.42,`${Math.min(999,s.percent)}%`,{fontFamily:UI,fontSize:'10px',fontStyle:'900',color:toneHex,shadow:{offsetX:1,offsetY:1,color:'#000',blur:1,fill:true}}).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.65,`${s.have} / ${s.need}`,{fontFamily:UI,fontSize:'8px',fontStyle:'900',color:'#fff',shadow:{offsetX:1,offsetY:1,color:'#000',blur:1,fill:true}}).setOrigin(.5));
      A(this.add.text(x+cellW/2,rowTop+rowH*.84,s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`,{fontFamily:UI,fontSize:'7px',fontStyle:'900',color:s.ok?'#7dffb6':'#ffd4d7',shadow:{offsetX:1,offsetY:1,color:'#000',blur:1,fill:true}}).setOrigin(.5));
      if(!s.ok&&EXCHANGEABLE.has(s.req.id)){
        const hit=A(this.add.rectangle(x,rowTop,cellW,rowH,0xffffff,.001).setOrigin(0).setInteractive({useHandCursor:true}));
        hit.on('pointerup',()=>this._openRecyclerForMaterial(s.req.id));
      }
    });

    const button=A(this.add.rectangle(art.x,buttonY,art.w,buttonH,can?0x17683f:0x273247,.98).setOrigin(0).setStrokeStyle(2,can?0x55f29b:0x526077,.9));
    const missingCount=state.filter(s=>!s.ok).length,text=can?'FABRICAR':missingCount===1?'FALTA 1 MATERIAL':`FALTAN ${missingCount} MATERIALES`;
    A(this.add.text(art.x+art.w/2,buttonY+buttonH/2,text,{fontFamily:UI,fontSize:'8px',fontStyle:'900',color:can?'#fff':'#d8e0e8',align:'center',wordWrap:{width:Math.max(30,art.w-6),useAdvancedWrap:true}}).setOrigin(.5));
    if(can){button.setInteractive({useHandCursor:true});button.on('pointerup',()=>this._craftDirect(out,recipe));}
  }
}

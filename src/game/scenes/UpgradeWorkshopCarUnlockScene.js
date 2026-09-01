import { UpgradeShopScene as CurrentWorkshop } from './UpgradeWorkshopLowHeightRecipeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { devFullCarAccessEnabled, isCarUnlocked, STARTER_CAR_ID } from '../cars/carUnlocks.js';
import { openMaterialExchangeDom, closeMaterialExchangeDom } from '../ui/MaterialExchangeFlexibleDom.js';

const LEGACY_CAR_IDS=new Set(['stock','touring','power']);
const ALL_CAR_IDS=Object.keys(CAR_SPECS).filter(id=>!LEGACY_CAR_IDS.has(id)&&CAR_SPECS[id]);
const UI_FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function cssColor(value,fallback='#fff'){
  if(typeof value==='string')return value;
  const n=Number(value);
  return Number.isFinite(n)?`#${(n>>>0).toString(16).padStart(6,'0').slice(-6)}`:fallback;
}
function applyDomTextStyle(node,style={}){
  const fs=parseFloat(String(style.fontSize||16))||16;
  const fontStyle=String(style.fontStyle||'').toLowerCase();
  const pad=style.padding||{};
  const wrap=Number(style.wordWrap?.width||style.wordWrapWidth||0);
  const fixed=Number(style.fixedWidth||0);
  node.style.position='relative';
  node.style.display='block';
  node.style.boxSizing='border-box';
  node.style.margin='0';
  node.style.fontFamily=String(style.fontFamily||UI_FONT).replace(/Orbitron/ig,'system-ui');
  node.style.fontSize=`${fs}px`;
  node.style.fontWeight=fontStyle.includes('900')||fontStyle.includes('bold')?'900':'400';
  node.style.fontStyle=fontStyle.includes('italic')?'italic':'normal';
  node.style.lineHeight=style.lineSpacing?`${Math.max(1,fs+Number(style.lineSpacing||0))}px`:'normal';
  node.style.color=cssColor(style.color||style.fill,'#fff');
  node.style.textAlign=String(style.align||'left');
  node.style.whiteSpace=wrap>0?'pre-wrap':'pre';
  node.style.overflowWrap=wrap>0?'break-word':'normal';
  node.style.width=fixed>0?`${fixed}px`:(wrap>0?`${wrap}px`:'max-content');
  node.style.maxWidth=wrap>0?`${wrap}px`:'none';
  node.style.padding=`${Number(pad.y??pad.top??0)}px ${Number(pad.x??pad.left??0)}px`;
  node.style.background=style.backgroundColor?cssColor(style.backgroundColor,'transparent'):'transparent';
  const stroke=Math.max(0,Math.min(2,Number(style.strokeThickness||0)));
  node.style.webkitTextStroke=stroke?`${stroke}px ${cssColor(style.stroke,'transparent')}`:'0 transparent';
  if(style.shadow){
    const s=style.shadow;
    node.style.textShadow=`${Number(s.offsetX||0)}px ${Number(s.offsetY||0)}px ${Number(s.blur||0)}px ${cssColor(s.color,'#000')}`;
  }else node.style.textShadow='none';
  node.style.pointerEvents='none';
  node.style.userSelect='none';
  node.style.webkitUserSelect='none';
  node.style.webkitFontSmoothing='antialiased';
  node.style.textRendering='optimizeLegibility';
}
function createWorkshopDomText(scene,x,y,value,style={}){
  const node=document.createElement('div');
  node.className='tdr-workshop-dom-text';
  node.textContent=Array.isArray(value)?value.join('\n'):String(value??'');
  applyDomTextStyle(node,style);
  const obj=scene.add.dom(x,y,node);
  obj.__tdrWorkshopDomText=true;
  obj.setText=(next)=>{node.textContent=Array.isArray(next)?next.join('\n'):String(next??'');return obj;};
  obj.setStyle=(next={})=>{applyDomTextStyle(node,{...style,...next});return obj;};
  obj.setColor=(next)=>{node.style.color=cssColor(next,'#fff');return obj;};
  obj.setFontSize=(next)=>{node.style.fontSize=typeof next==='number'?`${next}px`:String(next);return obj;};
  obj.setFontFamily=(next)=>{node.style.fontFamily=String(next||UI_FONT).replace(/Orbitron/ig,'system-ui');return obj;};
  obj.setFontStyle=(next)=>{const s=String(next||'').toLowerCase();node.style.fontWeight=s.includes('900')||s.includes('bold')?'900':'400';node.style.fontStyle=s.includes('italic')?'italic':'normal';return obj;};
  let nativeInteractive=false;
  obj.setInteractive=()=>{
    if(nativeInteractive)return obj;
    nativeInteractive=true;
    node.style.pointerEvents='auto';
    node.style.touchAction='manipulation';
    const relay=(domName,phaserName)=>node.addEventListener(domName,e=>{try{obj.emit(phaserName,e);}catch{}},{passive:phaserName!=='pointerdown'});
    relay('pointerdown','pointerdown');relay('pointerup','pointerup');relay('pointerenter','pointerover');relay('pointerleave','pointerout');relay('pointermove','pointermove');
    return obj;
  };
  obj.disableInteractive=()=>{node.style.pointerEvents='none';return obj;};
  obj.removeInteractive=obj.disableInteractive;
  return obj;
}

export class UpgradeShopScene extends CurrentWorkshop {
  _allowedWorkshopCars(){
    if(this._mode==='admin'||devFullCarAccessEnabled())return ALL_CAR_IDS;
    const unlocked=ALL_CAR_IDS.filter(id=>isCarUnlocked(id));
    return unlocked.length?unlocked:[STARTER_CAR_ID].filter(id=>CAR_SPECS[id]);
  }

  create(...args){
    // Workshop policy: UI text is browser DOM, never Phaser.Text.
    // Graphics/images stay in Phaser; every legacy this.add.text() in the
    // workshop inheritance chain is redirected to a Phaser DOMElement.
    const originalText=this.add.text;
    this.add.text=(x,y,text,style={})=>createWorkshopDomText(this,x,y,text,style);
    this.events.once('shutdown',()=>{this.add.text=originalText;closeMaterialExchangeDom(this);});

    super.create(...args);
    const allowed=this._allowedWorkshopCars();
    if(!allowed.includes(this.car)&&allowed.length){
      this.car=allowed[0];
      try{localStorage.setItem('tdr2:carId',this.car);}catch{}
      this.render?.();
    }
  }

  _openRecyclerForMaterial(materialId){
    const target=String(materialId||'compound');
    const from=target==='scrap'?'alloy':'scrap';
    return openMaterialExchangeDom(this,from,target,100);
  }

  _header(A,w,compact){
    const h=compact?50:62;
    const top=6;
    const side=Math.max(10,Math.min(24,w*.014));
    const g=A(this.add.graphics());
    g.fillStyle(0x071226,.95);g.fillRoundedRect(side,top,w-side*2,h-8,12);
    g.lineStyle(1,0x46ddff,.32);g.strokeRoundedRect(side,top,w-side*2,h-8,12);
    g.lineStyle(2,0xe6b84e,.82);g.lineBetween(side+15,top+1,side+Math.min(260,w*.22),top+1);
    const cy=top+(h-8)/2;

    const back=A(this.add.text(side+15,cy,'←',{fontFamily:UI_FONT,fontSize:compact?'23px':'28px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
    A(this.add.text(side+(compact?50:58),cy,'GARAJE',{fontFamily:UI_FONT,fontSize:compact?'15px':'19px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5));
    A(this.add.text(w*.57,cy,'FABRICACIÓN',{fontFamily:UI_FONT,fontSize:compact?'20px':'26px',fontStyle:'700',color:'#ffffff'}).setOrigin(.5));
    A(this.add.text(w-side-14,cy,`●  ${Number(this.state?.coins||0).toLocaleString('es-ES')}`,{fontFamily:UI_FONT,fontSize:compact?'13px':'17px',fontStyle:'700',color:'#ffd45a'}).setOrigin(1,.5));
  }

  _browseWorkshopCar(delta){
    if(this.busy)return;
    const allowed=this._allowedWorkshopCars();
    if(!allowed.length)return;
    let index=allowed.indexOf(this.car);
    if(index<0)index=0;
    const next=index+Math.sign(Number(delta)||0);
    if(next<0||next>=allowed.length)return;
    this.car=allowed[next];
    try{localStorage.setItem('tdr2:carId',this.car);}catch{}
    this.render?.();
  }

  _compactCarPanel(A,r,compact){
    super._compactCarPanel(A,r,compact);

    if(this._mode==='admin'||devFullCarAccessEnabled())return;
    const allowed=this._allowedWorkshopCars();
    const index=allowed.indexOf(this.car);
    if(index<0)return;

    const geo=this._workshopNavGeometry;
    if(!geo)return;
    const cover=(x,glyph)=>{
      A(this.add.rectangle(x,geo.rowY,geo.buttonW,geo.buttonH,0x081525,1)
        .setStrokeStyle(1,0x405262,.35));
      A(this.add.text(x,geo.rowY,glyph,{
        fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'900',color:'#536777'
      }).setOrigin(.5));
    };
    if(index<=0)cover(geo.leftX,'‹');
    if(index>=allowed.length-1)cover(geo.rightX,'›');
  }
}

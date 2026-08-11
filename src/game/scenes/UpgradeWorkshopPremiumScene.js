import Phaser from 'phaser';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, CRAFT_STRIP_RECIPES, findStripRecipe, stripRecipeCanAccept } from '../garage/partsCatalog.js';
import { loadGarage, qty, craftStrip, equip, garageDisplayStats, getEquippedForCar } from '../garage/garageStore.js';

const CAR_BASE='assets/cars/runtime/';
const ITEM_BASE='assets/craft/items/';
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const STAT_META={
  speed:{label:'VELOCIDAD',glyph:'V'},
  accel:{label:'ACELERACIÓN',glyph:'A'},
  grip:{label:'AGARRE',glyph:'G'},
  control:{label:'CONTROL',glyph:'C'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function carId(){try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}}
function raritySlug(spec){return String(spec?.rarity||'comun').toLowerCase().replace(' ','_').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function recipeFits(selected,recipe){const bag=[...recipe.in];for(const id of selected){const i=bag.indexOf(id);if(i<0)return false;bag.splice(i,1);}return true;}

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){
    super('upgrade-shop');
    this.state=null;this.car='stock';this.slots=[];this.filter='materials';this.ui=null;this.busy=false;
    this._failedAssets=new Set();this._loadingAssets=new Set();
  }

  create(){
    this.car=carId();
    this.state=loadGarage();
    this.scale.on('resize',this.render,this);
    this.events.once('shutdown',()=>this.scale.off('resize',this.render,this));
    this.render();
  }

  render(){
    const {width:w,height:h}=this.scale;
    if(this.ui)this.ui.destroy(true);
    this.ui=this.add.container();
    const A=o=>{this.ui.add(o);return o;};
    const compact=h<520;
    this._background(A,w,h);
    this._topBar(A,w,compact);

    const top=compact?54:68,pad=compact?9:14,gap=compact?9:13;
    const bottomH=compact?66:82;
    const bodyH=h-top-bottomH-pad;
    const leftW=Math.round(w*.59);
    const left={x:pad,y:top,w:leftW-pad,h:bodyH};
    const right={x:left.x+left.w+gap,y:top,w:w-(left.x+left.w+gap)-pad,h:bodyH};
    this._carStage(A,left,compact);
    this._craftStage(A,right,compact);
    this._categoryStrip(A,{x:pad,y:h-bottomH,w:w-pad*2,h:bottomH-pad},compact);
  }

  _background(A,w,h){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x05080b,0x0d151b,0x070b0e,0x101316,1);g.fillRect(0,0,w,h);
    g.fillStyle(0x08131a,.62);g.fillRect(0,0,w,h);
    for(let i=0;i<7;i++){
      const x=i*w/6;g.fillStyle(i%2?0x10191e:0x071015,.32);g.fillRect(x-85,58,170,h-58);
      g.lineStyle(1,0x5acfff,.08);g.lineBetween(x,58,x,h);
    }
    g.fillStyle(0x19bdf2,.08);g.fillEllipse(w*.28,h*.43,w*.53,h*.72);
    g.fillStyle(0x000000,.25);g.fillRect(0,0,w,h);
    g.lineStyle(1,0xffffff,.035);for(let y=h*.62;y<h;y+=32)g.lineBetween(0,y,w,y);
  }

  _topBar(A,w,compact){
    const h=compact?48:60,g=A(this.add.graphics());
    g.fillStyle(0x030609,.98);g.fillRect(0,0,w,h);g.lineStyle(1,0x314752,.92);g.lineBetween(0,h-1,w,h-1);
    const back=A(this.add.text(17,h/2,'‹',{fontFamily:'Arial',fontSize:compact?'34px':'42px',fontStyle:'900',color:'#f4f8fa'}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
    A(this.add.text(compact?52:62,h/2,'GARAJE',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'18px':'23px',fontStyle:'900 italic',color:'#f5f7f8'}).setOrigin(0,.5));
    A(this.add.text(w*.56,h/2,'CRAFT STRIP',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#ffffff'}).setOrigin(.5));
    const coins=Number(this.state?.coins||0);
    A(this.add.text(w-22,h/2,`◉  ${coins.toLocaleString('es-ES')}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#ffd54a'}).setOrigin(1,.5));
  }

  _panel(A,r,accent=0x2dcfff,alpha=.94){
    const g=A(this.add.graphics());
    g.fillStyle(0x050b0f,alpha);g.fillRoundedRect(r.x,r.y,r.w,r.h,13);
    g.lineStyle(1,accent,.58);g.strokeRoundedRect(r.x,r.y,r.w,r.h,13);
    g.fillStyle(accent,.035);g.fillRoundedRect(r.x+2,r.y+2,r.w-4,42,11);
    return g;
  }

  _carStage(A,r,compact){
    this._panel(A,r,0x27cfff,.88);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const nameY=r.y+(compact?12:16);
    A(this.add.text(r.x+16,nameY,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#90a7b2'}));
    A(this.add.text(r.x+16,nameY+(compact?17:20),spec.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#ffffff'}));
    A(this.add.text(r.x+r.w-16,nameY+2,String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#ffd05a'}).setOrigin(1,0));

    const imageH=Math.round(r.h*(compact?.60:.63));
    const carR={x:r.x+10,y:r.y+(compact?54:66),w:r.w-20,h:imageH};
    this._garagePlatform(A,carR);
    this._drawCar(A,spec,carR.x+carR.w*.49,carR.y+carR.h*.45,carR.w*.82,carR.h*.78);

    const statsR={x:r.x+14,y:carR.y+carR.h+5,w:r.w-28,h:r.y+r.h-(carR.y+carR.h)-12};
    this._stats(A,spec,statsR,compact);
  }

  _garagePlatform(A,r){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x081015,0x0b171d,0x11191b,0x05090c,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,12);
    g.fillStyle(0x13252c,.85);g.fillEllipse(r.x+r.w*.49,r.y+r.h*.68,r.w*.74,r.h*.35);
    g.lineStyle(3,0x49d7ff,.48);g.strokeEllipse(r.x+r.w*.49,r.y+r.h*.68,r.w*.76,r.h*.37);
    g.lineStyle(1,0xb2f3ff,.18);g.strokeEllipse(r.x+r.w*.49,r.y+r.h*.68,r.w*.69,r.h*.30);
    g.fillStyle(0x52dfff,.055);g.fillEllipse(r.x+r.w*.49,r.y+r.h*.39,r.w*.70,r.h*.78);
  }

  _drawCar(A,spec,cx,cy,w,h){
    const key=`premium_car_${this.car}`;
    const img=A(this.add.image(cx,cy,'__MISSING').setVisible(false));
    const apply=()=>{
      if(!img?.scene||!this.textures.exists(key))return false;
      img.setTexture(key).setVisible(true);
      const s=Math.min(w/(img.width||1),h/(img.height||1));
      img.setScale(s);
      return true;
    };
    if(apply())return;
    const file=`card_${this.car}_${raritySlug(spec)}_${String(spec.collectionNo||0).padStart(3,'0')}.webp`;
    if(this._failedAssets.has(key))return this._carFallback(A,cx,cy,w,h);
    const cleanup=()=>{this._loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
    const ok=()=>{cleanup();if(!apply())this._carFallback(A,cx,cy,w,h);};
    const err=f=>{if(f?.key!==key)return;cleanup();this._failedAssets.add(key);this._carFallback(A,cx,cy,w,h);};
    if(!this._loadingAssets.has(key)){
      this._loadingAssets.add(key);this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,`${CAR_BASE}${file}`);if(!this.load.isLoading())this.load.start();
    }
  }

  _carFallback(A,cx,cy,w,h){
    const g=A(this.add.graphics());
    g.fillStyle(0x1a262c,1);g.fillRoundedRect(cx-w*.28,cy-h*.24,w*.56,h*.48,22);
    g.fillStyle(0x2ccfff,.65);g.fillRoundedRect(cx-w*.16,cy-h*.19,w*.32,h*.18,12);
    g.fillStyle(0x06090b);g.fillCircle(cx-w*.26,cy+h*.18,h*.11);g.fillCircle(cx+w*.26,cy+h*.18,h*.11);
  }

  _stats(A,spec,r,compact){
    const recipe=findStripRecipe(this.slots),result=recipe?GARAGE_ITEMS[recipe.out]:null;
    const cur=garageDisplayStats(spec,this.state,this.car,null);
    const next=result?.kind==='part'?garageDisplayStats(spec,this.state,this.car,result.id):cur;
    A(this.add.text(r.x,r.y,'ESTADÍSTICAS DEL COCHE',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#ffffff'}));
    const keys=['speed','accel','grip','control'];
    const start=r.y+(compact?22:28),rowH=(r.h-(compact?24:30))/4;
    keys.forEach((k,i)=>{
      const y=start+i*rowH,v=cur[k],nv=next[k],d=nv-v;
      A(this.add.text(r.x,y,STAT_META[k].label,{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#dbe5ea'}));
      A(this.add.text(r.x+118,y,String(v),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#ffffff'}));
      const bx=r.x+(compact?150:175),bw=Math.max(90,r.w-(compact?205:245)),bh=compact?8:10,by=y+3;
      const bg=A(this.add.graphics());bg.fillStyle(0x132028,1);bg.fillRoundedRect(bx,by,bw,bh,bh/2);bg.fillStyle(0x22bfff,.92);bg.fillRoundedRect(bx,by,bw*(v/99),bh,bh/2);
      if(nv>v){bg.fillStyle(0x59f06b,.98);bg.fillRoundedRect(bx+bw*(v/99),by,bw*((nv-v)/99),bh,bh/2);}
      if(d)A(this.add.text(r.x+r.w,y,`${d>0?'+':''}${d}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'11px':'14px',fontStyle:'900',color:d>0?'#66f06d':'#ff6b6b'}).setOrigin(1,0));
    });
  }

  _craftStage(A,r,compact){
    this._panel(A,r,0x2dcfff,.93);
    A(this.add.text(r.x+r.w/2,r.y+12,'ELIGE 3 COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#ffffff'}).setOrigin(.5,0));
    const slotY=r.y+(compact?38:48),gap=7,sw=(r.w-28-gap*2)/3,sh=compact?72:92;
    for(let i=0;i<3;i++)this._slot(A,i,r.x+14+i*(sw+gap),slotY,sw,sh,compact);
    const resultY=slotY+sh+10;
    const resultH=compact?92:116;
    this._resultCard(A,{x:r.x+14,y:resultY,w:r.w-28,h:resultH},compact);
    const tabsY=resultY+resultH+8,tabH=compact?28:34;
    this._tab(A,r.x+14,tabsY,(r.w-34)/2,tabH,'MATERIALES','materials',compact);
    this._tab(A,r.x+20+(r.w-34)/2,tabsY,(r.w-34)/2,tabH,'PIEZAS','parts',compact);
    const gridY=tabsY+tabH+7;
    this._inventory(A,{x:r.x+12,y:gridY,w:r.w-24,h:r.y+r.h-gridY-10},compact);
  }

  _slot(A,i,x,y,w,h,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null,g=A(this.add.graphics());
    g.fillStyle(item?0x07141b:0x081015,.98);g.fillRoundedRect(x,y,w,h,9);g.lineStyle(item?2:1,item?(item.tone||0x2dcfff):0x2e4854,item?1:.8);g.strokeRoundedRect(x,y,w,h,9);
    if(item){
      this._itemVisual(A,item,x+w/2,y+h*.40,Math.min(w*.58,h*.45));
      A(this.add.text(x+w/2,y+h-19,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#ffffff',align:'center',wordWrap:{width:w-8}}).setOrigin(.5));
      A(this.add.text(x+w-6,y+5,`×${qty(this.state,id)}`,{fontFamily:'system-ui',fontSize:compact?'9px':'10px',fontStyle:'900',color:'#ffffff'}).setOrigin(1,0));
      const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));
      hit.on('pointerdown',()=>{if(this.busy)return;this.slots.splice(i,1);this.render();});
    }else A(this.add.text(x+w/2,y+h/2,`+ ${i+1}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'26px',fontStyle:'900',color:'#4c6874'}).setOrigin(.5));
  }

  _resultCard(A,r,compact){
    const recipe=findStripRecipe(this.slots),item=recipe?GARAGE_ITEMS[recipe.out]:null;
    const g=A(this.add.graphics());
    g.fillGradientStyle(item?0x170823:0x071017,0x071017,item?0x230a2f:0x071017,0x05090d,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,item?0xc74cff:0x31515f,.8);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    if(!item){
      A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length?'COMPLETA UNA RECETA':'SELECCIONA TRES COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#6f8791'}).setOrigin(.5));
      return;
    }
    this._itemVisual(A,item,r.x+r.w*.20,r.y+r.h*.48,Math.min(r.h*.65,r.w*.20));
    A(this.add.text(r.x+r.w*.34,r.y+14,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'16px':'21px',fontStyle:'900 italic',color:'#d959ff'}));
    A(this.add.text(r.x+r.w*.34,r.y+(compact?38:45),`${String(item.family||'PIEZA').toUpperCase()} · NIVEL ${item.tier||1}`,{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'800',color:'#d9c1df'}));
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock,cur=garageDisplayStats(spec,this.state,this.car,null),next=garageDisplayStats(spec,this.state,this.car,item.id);
    const changes=Object.keys(STAT_META).filter(k=>next[k]!==cur[k]).map(k=>`${STAT_META[k].label} ${cur[k]} › ${next[k]}`);
    A(this.add.text(r.x+r.w*.34,r.y+(compact?57:69),changes.slice(0,2).join('   ·   ')||'LISTA PARA EQUIPAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#66f06d'}));
    const btn=A(this.add.rectangle(r.x+r.w*.72,r.y+r.h-(compact?20:25),r.w*.48,compact?31:39,0xf5bb11,1).setStrokeStyle(1,0xffdf58,1).setInteractive({useHandCursor:true}));
    A(this.add.text(btn.x,btn.y,'FABRICAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#111111'}).setOrigin(.5));
    btn.on('pointerdown',()=>this._craft());
  }

  _tab(A,x,y,w,h,label,key,compact){
    const on=this.filter===key,q=A(this.add.rectangle(x,y,w,h,on?0x0b2835:0x081116,.98).setOrigin(0).setStrokeStyle(1,on?0x2dcfff:0x30454f,.9).setInteractive({useHandCursor:true}));
    A(this.add.text(x+w/2,y+h/2,label,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:on?'#ffffff':'#7f949d'}).setOrigin(.5));
    q.on('pointerdown',()=>{if(!this.busy){this.filter=key;this.render();}});
  }

  _inventory(A,r,compact){
    const chosen={};for(const id of this.slots)chosen[id]=(chosen[id]||0)+1;
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>{
      const item=GARAGE_ITEMS[id];
      const isPart=item.kind==='part';
      if(this.filter==='parts'?!isPart:isPart)return false;
      if(qty(this.state,id)-(chosen[id]||0)<=0)return false;
      return this.slots.length<3&&stripRecipeCanAccept(this.slots,id);
    });
    const cols=compact?4:4,gap=6,cw=(r.w-gap*(cols-1))/cols,ch=Math.max(compact?54:66,(r.h-6)/2);
    ids.slice(0,cols*2).forEach((id,i)=>{
      const x=r.x+(i%cols)*(cw+gap),y=r.y+Math.floor(i/cols)*(ch+gap);if(y+ch>r.y+r.h+2)return;
      const item=GARAGE_ITEMS[id],g=A(this.add.graphics());g.fillStyle(0x071218,.98);g.fillRoundedRect(x,y,cw,ch,8);g.lineStyle(1,item.tone||0x2dcfff,.6);g.strokeRoundedRect(x,y,cw,ch,8);
      this._itemVisual(A,item,x+cw/2,y+ch*.38,Math.min(cw*.42,ch*.42));
      A(this.add.text(x+cw/2,y+ch-16,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#ffffff',align:'center',wordWrap:{width:cw-6}}).setOrigin(.5));
      A(this.add.text(x+cw-6,y+5,`×${qty(this.state,id)-(chosen[id]||0)}`,{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#69e9ff'}).setOrigin(1,0));
      const hit=A(this.add.rectangle(x,y,cw,ch,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerdown',()=>this._select(id));
    });
    if(!ids.length)A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length===3?'RECETA COMPLETA':'NO HAY COMPONENTES COMPATIBLES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#617681'}).setOrigin(.5));
  }

  _itemVisual(A,item,cx,cy,size){
    const key=`craft_item_${item.id}`;
    if(this.textures.exists(key)){
      const img=A(this.add.image(cx,cy,key));const s=Math.min(size/(img.width||1),size/(img.height||1));img.setScale(s);return;
    }
    if(!this._failedAssets.has(key)&&!this._loadingAssets.has(key)){
      this._loadingAssets.add(key);
      const cleanup=()=>{this._loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();this.render();};
      const err=f=>{if(f?.key!==key)return;cleanup();this._failedAssets.add(key);};
      this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,`${ITEM_BASE}${item.id}.webp`);if(!this.load.isLoading())this.load.start();
    }
    const g=A(this.add.graphics());g.fillStyle(item.tone||0x2dcfff,.12);g.fillCircle(cx,cy,size*.48);g.lineStyle(2,item.tone||0x2dcfff,.58);g.strokeCircle(cx,cy,size*.46);
    A(this.add.text(cx,cy,item.icon||'◆',{fontFamily:'system-ui',fontSize:`${Math.max(18,Math.round(size*.55))}px`,fontStyle:'900',color:'#ffffff'}).setOrigin(.5));
  }

  _categoryStrip(A,r,compact){
    const g=A(this.add.graphics());g.fillStyle(0x04080b,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,0x203945,.95);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    const eq=getEquippedForCar(this.state,this.car)||{},gap=5,cw=(r.w-gap*(FAMILIES.length-1))/FAMILIES.length;
    FAMILIES.forEach((f,i)=>{
      const x=r.x+i*(cw+gap),id=eq[f],item=id?GARAGE_ITEMS[id]:null;
      const q=A(this.add.graphics());q.fillStyle(item?0x0b1b21:0x081116,.96);q.fillRoundedRect(x+2,r.y+2,cw-4,r.h-4,7);q.lineStyle(1,item?(item.tone||0x2dcfff):0x2b424c,.7);q.strokeRoundedRect(x+2,r.y+2,cw-4,r.h-4,7);
      A(this.add.text(x+cw/2,r.y+(compact?15:18),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#ffffff'}).setOrigin(.5));
      A(this.add.text(x+cw/2,r.y+r.h-(compact?14:17),item?`${item.name} · T${item.tier}`:'SIN EQUIPAR',{fontFamily:'system-ui',fontSize:compact?'8px':'9px',fontStyle:'700',color:item?'#66dfff':'#667a83'}).setOrigin(.5));
    });
  }

  _select(id){
    if(this.busy||this.slots.length>=3||!stripRecipeCanAccept(this.slots,id))return;
    const used=this.slots.filter(x=>x===id).length;if(qty(this.state,id)<=used)return;
    this.slots.push(id);this.render();
  }

  _craft(){
    if(this.busy)return;
    const recipe=findStripRecipe(this.slots);if(!recipe)return this._toast('Combinación incompleta');
    this.busy=true;const res=craftStrip(this.state,this.slots);
    if(!res.ok){this.busy=false;return this._toast(res.reason||'No se puede fabricar');}
    this.state=loadGarage();
    if(res.item?.kind==='part')equip(this.state,res.item.id,this.car);
    this.state=loadGarage();
    this.slots=[];
    const {width,height}=this.scale,flash=this.add.graphics().setDepth(5000);flash.fillStyle(res.item?.tone||0x65f09a,.18);flash.fillRect(0,0,width,height);
    this.tweens.add({targets:flash,alpha:0,duration:300,onComplete:()=>flash.destroy()});
    this.cameras.main.shake(90,.0012);this.busy=false;this._toast(`${res.item?.name||'Pieza'} fabricada y equipada`);this.render();
  }

  _toast(msg){
    const {width,height}=this.scale,t=this.add.text(width/2,height-88,msg,{fontFamily:'Arial Narrow,system-ui',fontSize:'15px',fontStyle:'900',color:'#ffffff',backgroundColor:'#0c2f3a',padding:{x:18,y:9}}).setOrigin(.5).setDepth(6000);
    this.tweens.add({targets:t,alpha:0,y:t.y-8,delay:900,duration:260,onComplete:()=>t.destroy()});
  }
}

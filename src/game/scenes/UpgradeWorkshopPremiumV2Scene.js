import Phaser from 'phaser';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, findStripRecipe, stripRecipeCanAccept } from '../garage/partsCatalog.js';
import { loadGarage, qty, craftStrip, equip, garageDisplayStats, getEquippedForCar } from '../garage/garageStore.js';

const CAR_BASE='assets/cars/runtime/';
const ITEM_BASE='assets/craft/items/';
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];
function selectedCar(){try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}}
function raritySlug(spec){return String(spec?.rarity||'comun').toLowerCase().replace(' ','_').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){
    super('upgrade-shop');
    this.state=null;this.car='stock';this.slots=[];this.filter='materials';this.root=null;this.busy=false;
    this.failedAssets=new Set();this.loadingAssets=new Set();
  }

  create(){
    this.car=selectedCar();this.state=loadGarage();
    this.scale.on('resize',this.render,this);
    this.events.once('shutdown',()=>this.scale.off('resize',this.render,this));
    this.render();
  }

  render(){
    const {width:w,height:h}=this.scale;
    if(this.root)this.root.destroy(true);
    this.root=this.add.container();const A=o=>{this.root.add(o);return o;};
    const compact=h<520;
    this._bg(A,w,h);this._header(A,w,compact);
    const top=compact?53:66,pad=compact?9:14,gap=compact?9:13,bottom=compact?64:80;
    const bodyH=h-top-bottom-pad,leftW=Math.round(w*.59);
    const left={x:pad,y:top,w:leftW-pad,h:bodyH};
    const right={x:left.x+left.w+gap,y:top,w:w-left.x-left.w-gap-pad,h:bodyH};
    this._carPanel(A,left,compact);this._craftPanel(A,right,compact);
    this._equippedStrip(A,{x:pad,y:h-bottom,w:w-pad*2,h:bottom-pad},compact);
  }

  _bg(A,w,h){
    const g=A(this.add.graphics());g.fillGradientStyle(0x04070a,0x0d161c,0x080c0f,0x101417,1);g.fillRect(0,0,w,h);
    for(let i=0;i<7;i++){const x=i*w/6;g.fillStyle(i%2?0x10191e:0x071015,.30);g.fillRect(x-80,55,160,h-55);g.lineStyle(1,0x55cfff,.07);g.lineBetween(x,55,x,h);}
    g.fillStyle(0x25cbff,.07);g.fillEllipse(w*.28,h*.42,w*.54,h*.73);g.fillStyle(0x000000,.22);g.fillRect(0,0,w,h);
    g.lineStyle(1,0xffffff,.028);for(let y=h*.62;y<h;y+=31)g.lineBetween(0,y,w,y);
  }

  _header(A,w,compact){
    const h=compact?47:59,g=A(this.add.graphics());g.fillStyle(0x020507,.98);g.fillRect(0,0,w,h);g.lineStyle(1,0x314752,.9);g.lineBetween(0,h-1,w,h-1);
    const back=A(this.add.text(16,h/2,'‹',{fontFamily:'Arial',fontSize:compact?'34px':'42px',fontStyle:'900',color:'#fff'}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
    A(this.add.text(compact?51:61,h/2,'GARAJE',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'18px':'23px',fontStyle:'900 italic',color:'#fff'}).setOrigin(0,.5));
    A(this.add.text(w*.58,h/2,'CRAFT STRIP',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#fff'}).setOrigin(.5));
    A(this.add.text(w-20,h/2,`◉  ${Number(this.state?.coins||0).toLocaleString('es-ES')}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#ffd54a'}).setOrigin(1,.5));
  }

  _panel(A,r,accent=0x2dcfff){const g=A(this.add.graphics());g.fillStyle(0x050b0f,.92);g.fillRoundedRect(r.x,r.y,r.w,r.h,13);g.lineStyle(1,accent,.58);g.strokeRoundedRect(r.x,r.y,r.w,r.h,13);return g;}

  _carPanel(A,r,compact){
    this._panel(A,r,0x2bcfff);const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const y=r.y+(compact?10:14);A(this.add.text(r.x+15,y,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#8da3ae'}));
    A(this.add.text(r.x+15,y+(compact?17:20),spec.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#fff'}));
    A(this.add.text(r.x+r.w-15,y+2,String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#ffd05a'}).setOrigin(1,0));
    const imageH=Math.round(r.h*(compact?0.58:0.62));
    const carR={x:r.x+10,y:r.y+(compact?53:66),w:r.w-20,h:imageH};this._platform(A,carR);this._carImage(A,spec,carR);
    this._stats(A,spec,{x:r.x+14,y:carR.y+carR.h+6,w:r.w-28,h:r.y+r.h-carR.y-carR.h-13},compact);
  }

  _platform(A,r){const g=A(this.add.graphics());g.fillGradientStyle(0x081015,0x0b171d,0x11191b,0x05090c,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,11);g.fillStyle(0x13252c,.84);g.fillEllipse(r.x+r.w*.49,r.y+r.h*.69,r.w*.76,r.h*.34);g.lineStyle(3,0x49d7ff,.5);g.strokeEllipse(r.x+r.w*.49,r.y+r.h*.69,r.w*.78,r.h*.37);g.fillStyle(0x52dfff,.05);g.fillEllipse(r.x+r.w*.49,r.y+r.h*.38,r.w*.72,r.h*.76);}

  _carImage(A,spec,r){
    const key=`premium_car_${this.car}`,cx=r.x+r.w*.49,cy=r.y+r.h*.45,w=r.w*.84,h=r.h*.80;
    const img=A(this.add.image(cx,cy,'__MISSING').setVisible(false));
    const apply=()=>{if(!img?.scene||!this.textures.exists(key))return false;img.setTexture(key).setVisible(true);img.setScale(Math.min(w/(img.width||1),h/(img.height||1)));return true;};
    if(apply())return;
    if(this.failedAssets.has(key)){this._carFallback(A,cx,cy,w,h);return;}
    const file=`card_${this.car}_${raritySlug(spec)}_${String(spec.collectionNo||0).padStart(3,'0')}.webp`;
    if(!this.loadingAssets.has(key)){
      this.loadingAssets.add(key);
      const cleanup=()=>{this.loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();if(!apply())this._carFallback(A,cx,cy,w,h);};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets.add(key);this._carFallback(A,cx,cy,w,h);};
      this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,`${CAR_BASE}${file}`);if(!this.load.isLoading())this.load.start();
    }
  }

  _carFallback(A,cx,cy,w,h){const g=A(this.add.graphics());g.fillStyle(0x1a262c);g.fillRoundedRect(cx-w*.29,cy-h*.22,w*.58,h*.44,20);g.fillStyle(0x2ccfff,.62);g.fillRoundedRect(cx-w*.17,cy-h*.17,w*.34,h*.17,10);g.fillStyle(0x050809);g.fillCircle(cx-w*.25,cy+h*.17,h*.10);g.fillCircle(cx+w*.25,cy+h*.17,h*.10);}

  _stats(A,spec,r,compact){
    const recipe=findStripRecipe(this.slots),result=recipe?GARAGE_ITEMS[recipe.out]:null,cur=garageDisplayStats(spec,this.state,this.car,null),next=result?.kind==='part'?garageDisplayStats(spec,this.state,this.car,result.id):cur;
    A(this.add.text(r.x,r.y,'ESTADÍSTICAS DEL COCHE',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#fff'}));
    const start=r.y+(compact?22:28),row=(r.h-(compact?24:30))/4;
    STATS.forEach(([k,label],i)=>{const y=start+i*row,v=cur[k],nv=next[k],d=nv-v;A(this.add.text(r.x,y,label,{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#dae5ea'}));A(this.add.text(r.x+(compact?112:132),y,String(v),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#fff'}));const bx=r.x+(compact?142:166),bw=Math.max(82,r.w-(compact?196:232)),bh=compact?8:10,bg=A(this.add.graphics());bg.fillStyle(0x132028);bg.fillRoundedRect(bx,y+3,bw,bh,bh/2);bg.fillStyle(0x20bfff);bg.fillRoundedRect(bx,y+3,bw*v/99,bh,bh/2);if(nv>v){bg.fillStyle(0x5af06e);bg.fillRoundedRect(bx+bw*v/99,y+3,bw*(nv-v)/99,bh,bh/2);}if(d)A(this.add.text(r.x+r.w,y,`${d>0?'+':''}${d}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'11px':'14px',fontStyle:'900',color:d>0?'#63ef70':'#ff6b6b'}).setOrigin(1,0));});
  }

  _craftPanel(A,r,compact){
    this._panel(A,r,0x2dcfff);A(this.add.text(r.x+r.w/2,r.y+11,'ELIGE 3 COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#fff'}).setOrigin(.5,0));
    const sy=r.y+(compact?37:47),gap=7,sw=(r.w-28-gap*2)/3,sh=compact?70:90;for(let i=0;i<3;i++)this._slot(A,i,r.x+14+i*(sw+gap),sy,sw,sh,compact);
    const ry=sy+sh+9,rh=compact?88:112;this._result(A,{x:r.x+14,y:ry,w:r.w-28,h:rh},compact);
    const ty=ry+rh+7,th=compact?27:33;this._tab(A,r.x+14,ty,(r.w-34)/2,th,'MATERIALES','materials',compact);this._tab(A,r.x+20+(r.w-34)/2,ty,(r.w-34)/2,th,'PIEZAS','parts',compact);
    this._inventory(A,{x:r.x+12,y:ty+th+7,w:r.w-24,h:r.y+r.h-(ty+th+7)-10},compact);
  }

  _slot(A,i,x,y,w,h,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null,g=A(this.add.graphics());g.fillStyle(item?0x07141b:0x081015);g.fillRoundedRect(x,y,w,h,9);g.lineStyle(item?2:1,item?(item.tone||0x2dcfff):0x2e4854,item?1:.8);g.strokeRoundedRect(x,y,w,h,9);
    if(!item){A(this.add.text(x+w/2,y+h/2,`+ ${i+1}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'26px',fontStyle:'900',color:'#4c6874'}).setOrigin(.5));return;}
    this._itemArt(A,item,x+w/2,y+h*.39,Math.min(w*.55,h*.43));A(this.add.text(x+w/2,y+h-17,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:w-7}}).setOrigin(.5));A(this.add.text(x+w-6,y+5,`×${qty(this.state,id)}`,{fontFamily:'system-ui',fontSize:compact?'9px':'10px',fontStyle:'900',color:'#fff'}).setOrigin(1,0));
    const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerdown',()=>{if(!this.busy){this.slots.splice(i,1);this.render();}});
  }

  _result(A,r,compact){
    const recipe=findStripRecipe(this.slots),item=recipe?GARAGE_ITEMS[recipe.out]:null,g=A(this.add.graphics());g.fillGradientStyle(item?0x160821:0x071017,0x071017,item?0x240b31:0x071017,0x05090d,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,item?0xc74cff:0x31515f,.8);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    if(!item){A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length?'COMPLETA UNA RECETA':'SELECCIONA TRES COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#718993'}).setOrigin(.5));return;}
    this._itemArt(A,item,r.x+r.w*.18,r.y+r.h*.46,Math.min(r.h*.62,r.w*.18));A(this.add.text(r.x+r.w*.31,r.y+12,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'16px':'21px',fontStyle:'900 italic',color:'#dc59ff'}));A(this.add.text(r.x+r.w*.31,r.y+(compact?35:43),`${FAMILY_LABEL[item.family]||'PIEZA'} · NIVEL ${item.tier||1}`,{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'800',color:'#dac2df'}));
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock,cur=garageDisplayStats(spec,this.state,this.car,null),next=garageDisplayStats(spec,this.state,this.car,item.id),changes=STATS.filter(([k])=>next[k]!==cur[k]).map(([k,l])=>`${l} ${cur[k]} › ${next[k]}`);
    A(this.add.text(r.x+r.w*.31,r.y+(compact?53:65),changes.slice(0,2).join('   ·   ')||'LISTA PARA EQUIPAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#65ef70'}));
    const btn=A(this.add.rectangle(r.x+r.w*.73,r.y+r.h-(compact?18:23),r.w*.45,compact?29:37,0xf5bb11).setStrokeStyle(1,0xffdf58).setInteractive({useHandCursor:true}));A(this.add.text(btn.x,btn.y,'FABRICAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'18px',fontStyle:'900',color:'#111'}).setOrigin(.5));btn.on('pointerdown',()=>this._craft());
  }

  _tab(A,x,y,w,h,label,key,compact){const on=this.filter===key,q=A(this.add.rectangle(x,y,w,h,on?0x0b2835:0x081116).setOrigin(0).setStrokeStyle(1,on?0x2dcfff:0x30454f).setInteractive({useHandCursor:true}));A(this.add.text(x+w/2,y+h/2,label,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:on?'#fff':'#80949d'}).setOrigin(.5));q.on('pointerdown',()=>{if(!this.busy){this.filter=key;this.render();}});}

  _inventory(A,r,compact){
    const used={};for(const id of this.slots)used[id]=(used[id]||0)+1;
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>{const item=GARAGE_ITEMS[id],part=item.kind==='part';if(this.filter==='parts'?!part:part)return false;if(qty(this.state,id)-(used[id]||0)<=0)return false;return this.slots.length<3&&stripRecipeCanAccept(this.slots,id);});
    const cols=4,gap=5,cw=(r.w-gap*3)/4,ch=Math.max(compact?52:64,(r.h-5)/2);
    ids.slice(0,8).forEach((id,i)=>{const x=r.x+(i%4)*(cw+gap),y=r.y+Math.floor(i/4)*(ch+gap);if(y+ch>r.y+r.h+2)return;const item=GARAGE_ITEMS[id],g=A(this.add.graphics());g.fillStyle(0x071218);g.fillRoundedRect(x,y,cw,ch,7);g.lineStyle(1,item.tone||0x2dcfff,.58);g.strokeRoundedRect(x,y,cw,ch,7);this._itemArt(A,item,x+cw/2,y+ch*.37,Math.min(cw*.40,ch*.40));A(this.add.text(x+cw/2,y+ch-14,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:cw-5}}).setOrigin(.5));A(this.add.text(x+cw-5,y+4,`×${qty(this.state,id)-(used[id]||0)}`,{fontFamily:'system-ui',fontSize:compact?'8px':'9px',fontStyle:'900',color:'#66e7ff'}).setOrigin(1,0));A(this.add.rectangle(x,y,cw,ch,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true})).on('pointerdown',()=>this._select(id));});
    if(!ids.length)A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length===3?'RECETA COMPLETA':'SIN COMPONENTES COMPATIBLES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#627985'}).setOrigin(.5));
  }

  _itemArt(A,item,cx,cy,size){
    const key=`craft_item_${item.id}`;
    if(this.textures.exists(key)){const img=A(this.add.image(cx,cy,key));img.setScale(Math.min(size/(img.width||1),size/(img.height||1)));return;}
    if(!this.failedAssets.has(key)&&!this.loadingAssets.has(key)){
      this.loadingAssets.add(key);const cleanup=()=>{this.loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};const ok=()=>{cleanup();this.render();};const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets.add(key);};this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,`${ITEM_BASE}${item.id}.webp`);if(!this.load.isLoading())this.load.start();
    }
    const g=A(this.add.graphics());g.fillStyle(item.tone||0x2dcfff,.12);g.fillCircle(cx,cy,size*.48);g.lineStyle(2,item.tone||0x2dcfff,.55);g.strokeCircle(cx,cy,size*.46);A(this.add.text(cx,cy,item.icon||'◆',{fontFamily:'system-ui',fontSize:`${Math.max(18,Math.round(size*.55))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5));
  }

  _equippedStrip(A,r,compact){
    const g=A(this.add.graphics());g.fillStyle(0x03080b,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,9);g.lineStyle(1,0x223c47,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);const eq=getEquippedForCar(this.state,this.car)||{},gap=5,cw=(r.w-gap*4)/5;
    FAMILIES.forEach((f,i)=>{const x=r.x+i*(cw+gap),item=eq[f]?GARAGE_ITEMS[eq[f]]:null,q=A(this.add.graphics());q.fillStyle(item?0x0a1b21:0x081116);q.fillRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);q.lineStyle(1,item?(item.tone||0x2dcfff):0x2b424c,.65);q.strokeRoundedRect(x+2,r.y+2,cw-4,r.h-4,6);A(this.add.text(x+cw/2,r.y+(compact?14:17),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(.5));A(this.add.text(x+cw/2,r.y+r.h-(compact?13:16),item?`${item.name} · T${item.tier}`:'SIN EQUIPAR',{fontFamily:'system-ui',fontSize:compact?'8px':'9px',fontStyle:'700',color:item?'#66dfff':'#667a83'}).setOrigin(.5));});
  }

  _select(id){if(this.busy||this.slots.length>=3||!stripRecipeCanAccept(this.slots,id))return;const used=this.slots.filter(x=>x===id).length;if(qty(this.state,id)<=used)return;this.slots.push(id);this.render();}
  _craft(){if(this.busy)return;const recipe=findStripRecipe(this.slots);if(!recipe)return this._toast('Combinación incompleta');this.busy=true;const res=craftStrip(this.state,this.slots);if(!res.ok){this.busy=false;return this._toast(res.reason||'No se puede fabricar');}this.state=loadGarage();if(res.item?.kind==='part')equip(this.state,res.item.id,this.car);this.state=loadGarage();this.slots=[];this.cameras.main.shake(90,.0012);this.busy=false;this._toast(`${res.item?.name||'Pieza'} fabricada y equipada`);this.render();}
  _toast(msg){const {width,height}=this.scale,t=this.add.text(width/2,height-82,msg,{fontFamily:'Arial Narrow,system-ui',fontSize:'15px',fontStyle:'900',color:'#fff',backgroundColor:'#0c2f3a',padding:{x:18,y:9}}).setOrigin(.5).setDepth(6000);this.tweens.add({targets:t,alpha:0,y:t.y-8,delay:900,duration:260,onComplete:()=>t.destroy()});}
}

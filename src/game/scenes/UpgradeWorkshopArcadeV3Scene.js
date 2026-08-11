import Phaser from 'phaser';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, CRAFT_STRIP_RECIPES, findStripRecipe, stripRecipeCanAccept } from '../garage/partsCatalog.js';
import { loadGarage, qty, craftStrip, equip, garageDisplayStats, getEquippedForCar } from '../garage/garageStore.js';

const CARD_BASE='assets/cars/runtime/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const STAT_META={
  speed:{label:'VELOCIDAD',icon:'⚡'},
  accel:{label:'ACELERACIÓN',icon:'»'},
  grip:{label:'AGARRE',icon:'◉'},
  control:{label:'CONTROL',icon:'◇'}
};
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSP.',transmission:'CAJA'};

function carId(){try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}}
function raritySlug(spec){return String(spec?.rarity||'comun').toLowerCase().replace(' ','_').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function multisetFits(selected,recipe){
  const bag=[...recipe.in];
  for(const id of selected){const i=bag.indexOf(id);if(i<0)return false;bag.splice(i,1);}return true;
}

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){super('upgrade-shop');this.state=null;this.car='stock';this.slots=[];this.filter='materials';this.ui=null;this.busy=false;}

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
    const compact=h<470;
    this._background(A,w,h);
    this._header(A,w,compact);

    const top=compact?48:62,pad=compact?8:14,gap=compact?8:12;
    const bodyH=h-top-pad;
    const leftW=Math.round(w*.565);
    const left={x:pad,y:top,w:leftW-pad,h:bodyH};
    const right={x:left.x+left.w+gap,y:top,w:w-(left.x+left.w+gap)-pad,h:bodyH};
    this._carStage(A,left,compact);
    this._craftStage(A,right,compact);
  }

  _background(A,w,h){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x05080b,0x11181d,0x090c10,0x21170e,1);g.fillRect(0,0,w,h);
    g.fillStyle(0x071015,.72);g.fillRect(0,0,w,h);
    g.fillStyle(0x35d9ff,.06);g.fillEllipse(w*.26,h*.40,w*.52,h*.72);
    g.fillStyle(0xffa62d,.08);g.fillEllipse(w*.76,h*.35,w*.40,h*.68);
    g.lineStyle(1,0xffffff,.025);for(let y=h*.58;y<h;y+=34)g.lineBetween(0,y,w,y);
  }

  _header(A,w,compact){
    const h=compact?44:56,g=A(this.add.graphics());
    g.fillStyle(0x05080a,.97);g.fillRect(0,0,w,h);g.lineStyle(1,0x31424a,.8);g.lineBetween(0,h-1,w,h-1);
    A(this.add.text(14,h/2,'TDR  /  CRAFT STRIP',{fontFamily:'Orbitron,system-ui',fontSize:compact?'15px':'21px',fontStyle:'900 italic',color:'#f4f8fa'}).setOrigin(0,.5));
    A(this.add.text(compact?190:260,h/2,'3 PIEZAS · 1 RESULTADO · CAMBIO REAL',{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#74e8ff'}).setOrigin(0,.5));
    const back=A(this.add.text(w-14,h/2,'← GARAGE',{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff',backgroundColor:'#182126',padding:{x:10,y:7}}).setOrigin(1,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
  }

  _panel(A,r,accent=0x43d9ff){
    const g=A(this.add.graphics());g.fillStyle(0x071116,.93);g.fillRoundedRect(r.x,r.y,r.w,r.h,14);g.lineStyle(1,accent,.34);g.strokeRoundedRect(r.x,r.y,r.w,r.h,14);return g;
  }

  _carStage(A,r,compact){
    this._panel(A,r,0x39d6ff);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const titleY=r.y+(compact?12:16);
    A(this.add.text(r.x+16,titleY,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#7f949e'}));
    A(this.add.text(r.x+16,titleY+(compact?13:16),spec.name.toUpperCase(),{fontFamily:'Orbitron,system-ui',fontSize:compact?'14px':'20px',fontStyle:'900',color:'#ffffff'}));
    A(this.add.text(r.x+r.w-16,titleY+(compact?4:6),String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#ffd15c'}).setOrigin(1,0));

    const carBox={x:r.x+12,y:r.y+(compact?52:70),w:r.w*.52,h:r.h-(compact?64:88)};
    const statsBox={x:carBox.x+carBox.w+10,y:carBox.y,w:r.x+r.w-(carBox.x+carBox.w+10)-12,h:carBox.h};
    this._carVisual(A,spec,carBox,compact);
    this._stats(A,spec,statsBox,compact);
  }

  _carVisual(A,spec,r,compact){
    const g=A(this.add.graphics());g.fillStyle(0x05090c,.72);g.fillRoundedRect(r.x,r.y,r.w,r.h,12);g.lineStyle(1,0x33535f,.45);g.strokeRoundedRect(r.x,r.y,r.w,r.h,12);
    g.fillStyle(0x2dd7ff,.08);g.fillEllipse(r.x+r.w*.50,r.y+r.h*.47,r.w*.78,r.h*.55);
    g.lineStyle(1,0x57dfff,.12);g.strokeEllipse(r.x+r.w*.50,r.y+r.h*.47,r.w*.80,r.h*.57);
    const cx=r.x+r.w*.50,cy=r.y+r.h*.44;
    this._drawCarImage(A,spec,cx,cy,r.w*.82,r.h*.54);
    A(this.add.text(cx,r.y+r.h-compact?22:26,'',{fontSize:'1px'}));
    const eq=getEquippedForCar(this.state,this.car)||{};
    const families=['engine','tires','brakes','suspension','transmission'];
    const chipGap=4,chipW=(r.w-20-chipGap*4)/5,chipY=r.y+r.h-(compact?34:42);
    families.forEach((f,i)=>{
      const id=eq[f],item=id?GARAGE_ITEMS[id]:null,x=r.x+10+i*(chipW+chipGap),cg=A(this.add.graphics());
      cg.fillStyle(item?0x10291f:0x10171b,.94);cg.fillRoundedRect(x,chipY,chipW,compact?25:31,6);cg.lineStyle(1,item?(item.tone||0x4ee1a0):0x34434a,.65);cg.strokeRoundedRect(x,chipY,chipW,compact?25:31,6);
      A(this.add.text(x+chipW/2,chipY+5,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:compact?'5px':'6px',fontStyle:'900',color:'#7f929b'}).setOrigin(.5,0));
      A(this.add.text(x+chipW/2,chipY+(compact?16:20),item?`T${item.tier}`:'—',{fontFamily:'Orbitron,system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:item?'#fff':'#51626a'}).setOrigin(.5));
    });
  }

  _drawCarImage(A,spec,cx,cy,w,h){
    const key=`workshop_car_${this.car}`;
    const img=A(this.add.image(cx,cy,'__MISSING').setVisible(false));
    const fallback=()=>{
      if(img?.scene)img.setVisible(false);
      const g=A(this.add.graphics());g.fillStyle(0x17242a,1);g.fillRoundedRect(cx-w*.30,cy-h*.30,w*.60,h*.60,18);g.fillStyle(0x36d9ff,.65);g.fillRoundedRect(cx-w*.18,cy-h*.24,w*.36,h*.22,10);g.fillStyle(0x050708,1);g.fillRect(cx-w*.34,cy-h*.25,w*.10,h*.17);g.fillRect(cx+w*.24,cy-h*.25,w*.10,h*.17);g.fillRect(cx-w*.34,cy+h*.08,w*.10,h*.17);g.fillRect(cx+w*.24,cy+h*.08,w*.10,h*.17);
    };
    const apply=()=>{if(!img?.scene||!this.textures.exists(key))return false;img.setTexture(key).setVisible(true);const s=Math.min(w/(img.width||1),h/(img.height||1));img.setScale(s);return true;};
    if(apply())return;
    const file=`card_${this.car}_${raritySlug(spec)}_${String(spec.collectionNo||0).padStart(3,'0')}.webp`;
    const ok=()=>{cleanup();if(!apply())fallback();};
    const err=f=>{if(f?.key!==key)return;cleanup();fallback();};
    const cleanup=()=>{this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
    this.load.once(`filecomplete-image-${key}`,ok);this.load.on('loaderror',err);this.load.image(key,`${CARD_BASE}${file}`);if(!this.load.isLoading())this.load.start();
  }

  _stats(A,spec,r,compact){
    const recipe=findStripRecipe(this.slots);
    const result=recipe?GARAGE_ITEMS[recipe.out]:null;
    const current=garageDisplayStats(spec,this.state,this.car,null);
    const preview=result?.kind==='part'?garageDisplayStats(spec,this.state,this.car,result.id):current;
    A(this.add.text(r.x,r.y,'RENDIMIENTO',{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#8ca1aa'}));
    const keys=['speed','accel','grip','control'];
    const startY=r.y+(compact?24:32),rowH=(r.h-(compact?30:40))/4;
    keys.forEach((k,i)=>{
      const y=startY+i*rowH,meta=STAT_META[k],cur=current[k],next=preview[k],delta=next-cur;
      A(this.add.text(r.x,y,meta.label,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#dbe5e9'}));
      A(this.add.text(r.x+r.w,y,delta?`${cur}  →  ${next}`:`${cur}`,{fontFamily:'Orbitron,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:delta>0?'#58ef9a':'#ffffff'}).setOrigin(1,0));
      const by=y+(compact?13:18),bh=compact?7:9,bg=A(this.add.graphics());
      bg.fillStyle(0x182329,1);bg.fillRoundedRect(r.x,by,r.w,bh,bh/2);
      bg.fillStyle(0x3bd4ff,.82);bg.fillRoundedRect(r.x,by,r.w*(cur/99),bh,bh/2);
      if(next>cur){bg.fillStyle(0x55ef91,.95);bg.fillRoundedRect(r.x+r.w*(cur/99),by,r.w*((next-cur)/99),bh,bh/2);}
      if(delta)A(this.add.text(r.x+r.w,by+bh+2,`+${delta}`,{fontFamily:'Orbitron,system-ui',fontSize:compact?'6px':'7px',fontStyle:'900',color:'#58ef9a'}).setOrigin(1,0));
    });
  }

  _craftStage(A,r,compact){
    this._panel(A,r,0xffb52d);
    A(this.add.text(r.x+14,r.y+10,'FABRICAR',{fontFamily:'Orbitron,system-ui',fontSize:compact?'13px':'17px',fontStyle:'900',color:'#fff'}));
    A(this.add.text(r.x+r.w-14,r.y+12,'TOCA 3 COMPONENTES',{fontFamily:'system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:'#d5b36a'}).setOrigin(1,0));

    const slotY=r.y+(compact?34:43),slotGap=6,slotW=(r.w-28-slotGap*2)/3,slotH=compact?52:66;
    for(let i=0;i<3;i++)this._slot(A,i,r.x+14+i*(slotW+slotGap),slotY,slotW,slotH,compact);

    const resultY=slotY+slotH+6,resultH=compact?49:60;
    this._result(A,{x:r.x+14,y:resultY,w:r.w-28,h:resultH},compact);

    const tabY=resultY+resultH+7,tabH=compact?24:28;
    this._tab(A,r.x+14,tabY,(r.w-34)/2,tabH,'MATERIALES','materials',compact);
    this._tab(A,r.x+20+(r.w-34)/2,tabY,(r.w-34)/2,tabH,'PIEZAS','parts',compact);

    const gridY=tabY+tabH+6;
    this._inventoryGrid(A,{x:r.x+12,y:gridY,w:r.w-24,h:r.y+r.h-gridY-10},compact);
  }

  _slot(A,i,x,y,w,h,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null,g=A(this.add.graphics());
    g.fillStyle(item?0x102129:0x0a1014,.98);g.fillRoundedRect(x,y,w,h,9);g.lineStyle(item?2:1,item?(item.tone||0x51d9ff):0x425158,item?1:.65);g.strokeRoundedRect(x,y,w,h,9);
    if(item){
      g.fillStyle(item.tone||0x51d9ff,.13);g.fillEllipse(x+w/2,y+h*.45,w*.72,h*.62);
      A(this.add.text(x+w/2,y+h*.38,item.icon||'◆',{fontSize:compact?'19px':'25px'}).setOrigin(.5));
      A(this.add.text(x+w/2,y+h-7,item.name.toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'5px':'6px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:w-6}}).setOrigin(.5,1));
      const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerdown',()=>{if(this.busy)return;this.slots.splice(i,1);this.render();});
    }else{
      A(this.add.text(x+w/2,y+h/2,`+ ${i+1}`,{fontFamily:'Orbitron,system-ui',fontSize:compact?'12px':'15px',fontStyle:'900',color:'#53636a'}).setOrigin(.5));
    }
  }

  _result(A,r,compact){
    const recipe=findStripRecipe(this.slots),item=recipe?GARAGE_ITEMS[recipe.out]:null;
    const possible=CRAFT_STRIP_RECIPES.filter(q=>multisetFits(this.slots,q));
    const g=A(this.add.graphics());g.fillStyle(item?0x10291d:0x0a1216,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(2,item?(item.tone||0x55ef9a):0x34464e,.78);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    if(item){
      A(this.add.text(r.x+12,r.y+r.h/2,item.icon||'◆',{fontSize:compact?'22px':'28px'}).setOrigin(0,.5));
      A(this.add.text(r.x+(compact?44:52),r.y+8,item.name.toUpperCase(),{fontFamily:'Orbitron,system-ui',fontSize:compact?'8px':'11px',fontStyle:'900',color:'#fff'}));
      A(this.add.text(r.x+(compact?44:52),r.y+(compact?25:31),`TIER ${item.tier||1} · SE EQUIPA AUTOMÁTICAMENTE`,{fontFamily:'system-ui',fontSize:compact?'5.5px':'7px',fontStyle:'900',color:'#58ef9a'}));
      const bw=compact?92:118,bh=compact?30:38,bx=r.x+r.w-bw-7,by=r.y+(r.h-bh)/2;
      const bg=A(this.add.graphics());bg.fillStyle(0xffb52d,1);bg.fillRoundedRect(bx,by,bw,bh,8);bg.fillStyle(0xffffff,.13);bg.fillRoundedRect(bx+2,by+2,bw-4,bh*.42,6);
      const b=A(this.add.rectangle(bx,by,bw,bh,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));
      A(this.add.text(bx+bw/2,by+bh/2,'FABRICAR',{fontFamily:'Orbitron,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#171006'}).setOrigin(.5));b.on('pointerdown',()=>this._craft());
    }else{
      const txt=this.slots.length===0?'ELIGE EL PRIMER COMPONENTE':this.slots.length<3?`${possible.length} RECETA${possible.length===1?'':'S'} POSIBLE${possible.length===1?'':'S'}`:'COMBINACIÓN NO VÁLIDA';
      A(this.add.text(r.x+r.w/2,r.y+r.h/2,txt,{fontFamily:'Orbitron,system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:this.slots.length===3?'#ff6976':'#8da2ab'}).setOrigin(.5));
    }
  }

  _tab(A,x,y,w,h,label,key,compact){
    const on=this.filter===key,g=A(this.add.graphics());g.fillStyle(on?0x17313a:0x0b1216,.98);g.fillRoundedRect(x,y,w,h,7);g.lineStyle(1,on?0x44dcff:0x34434a,.8);g.strokeRoundedRect(x,y,w,h,7);
    A(this.add.text(x+w/2,y+h/2,label,{fontFamily:'system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:on?'#8cecff':'#768890'}).setOrigin(.5));
    const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerdown',()=>{if(!this.busy){this.filter=key;this.render();}});
  }

  _inventoryGrid(A,r,compact){
    let ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0);
    ids=ids.filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind==='material');
    ids.sort((a,b)=>(GARAGE_ITEMS[a].tier||0)-(GARAGE_ITEMS[b].tier||0)||GARAGE_ITEMS[a].name.localeCompare(GARAGE_ITEMS[b].name));
    const cols=4,gap=5,rows=2,cw=(r.w-gap*(cols-1))/cols,ch=(r.h-gap)/rows;
    if(!ids.length){A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.filter==='parts'?'AÚN NO HAY PIEZAS':'SIN MATERIALES',{fontFamily:'Orbitron,system-ui',fontSize:'8px',fontStyle:'900',color:'#61747d'}).setOrigin(.5));return;}
    ids.slice(0,8).forEach((id,i)=>this._itemCard(A,id,r.x+(i%cols)*(cw+gap),r.y+Math.floor(i/cols)*(ch+gap),cw,ch,compact));
  }

  _itemCard(A,id,x,y,w,h,compact){
    const item=GARAGE_ITEMS[id],reserved=this.slots.filter(s=>s===id).length,available=qty(this.state,id)-reserved,valid=this.slots.length<3&&available>0&&stripRecipeCanAccept(this.slots,id);
    const g=A(this.add.graphics());g.fillStyle(valid?0x0e1b20:0x0a1013,.98);g.fillRoundedRect(x,y,w,h,8);g.lineStyle(1,valid?(item.tone||0x4dd8ff):0x2c383d,valid?.85:.35);g.strokeRoundedRect(x,y,w,h,8);
    if(valid){g.fillStyle(item.tone||0x4dd8ff,.10);g.fillEllipse(x+w*.5,y+h*.42,w*.72,h*.54);}
    const alpha=valid?1:.30;
    A(this.add.text(x+w*.5,y+h*.38,item.icon||'◆',{fontSize:compact?'17px':'22px',alpha}).setOrigin(.5));
    A(this.add.text(x+w-5,y+4,`×${Math.max(0,available)}`,{fontFamily:'Orbitron,system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:valid?'#ffd75c':'#5b666a'}).setOrigin(1,0));
    A(this.add.text(x+w*.5,y+h-5,item.name.toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'4.7px':'5.8px',fontStyle:'900',color:valid?'#fff':'#58666c',align:'center',wordWrap:{width:w-5}}).setOrigin(.5,1));
    if(valid){const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));hit.on('pointerdown',()=>{if(this.busy||this.slots.length>=3)return;this.slots.push(id);this.render();});}
  }

  _craft(){
    if(this.busy)return;
    const recipe=findStripRecipe(this.slots);if(!recipe)return this._toast('Combinación no válida',0xff5968);
    this.busy=true;
    const result=craftStrip(this.state,this.slots);
    if(!result.ok){this.busy=false;return this._toast(result.reason||'No se puede fabricar',0xff5968);}
    this.state=loadGarage();
    if(result.item?.kind==='part'){
      equip(this.state,result.item.id,this.car);
      this.state=loadGarage();
    }
    const {width,height}=this.scale,cx=width*.76,cy=height*.44;
    const ring=this.add.graphics().setDepth(5000);ring.lineStyle(7,result.item?.tone||0x58ef9a,1);ring.strokeCircle(cx,cy,28);
    this.tweens.add({targets:ring,alpha:0,scaleX:4,scaleY:4,duration:420,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});
    this.cameras.main.shake(110,.0016);
    this.slots=[];this.filter='parts';
    this.time.delayedCall(180,()=>{this.busy=false;this.render();this._toast(`${result.item.name.toUpperCase()} · EQUIPADA`,result.item.tone||0x58ef9a);});
  }

  _toast(msg,tone=0x2da86a){
    const {width,height}=this.scale,t=this.add.text(width/2,height-18,msg,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#fff',backgroundColor:'#123126',padding:{x:14,y:7}}).setOrigin(.5,1).setDepth(7000);
    t.setTint(tone===0xff5968?0xffdddd:0xffffff);this.tweens.add({targets:t,alpha:0,y:t.y-8,delay:850,duration:260,onComplete:()=>t.destroy()});
  }
}

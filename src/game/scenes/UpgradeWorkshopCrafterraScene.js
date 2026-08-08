import Phaser from 'phaser';
import { GARAGE_ITEMS, findRecipe } from '../garage/partsCatalog.js';
import { loadGarage, qty, craft, equip, duplicateLastReward, getEquippedForCar, garageTuning } from '../garage/garageStore.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';

const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSP.',transmission:'CAJA'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const inside=(p,r)=>!!r&&p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function selectedCarId(){try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}}
function legacyUpgradeTuning(carId){
  let u={engine:0,brakes:0,tires:0};
  try{u=JSON.parse(localStorage.getItem(`tdr2:upgrades:${carId}`)||'null')||u;}catch{}
  const e=u.engine||0,b=u.brakes||0,t=u.tires||0;
  return {accelMult:1+e*.08,maxFwdAdd:e*35,brakeMult:1+b*.10,dragMult:1,turnRateMult:1,turnMinAdd:0,maxRevAdd:0,gripDriveAdd:t*.02,gripCoastAdd:t*.01,gripBrakeAdd:t*.015};
}
function combine(a,b){return{
  accelMult:(a.accelMult||1)*(b.accelMult||1),brakeMult:(a.brakeMult||1)*(b.brakeMult||1),dragMult:(a.dragMult||1)*(b.dragMult||1),turnRateMult:(a.turnRateMult||1)*(b.turnRateMult||1),
  maxFwdAdd:(a.maxFwdAdd||0)+(b.maxFwdAdd||0),maxRevAdd:(a.maxRevAdd||0)+(b.maxRevAdd||0),turnMinAdd:(a.turnMinAdd||0)+(b.turnMinAdd||0),
  gripCoastAdd:(a.gripCoastAdd||0)+(b.gripCoastAdd||0),gripDriveAdd:(a.gripDriveAdd||0)+(b.gripDriveAdd||0),gripBrakeAdd:(a.gripBrakeAdd||0)+(b.gripBrakeAdd||0)
};}
function pct(a,b){return a?((b-a)/a)*100:0;}
function signed(v){return Math.abs(v)<.01?'—':`${v>0?'+':''}${v.toFixed(1)}%`;}

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){
    super('upgrade-shop');
    this.state=null;this.carId='stock';this.filter='materials';this.ui=null;
    this.boardTokens=[];this.tokenViews=new Map();this.drag=null;this.uid=1;
    this.boardRect=null;this.mountZones={};this.inventoryRect=null;
  }

  create(){
    this.carId=selectedCarId();this.state=loadGarage();this.cameras.main.setBackgroundColor('#071016');
    this._onMove=p=>this._pointerMove(p);this._onUp=p=>this._pointerUp(p);this._onResize=()=>this.render();
    this.input.on('pointermove',this._onMove);this.input.on('pointerup',this._onUp);this.scale.on('resize',this._onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.input.off('pointermove',this._onMove);this.input.off('pointerup',this._onUp);this.scale.off('resize',this._onResize);
      this._destroyDragVisual();
    });
    this.render();
  }

  _performance(){
    const spec=CAR_SPECS[this.carId]||CAR_SPECS.stock;
    const legacy=legacyUpgradeTuning(this.carId);
    const base=resolveCarParams(spec,legacy);
    const full=resolveCarParams(spec,combine(legacy,garageTuning(this.state,this.carId)));
    return {spec,base,full};
  }

  render(){
    const {width,height}=this.scale;
    if(this.ui)this.ui.destroy(true);
    this.ui=this.add.container(0,0);this.tokenViews.clear();this.mountZones={};
    const add=o=>{this.ui.add(o);return o;};

    this._drawBackground(add,width,height);
    const pad=clamp(width*.018,14,28),header=76;
    const leftW=clamp(width*.245,300,430),rightW=clamp(width*.235,300,420);
    const gap=14,boardX=pad+leftW+gap,boardW=width-pad-rightW-gap-boardX;
    const top=header,bottom=height-pad,contentH=bottom-top;

    add(this.add.text(pad,12,'TDR WORKSHOP',{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.021,24,36)+'px',fontStyle:'900',color:'#f7fbff'}));
    add(this.add.text(pad,48,'ARRASTRA · FUSIONA · DESCUBRE · EQUIPA',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'900',color:'#62f1a8',letterSpacing:1.4}));
    const back=add(this.add.text(width-pad,20,'← GARAGE',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'900',color:'#e7f1f5'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>this.scene.start('menu'));

    this._panel(add,pad,top,leftW,contentH,'MOCHILA',0x55e9a0);
    this._panel(add,boardX,top,boardW,contentH,'MESA DE FUSIÓN',0x55bfff);
    const rightX=width-pad-rightW;this._panel(add,rightX,top,rightW,contentH,'COCHE',0xffca58);

    this._renderInventory(add,{x:pad,y:top,w:leftW,h:contentH});
    this._renderBoard(add,{x:boardX,y:top,w:boardW,h:contentH});
    this._renderCarBay(add,{x:rightX,y:top,w:rightW,h:contentH});
    this._renderBoardTokens(add);
  }

  _drawBackground(add,width,height){
    const g=add(this.add.graphics());
    g.fillGradientStyle(0x05090d,0x09131a,0x071016,0x102018,1);g.fillRect(0,0,width,height);
    g.fillStyle(0x2ef5a0,.045);g.fillEllipse(width*.12,height*.92,width*.7,height*.72);
    g.fillStyle(0x36a9ff,.035);g.fillEllipse(width*.88,height*.06,width*.62,height*.64);
    g.lineStyle(14,0xffffff,.015);for(let x=-height;x<width+height;x+=140)g.lineBetween(x,height,x+height,0);
    g.lineStyle(1,0xffffff,.02);for(let y=0;y<height;y+=72)g.lineBetween(0,y,width,y);
  }

  _panel(add,x,y,w,h,title,color){
    const g=add(this.add.graphics());
    g.fillStyle(0x071116,.95);g.fillRoundedRect(x,y,w,h,14);g.lineStyle(1,color,.42);g.strokeRoundedRect(x,y,w,h,14);
    g.fillStyle(color,.12);g.fillRoundedRect(x+1,y+1,w-2,42,13);
    add(this.add.text(x+16,y+13,title,{fontFamily:'Orbitron,system-ui',fontSize:'11px',fontStyle:'900',color:'#fff'}));
  }

  _renderInventory(add,r){
    const tabY=r.y+50,tabW=(r.w-40)/2;
    this._tab(add,r.x+14,tabY,tabW,'MATERIALES','materials');this._tab(add,r.x+26+tabW,tabY,tabW,'PIEZAS','parts');
    add(this.add.text(r.x+16,tabY+36,this.filter==='materials'?'Coge un material y llévalo a la mesa':'Lleva una pieza directamente al coche',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'800',color:'#8199a2'}));
    this.inventoryRect={x:r.x+10,y:tabY+52,w:r.w-20,h:r.h-112};

    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0).filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind!=='part');
    const cols=2,gap=10,gx=r.x+14,gy=tabY+60,gw=r.w-28,cw=(gw-gap)/2,ch=92;
    const equipped=getEquippedForCar(this.state,this.carId);
    ids.slice(0,10).forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],x=gx+(i%cols)*(cw+gap),y=gy+Math.floor(i/cols)*(ch+gap);if(y+ch>r.y+r.h-12)return;
      this._inventoryCard(add,id,item,qty(this.state,id),x,y,cw,ch,equipped?.[item.family]===id);
    });
  }

  _tab(add,x,y,w,label,key){
    const on=this.filter===key;const bg=add(this.add.rectangle(x,y,w,30,on?0x1c4a37:0x101d22,.98).setOrigin(0).setStrokeStyle(1,on?0x59eda5:0x2b414a,.85).setInteractive({useHandCursor:true}));
    add(this.add.text(x+w/2,y+15,label,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:on?'#d2ffe5':'#70868e'}).setOrigin(.5));
    bg.on('pointerdown',()=>{if(this.drag)return;this.filter=key;this.render();});
  }

  _inventoryCard(add,id,item,q,x,y,w,h,equipped){
    const c=add(this.add.container(x,y));c.setDepth(20);
    const g=this.add.graphics();c.add(g);const tone=item.tone||0x6cc9ff;
    g.fillStyle(equipped?0x17382b:0x0c181e,.98);g.fillRoundedRect(0,0,w,h,10);g.lineStyle(equipped?2:1,equipped?0x58eca2:0x29434d,.9);g.strokeRoundedRect(0,0,w,h,10);
    g.fillStyle(tone,.16);g.fillRoundedRect(5,5,w-10,48,8);
    const art=this.add.container(w*.5,29);c.add(art);this._drawItemArt(art,item,46);
    c.add(this.add.text(w-8,7,`×${q}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#73e8ff'}).setOrigin(1,0));
    c.add(this.add.text(8,59,item.name,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:'#eff7f9',wordWrap:{width:w-16},align:'center'}));
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(0,0,w,h),Phaser.Geom.Rectangle.Contains,{useHandCursor:true});
    c.on('pointerdown',p=>{p.event?.stopPropagation?.();this._beginInventoryDrag(id,p);});
  }

  _renderBoard(add,r){
    this.boardRect={x:r.x+14,y:r.y+52,w:r.w-28,h:r.h-66};
    const b=this.boardRect,g=add(this.add.graphics());
    g.fillStyle(0x06101a,.98);g.fillRoundedRect(b.x,b.y,b.w,b.h,18);g.lineStyle(2,0x4dbdff,.28);g.strokeRoundedRect(b.x,b.y,b.w,b.h,18);
    g.lineStyle(1,0x54bfff,.10);for(let rad=70;rad<Math.min(b.w,b.h);rad+=62)g.strokeCircle(b.x+b.w/2,b.y+b.h/2,rad);
    g.lineStyle(1,0x57efa5,.08);for(let a=0;a<Math.PI*2;a+=Math.PI/8)g.lineBetween(b.x+b.w/2,b.y+b.h/2,b.x+b.w/2+Math.cos(a)*b.w*.45,b.y+b.h/2+Math.sin(a)*b.h*.45);
    add(this.add.text(b.x+b.w/2,b.y+24,'ARRASTRA UN OBJETO SOBRE OTRO',{fontFamily:'Orbitron,system-ui',fontSize:'10px',fontStyle:'900',color:'#8dd7ff'}).setOrigin(.5));
    add(this.add.text(b.x+b.w/2,b.y+45,'Si combinan, se fusionan. Si no, siguen siendo tuyos.',{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'700',color:'#667f8b'}).setOrigin(.5));
    const clear=add(this.add.text(b.x+b.w-14,b.y+b.h-14,'VACIAR MESA',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#718a93',backgroundColor:'#102029',padding:{x:8,y:5}}).setOrigin(1,1).setInteractive({useHandCursor:true}));
    clear.on('pointerdown',()=>{if(this.drag)return;this.boardTokens=[];this.render();});
  }

  _renderBoardTokens(add){
    for(const t of this.boardTokens){
      const item=GARAGE_ITEMS[t.id];if(!item)continue;
      const c=add(this._makeToken(t,item));this.tokenViews.set(t.uid,c);
    }
  }

  _makeToken(t,item){
    const c=this.add.container(t.x,t.y).setDepth(100);const g=this.add.graphics();c.add(g);const tone=item.tone||0x66c6ff;
    g.fillStyle(0x071116,.96);g.fillCircle(0,0,42);g.lineStyle(3,tone,.8);g.strokeCircle(0,0,42);g.fillStyle(tone,.10);g.fillCircle(0,0,35);
    const art=this.add.container(0,-3);c.add(art);this._drawItemArt(art,item,54);
    const label=this.add.text(0,33,item.name,{fontFamily:'system-ui',fontSize:'7px',fontStyle:'900',color:'#f0f7f8',backgroundColor:'#071116',padding:{x:5,y:2}}).setOrigin(.5);c.add(label);
    c.setSize(88,88).setInteractive(new Phaser.Geom.Circle(44,44,44),Phaser.Geom.Circle.Contains,{useHandCursor:true});
    c.on('pointerdown',p=>{p.event?.stopPropagation?.();this._beginTokenDrag(t.uid,p);});
    return c;
  }

  _renderCarBay(add,r){
    const {spec,base,full}=this._performance();
    add(this.add.text(r.x+16,r.y+50,spec.name,{fontFamily:'Orbitron,system-ui',fontSize:'12px',fontStyle:'900',color:'#fff'}));
    add(this.add.text(r.x+16,r.y+70,`${spec.brand||''} · ${spec.role||''}`,{fontFamily:'system-ui',fontSize:'8px',fontStyle:'800',color:'#879ca3'}));

    const cx=r.x+r.w/2,cy=r.y+178;this._drawCar(add,cx,cy,112,168);
    const zw=r.w-28,zh=44,zx=r.x+14,startY=r.y+274;
    const equipped=getEquippedForCar(this.state,this.carId);
    FAMILIES.forEach((f,i)=>{
      const y=startY+i*(zh+6),id=equipped?.[f],item=id?GARAGE_ITEMS[id]:null;
      const g=add(this.add.graphics());g.fillStyle(item?0x163629:0x0d181d,.98);g.fillRoundedRect(zx,y,zw,zh,8);g.lineStyle(1,item?0x56e9a0:0x344b53,.8);g.strokeRoundedRect(zx,y,zw,zh,8);
      add(this.add.text(zx+10,y+7,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#758b92'}));
      if(item){this._drawItemArtAt(add,item,zx+34,y+28,28);add(this.add.text(zx+52,y+24,item.name,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:'#fff',wordWrap:{width:zw-92}}));add(this.add.text(zx+zw-10,y+14,`T${item.tier}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#58eca2'}).setOrigin(1,0));}
      else add(this.add.text(zx+10,y+24,'SUELTA AQUÍ',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#4f6870'}));
      this.mountZones[f]={x:zx,y,w:zw,h:zh};
    });

    const perfY=r.y+r.h-83;add(this.add.text(r.x+16,perfY,'EFECTO DEL MONTAJE',{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#6f858c'}));
    const stats=[['PUNTA',pct(base.maxFwd,full.maxFwd)],['ACEL',pct(base.accel,full.accel)],['FRENO',pct(base.brakeForce,full.brakeForce)],['GIRO',pct(base.turnRate,full.turnRate)],['GRIP',pct(base.gripDrive,full.gripDrive)]];
    stats.forEach((s,i)=>{const x=r.x+16+i*((r.w-32)/5);add(this.add.text(x,perfY+20,`${s[0]}\n${signed(s[1])}`,{fontFamily:'system-ui',fontSize:'7px',fontStyle:'900',align:'center',color:s[1]>.01?'#62efa8':'#71868d'}).setOrigin(0,0));});
  }

  _drawCar(add,cx,cy,w,h){
    const c=add(this.add.container(cx,cy));const g=this.add.graphics();c.add(g);
    g.fillStyle(0x000000,.35);g.fillEllipse(5,8,w*.75,h*.82);
    g.fillStyle(0xdce5ea,1);g.fillRoundedRect(-w*.32,-h*.44,w*.64,h*.88,w*.20);
    g.fillStyle(0x86959d,1);g.fillRoundedRect(-w*.25,-h*.25,w*.5,h*.48,w*.13);
    g.fillStyle(0x17242a,1);g.fillRoundedRect(-w*.21,-h*.18,w*.42,h*.30,w*.08);
    g.fillStyle(0xf0c72b,1);g.fillRect(-4,-h*.41,8,h*.82);
    g.fillStyle(0x252c31,1);g.fillRoundedRect(-w*.39,-h*.29,w*.11,h*.25,5);g.fillRoundedRect(w*.28,-h*.29,w*.11,h*.25,5);g.fillRoundedRect(-w*.39,h*.05,w*.11,h*.25,5);g.fillRoundedRect(w*.28,h*.05,w*.11,h*.25,5);
    g.fillStyle(0xffffff,.9);g.fillRect(-w*.24,-h*.40,w*.13,5);g.fillRect(w*.11,-h*.40,w*.13,5);
  }

  _beginInventoryDrag(id,p){
    if(this.drag||qty(this.state,id)<=this._reservedCount(id))return;
    const item=GARAGE_ITEMS[id];if(!item)return;
    const visual=this._makeGhost(item,p.x,p.y);this.drag={type:'inventory',id,visual,x:p.x,y:p.y};
  }

  _beginTokenDrag(uid,p){
    if(this.drag)return;const t=this.boardTokens.find(x=>x.uid===uid),v=this.tokenViews.get(uid);if(!t||!v)return;
    v.setDepth(1200).setScale(1.08);this.drag={type:'token',id:t.id,uid,visual:v,offsetX:p.x-v.x,offsetY:p.y-v.y,x:p.x,y:p.y};
  }

  _makeGhost(item,x,y){
    const c=this.add.container(x,y).setDepth(2000).setAlpha(.94);const g=this.add.graphics();c.add(g);g.fillStyle(0x081219,.97);g.fillCircle(0,0,43);g.lineStyle(3,item.tone||0x62d8ff,.95);g.strokeCircle(0,0,43);const art=this.add.container(0,0);c.add(art);this._drawItemArt(art,item,58);return c;
  }

  _pointerMove(p){
    if(!this.drag)return;this.drag.x=p.x;this.drag.y=p.y;
    const v=this.drag.visual;if(!v)return;
    if(this.drag.type==='token'){v.x=p.x-(this.drag.offsetX||0);v.y=p.y-(this.drag.offsetY||0);}else{v.x=p.x;v.y=p.y;}
  }

  _pointerUp(p){
    if(!this.drag)return;const d=this.drag;this.drag=null;
    if(d.type==='inventory')this._dropInventory(d,p);else this._dropToken(d,p);
  }

  _dropInventory(d,p){
    this._destroyDragVisual(d.visual);
    const item=GARAGE_ITEMS[d.id];if(!item)return;
    if(item.kind==='part'){
      const z=this.mountZones[item.family];
      if(inside(p,z)&&equip(this.state,d.id,this.carId)){this.state=loadGarage();this._toast(`${item.name} montada`);this.render();return;}
    }
    if(!inside(p,this.boardRect))return;
    if(qty(this.state,d.id)<=this._reservedCount(d.id)){this._toast('No te quedan más unidades libres');return;}
    this.boardTokens.push({uid:this.uid++,id:d.id,x:clamp(p.x,this.boardRect.x+50,this.boardRect.x+this.boardRect.w-50),y:clamp(p.y,this.boardRect.y+72,this.boardRect.y+this.boardRect.h-50)});
    this.render();
  }

  _dropToken(d,p){
    const t=this.boardTokens.find(x=>x.uid===d.uid);if(!t){this.render();return;}
    const item=GARAGE_ITEMS[t.id];
    if(item?.kind==='part'&&inside(p,this.mountZones[item.family])){
      if(equip(this.state,t.id,this.carId)){this.state=loadGarage();this.boardTokens=this.boardTokens.filter(x=>x.uid!==t.uid);this._toast(`${item.name} montada en ${FAMILY_LABEL[item.family]}`);this.render();return;}
    }
    if(!inside(p,this.boardRect)){
      this.boardTokens=this.boardTokens.filter(x=>x.uid!==t.uid);this.render();return;
    }
    t.x=clamp(p.x,this.boardRect.x+50,this.boardRect.x+this.boardRect.w-50);t.y=clamp(p.y,this.boardRect.y+72,this.boardRect.y+this.boardRect.h-50);
    const other=this.boardTokens.filter(x=>x.uid!==t.uid).sort((a,b)=>dist(t,a)-dist(t,b))[0];
    if(other&&dist(t,other)<82){
      const recipe=findRecipe(t.id,other.id);
      if(recipe){
        const mx=(t.x+other.x)/2,my=(t.y+other.y)/2,res=craft(this.state,t.id,other.id);
        if(res.ok){
          this.state=loadGarage();this.boardTokens=this.boardTokens.filter(x=>x.uid!==t.uid&&x.uid!==other.uid);
          this.boardTokens.push({uid:this.uid++,id:res.item.id,x:mx,y:my});this._pruneReservations();this._toast(`¡FUSIÓN!  ${res.item.name}`);this._flashFusion(mx,my,res.item.tone||0xffce58);this.render();return;
        }
        this._toast(res.reason||'No puedes fusionarlos ahora');
      }else this._toast('No reaccionan entre sí');
    }
    this.render();
  }

  _reservedCount(id){return this.boardTokens.filter(t=>t.id===id).length;}
  _pruneReservations(){
    const used={};this.boardTokens=this.boardTokens.filter(t=>{used[t.id]=(used[t.id]||0)+1;return used[t.id]<=qty(this.state,t.id);});
  }
  _destroyDragVisual(v=this.drag?.visual){if(v&&v.scene)v.destroy(true);}

  _flashFusion(x,y,color){
    const g=this.add.graphics().setDepth(3000);g.lineStyle(5,color,.9);g.strokeCircle(x,y,28);g.lineStyle(2,0xffffff,.8);g.strokeCircle(x,y,44);
    this.tweens.add({targets:g,alpha:0,scaleX:2.4,scaleY:2.4,duration:320,onComplete:()=>g.destroy()});
  }

  async _doubleReward(){
    const ok=await showRewardedAd(this,{title:'DUPLICAR BOTÍN'});if(!ok)return;
    const r=duplicateLastReward();this.state=loadGarage();this._toast(r?'Botín duplicado':'Ya reclamado');this.render();
  }

  _toast(msg){
    const {width,height}=this.scale;const t=this.add.text(width/2,height-30,msg,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'900',color:'#fff',backgroundColor:'#123129',padding:{x:15,y:8}}).setOrigin(.5).setDepth(5000);
    this.tweens.add({targets:t,alpha:0,y:t.y-8,delay:900,duration:350,onComplete:()=>t.destroy()});
  }

  _drawItemArtAt(add,item,x,y,size){const c=add(this.add.container(x,y));this._drawItemArt(c,item,size);return c;}
  _drawItemArt(c,item,size){
    const g=this.add.graphics();c.add(g);const s=size/64,id=item.id||'',fam=item.family,tone=item.tone||0x8ab7c8,metal=0xaebac4;
    const rr=(x,y,w,h,r,col,a=1)=>{g.fillStyle(col,a);g.fillRoundedRect(x*s,y*s,w*s,h*s,r*s);};const line=(w,col,a=1)=>g.lineStyle(w*s,col,a);
    g.fillStyle(0x000000,.25);g.fillEllipse(2*s,17*s,50*s,13*s);
    if(id==='scrap'){rr(-23,-8,22,9,3,0x87949c);rr(-16,-14,9,20,3,0xb6c0c6);rr(1,-14,25,9,3,0x697880);rr(10,-19,8,18,2,0xaab5bb);rr(-9,7,31,8,3,0x69757d);g.fillStyle(0x20282d);g.fillCircle(20*s,8*s,5*s);g.fillStyle(0xb2bcc2);g.fillCircle(20*s,8*s,2*s);}
    else if(id==='alloy'){line(2,0xe4f7ff,.9);g.fillStyle(0x9eb8c8);g.beginPath();g.moveTo(-23*s,-12*s);g.lineTo(9*s,-20*s);g.lineTo(24*s,-7*s);g.lineTo(18*s,15*s);g.lineTo(-16*s,18*s);g.lineTo(-25*s,4*s);g.closePath();g.fillPath();g.strokePath();g.fillStyle(0xe9fbff,.52);g.fillTriangle(-16*s,-9*s,8*s,-15*s,-6*s,1*s);}
    else if(id==='rubber'||fam==='tires'){g.fillStyle(0x0e1114);g.fillCircle(0,0,25*s);g.fillStyle(0x343c42);g.fillCircle(0,0,16*s);g.fillStyle(fam==='tires'?0xaeb9c0:0x111519);g.fillCircle(0,0,9*s);line(2,fam==='tires'?tone:0x69747b,.75);g.strokeCircle(0,0,20*s);}
    else if(id==='compound'){rr(-23,-15,46,30,8,0xd78127);rr(-19,-11,38,22,6,0xf2ae41);g.fillStyle(0xffe2a1,.65);g.fillEllipse(-7*s,-5*s,16*s,7*s);g.fillStyle(0x6b4318,.32);for(const [x,y] of [[-10,5],[5,8],[12,-2],[-16,-4]])g.fillCircle(x*s,y*s,2*s);}
    else if(id==='disc'){g.fillStyle(metal);g.fillCircle(0,0,25*s);g.fillStyle(0x5c6870);g.fillCircle(0,0,16*s);g.fillStyle(0xd9e1e5);g.fillCircle(0,0,8*s);g.fillStyle(0x151a1d);g.fillCircle(0,0,4*s);g.fillStyle(0x354149);for(let a=0;a<Math.PI*2;a+=Math.PI/5)g.fillCircle(Math.cos(a)*12*s,Math.sin(a)*12*s,2*s);}
    else if(id==='spring'||fam==='suspension'){if(fam==='suspension')rr(-7,-26,14,52,5,0x596875);line(fam==='suspension'?5:4,fam==='suspension'?tone:0x72dbff,1);g.beginPath();g.moveTo(-20*s,-17*s);for(let i=0;i<=8;i++)g.lineTo((i%2?18:-18)*s,(-17+i*4.5)*s);g.strokePath();if(fam==='suspension')rr(-18,22,36,7,3,0xc2cbd0);}
    else if(id==='gear'||fam==='transmission'){if(fam==='transmission'){rr(-25,-18,50,36,8,0x75858f);g.fillStyle(0xaab7bf);g.fillCircle(-10*s,0,11*s);g.fillCircle(10*s,0,11*s);g.fillStyle(0x303940);g.fillCircle(-10*s,0,5*s);g.fillCircle(10*s,0,5*s);line(3,tone,.9);g.lineBetween(-10*s,0,10*s,0);}else{g.fillStyle(0xcbb46b);for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*22*s,y=Math.sin(a)*22*s;g.fillRect(x-4*s,y-4*s,8*s,8*s);}g.fillCircle(0,0,20*s);g.fillStyle(0x5f5a42);g.fillCircle(0,0,9*s);g.fillStyle(0x151a1d);g.fillCircle(0,0,4*s);}}
    else if(id==='ecu'){rr(-25,-17,50,34,5,0x174f42);rr(-21,-13,42,26,4,0x203b35);g.fillStyle(0x57e5af);for(let i=-14;i<=14;i+=7){g.fillRect(i*s,-8*s,4*s,4*s);g.fillRect(i*s,4*s,4*s);}g.fillStyle(0xd6c66d);for(let i=-22;i<=22;i+=8)g.fillRect(i*s,17*s,4*s,5*s);}
    else if(id==='brake_pad'){rr(-23,-15,46,30,7,0xd96049);rr(-17,-10,34,20,5,0x3f4549);g.fillStyle(0xf58b61);g.fillRect(-15*s,-7*s,30*s,14*s);g.fillStyle(0x1d2225,.6);g.fillRect(-2*s,-7*s,4*s,14*s);}
    else if(id==='engine_block'||fam==='engine'){rr(-27,-19,54,38,7,0x697b87);rr(-20,-12,40,24,5,0x95a6b0);g.fillStyle(0x262f34);for(let x=-12;x<=12;x+=12)g.fillCircle(x*s,-3*s,5*s);if(fam==='engine')rr(-24,12,48,8,3,tone);}
    else if(fam==='brakes'){g.fillStyle(0xb9c3c9);g.fillCircle(-4*s,0,24*s);g.fillStyle(0x465159);g.fillCircle(-4*s,0,16*s);g.fillStyle(0x111619);g.fillCircle(-4*s,0,6*s);rr(7,-16,18,31,6,tone);}
    else{g.fillStyle(tone);g.fillCircle(0,0,20*s);g.fillStyle(0xffffff,.45);g.fillCircle(-6*s,-6*s,7*s);}
  }
}

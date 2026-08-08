import Phaser from 'phaser';
import { UpgradeShopScene as CrafterraWorkshopV2 } from './UpgradeWorkshopCrafterraV2Scene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, qty, getEquippedForCar } from '../garage/garageStore.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSPENSIÓN',transmission:'CAJA'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function score(v,min,max){return clamp(Math.round(((v-min)/(max-min))*100),1,99);}

export class UpgradeShopScene extends CrafterraWorkshopV2{
  render(){
    const {width:w,height:h}=this.scale;
    if(this.ui)this.ui.destroy(true);
    this.ui=this.add.container();this.views.clear();this.mount={};
    const A=o=>{this.ui.add(o);return o;};
    const compact=h<560;
    this._drawGarage(A,w,h);

    const topH=compact?58:72;
    const bottomH=compact?82:132;
    const pad=compact?10:16;
    const gap=compact?8:12;
    const bodyTop=topH+4;
    const bodyBottom=h-bottomH-8;
    const bodyH=bodyBottom-bodyTop;
    const leftW=Math.round(w*.245);
    const rightW=Math.round(w*.285);
    const centerX=pad+leftW+gap;
    const rightX=w-pad-rightW;
    const centerW=rightX-gap-centerX;

    this._topBar(A,w,topH,compact);
    this._inventoryPanel(A,{x:pad,y:bodyTop,w:leftW,h:bodyH},compact);
    this._fusionPanel(A,{x:centerX,y:bodyTop,w:centerW,h:bodyH},compact);
    this._carPanel(A,{x:rightX,y:bodyTop,w:rightW,h:bodyH},compact);
    this._recipeStrip(A,{x:pad,y:h-bottomH+2,w:w-pad*2,h:bottomH-10},compact);
    this._tokens(A);
  }

  _drawGarage(A,w,h){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x050607,0x101216,0x090b0d,0x1b120b,1);g.fillRect(0,0,w,h);
    g.fillStyle(0x0e171b,.92);g.fillRect(0,0,w,h);
    // soft garage bays
    for(let i=0;i<7;i++){
      const x=(i/6)*w;
      g.fillStyle(i%2?0x1a1d1d:0x0b0e10,.32);g.fillRect(x-70,64,140,h-64);
      g.lineStyle(2,0x3a4547,.13);g.lineBetween(x,70,x,h);
    }
    // warm lamps and cyan work lights
    g.fillStyle(0xffa928,.12);g.fillEllipse(w*.66,h*.29,w*.24,h*.30);
    g.fillStyle(0x28bfff,.10);g.fillEllipse(w*.36,h*.28,w*.18,h*.32);
    g.fillStyle(0x000000,.34);g.fillRect(0,0,w,h);
    // floor/workshop perspective lines
    g.lineStyle(1,0xffffff,.025);for(let y=h*.52;y<h;y+=42)g.lineBetween(0,y,w,y);
  }

  _topBar(A,w,h,compact){
    const g=A(this.add.graphics());
    g.fillStyle(0x05080a,.98);g.fillRect(0,0,w,h);g.lineStyle(2,0x28353b,.7);g.lineBetween(0,h-1,w,h-1);
    const fs=compact?19:30;
    A(this.add.text(18,compact?9:12,'TDR',{fontFamily:'Orbitron,system-ui',fontSize:`${fs}px`,fontStyle:'900 italic',color:'#f6f7f8'}));
    A(this.add.text(compact?64:90,compact?15:24,'WORKSHOP',{fontFamily:'system-ui',fontSize:compact?'12px':'15px',fontStyle:'900 italic',color:'#ff4338'}));
    const steps=['CONSIGUE','FUSIONA','GUARDA','EQUIPA'];
    const sx=compact?145:235, sw=compact?96:126, sy=compact?8:12, sh=compact?38:46;
    steps.forEach((s,i)=>{
      const active=i===1;const x=sx+i*(sw+5);const q=A(this.add.graphics());
      q.fillStyle(active?0x241c08:0x0b1115,.98);q.fillRoundedRect(x,sy,sw,sh,8);q.lineStyle(1,active?0xffc52f:0x304049,.9);q.strokeRoundedRect(x,sy,sw,sh,8);
      A(this.add.text(x+12,sy+sh/2,`${i+1}`,{fontFamily:'Orbitron,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:active?'#ffd74f':'#63727a'}).setOrigin(0,.5));
      A(this.add.text(x+29,sy+sh/2,s,{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:active?'#ffd44a':'#96a0a4'}).setOrigin(0,.5));
    });
    const coinW=compact?90:122, bx=w-coinW-102;
    const cg=A(this.add.graphics());cg.fillStyle(0x0b1013,.98);cg.fillRoundedRect(bx,sy,coinW,sh,9);cg.lineStyle(1,0xd7a929,.8);cg.strokeRoundedRect(bx,sy,coinW,sh,9);cg.fillStyle(0xf7bf1e);cg.fillCircle(bx+18,sy+sh/2,8);
    A(this.add.text(bx+34,sy+sh/2,'12.450',{fontFamily:'Orbitron,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(0,.5));
    const back=A(this.add.text(w-16,sy+sh/2,'←  GARAGE',{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#eef3f5',backgroundColor:'#11191e',padding:{x:10,y:8}}).setOrigin(1,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>this.scene.start('menu'));
  }

  _chromePanel(A,r,title,accent=0x46d9ff){
    const g=A(this.add.graphics());
    g.fillStyle(0x071014,.97);g.fillRoundedRect(r.x,r.y,r.w,r.h,12);
    g.lineStyle(1,0x8ba0aa,.45);g.strokeRoundedRect(r.x,r.y,r.w,r.h,12);
    g.lineStyle(2,accent,.28);g.lineBetween(r.x+10,r.y+42,r.x+r.w-10,r.y+42);
    g.fillStyle(0xffffff,.025);g.fillRoundedRect(r.x+2,r.y+2,r.w-4,40,10);
    A(this.add.text(r.x+14,r.y+13,title,{fontFamily:'system-ui',fontSize:'13px',fontStyle:'900',color:'#f6fbfd'}));
  }

  _inventoryPanel(A,r,compact){
    this._chromePanel(A,r,'▣  MOCHILA',0x45d9ff);
    const tabY=r.y+48, chipW=(r.w-34)/6;
    ['TODOS','◈','◉','⌁','◇','▣'].forEach((s,i)=>{
      const x=r.x+10+i*chipW;const active=i===0;
      const g=A(this.add.graphics());g.fillStyle(active?0x0c2731:0x0a1115,.96);g.fillRoundedRect(x,tabY,chipW-4,26,6);g.lineStyle(1,active?0x42d7ff:0x31424a,.8);g.strokeRoundedRect(x,tabY,chipW-4,26,6);
      A(this.add.text(x+(chipW-4)/2,tabY+13,s,{fontFamily:'system-ui',fontSize:active?'7px':'10px',fontStyle:'900',color:active?'#6ee8ff':'#aab5b9'}).setOrigin(.5));
    });
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0).filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind!=='part');
    const cols=3,gap=5, gx=r.x+10, gy=tabY+34, gw=r.w-20, cw=(gw-gap*2)/3;
    const rows=compact?2:3, ch=(r.h-(gy-r.y)-18-gap*(rows-1))/rows;
    ids.slice(0,rows*cols).forEach((id,i)=>this._arcadeCard(A,id,gx+(i%3)*(cw+gap),gy+Math.floor(i/3)*(ch+gap),cw,ch));
  }

  _arcadeCard(A,id,x,y,w,h){
    const item=GARAGE_ITEMS[id];const c=A(this.add.container(x,y));const g=this.add.graphics();c.add(g);const tone=item.tone||0x38d8ff;
    g.fillStyle(0x071116,.98);g.fillRoundedRect(0,0,w,h,8);g.lineStyle(1,tone,.7);g.strokeRoundedRect(0,0,w,h,8);
    g.fillGradientStyle(0x0d2028,0x081015,0x0a171c,0x05090c,.9);g.fillRoundedRect(4,4,w-8,h-8,6);
    g.fillStyle(tone,.10);g.fillEllipse(w/2,h*.36,w*.75,h*.44);
    this._art(c,item,w/2,h*.38,Math.min(56,w*.60,h*.48));
    c.add(this.add.text(w-7,6,`×${qty(this.state,id)}`,{fontFamily:'Orbitron,system-ui',fontSize:'8px',fontStyle:'900',color:'#ffd84a'}).setOrigin(1,0));
    c.add(this.add.text(w/2,h-15,item.name.toUpperCase(),{fontFamily:'system-ui',fontSize:'7px',fontStyle:'900',color:'#f5f7f8',align:'center',wordWrap:{width:w-10}}).setOrigin(.5));
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(0,0,w,h),Phaser.Geom.Rectangle.Contains,{useHandCursor:true});
    c.on('pointerdown',p=>this._startInventory(id,p));
  }

  _fusionPanel(A,r,compact){
    this._chromePanel(A,r,'MESA DE FUSIÓN',0x3ad6ff);
    A(this.add.text(r.x+18,r.y+47,'Arrastra un material sobre otro compatible para fusionarlos.',{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'700',color:'#c2c9cd'}));
    // workshop table
    const table={x:r.x+16,y:r.y+(compact?78:86),w:r.w-32,h:r.h-(compact?92:100)};this.board={x:table.x+10,y:table.y+10,w:table.w-20,h:table.h-20};
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x2d2118,0x161516,0x342417,0x171211,1);g.fillRoundedRect(table.x,table.y,table.w,table.h,18);
    g.lineStyle(4,0x704e29,.8);g.strokeRoundedRect(table.x,table.y,table.w,table.h,18);
    g.lineStyle(1,0xb08046,.22);g.strokeRoundedRect(table.x+9,table.y+9,table.w-18,table.h-18,14);
    // scratches and rivets
    for(let i=0;i<20;i++){
      const x=table.x+28+(i*47)%Math.max(60,table.w-56), y=table.y+46+(i*31)%Math.max(60,table.h-70);
      g.lineStyle(1,i%3===0?0xd6aa68:0x0b0908,.18);g.lineBetween(x,y,x+18+(i%4)*8,y-5+(i%5)*3);
    }
    [[18,18],[table.w-18,18],[18,table.h-18],[table.w-18,table.h-18]].forEach(([dx,dy])=>{g.fillStyle(0x5d4b36);g.fillCircle(table.x+dx,table.y+dy,5);g.fillStyle(0x191612);g.fillCircle(table.x+dx,table.y+dy,2);});
    A(this.add.text(table.x+table.w/2,table.y+table.h-24,'TDR',{fontFamily:'Orbitron,system-ui',fontSize:compact?'22px':'34px',fontStyle:'900 italic',color:'#d8c0a0',alpha:.45}).setOrigin(.5));
    // result preview
    const pw=Math.min(250,r.w*.36),ph=compact?54:74,px=r.x+r.w/2-pw/2,py=r.y+(compact?68:74);
    const pg=A(this.add.graphics());pg.fillStyle(0x061017,.92);pg.fillRoundedRect(px,py,pw,ph,10);pg.lineStyle(2,0x3cd9ff,.75);pg.strokeRoundedRect(px,py,pw,ph,10);
    A(this.add.text(px+pw/2,py+10,'RESULTADO POSIBLE',{fontFamily:'system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:'#ffd84d'}).setOrigin(.5,0));
    A(this.add.text(px+pw/2,py+ph-18,'ARRASTRA PARA DESCUBRIR',{fontFamily:'Orbitron,system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:'#d9e7ec'}).setOrigin(.5));
  }

  _tokens(A){
    for(const t of this.tokens){
      const item=GARAGE_ITEMS[t.id];if(!item)continue;
      const c=A(this.add.container(t.x,t.y).setDepth(100)),g=this.add.graphics();c.add(g);const hi=this.hoverUid===t.uid,tone=item.tone||0x5fd9ff;
      g.fillStyle(0x000000,.30);g.fillEllipse(5,16,90,32);
      g.fillStyle(hi?0x182c25:0x091217,.96);g.fillCircle(0,0,hi?49:45);g.lineStyle(hi?5:3,hi?0xffc83d:tone,hi?1:.88);g.strokeCircle(0,0,hi?49:45);
      g.lineStyle(2,hi?0x42e4ff:tone,.22);g.strokeCircle(0,0,hi?58:52);
      this._art(c,item,0,-3,66);
      c.add(this.add.text(0,38,item.name,{fontFamily:'system-ui',fontSize:'7px',fontStyle:'900',color:'#fff',backgroundColor:'#071116',padding:{x:5,y:2}}).setOrigin(.5));
      c.setSize(104,104).setInteractive(new Phaser.Geom.Circle(52,52,52),Phaser.Geom.Circle.Contains,{useHandCursor:true});
      c.on('pointerdown',p=>this._startToken(t.uid,p));this.views.set(t.uid,c);
    }
  }

  _carPanel(A,r,compact){
    this._chromePanel(A,r,'COCHE ACTUAL',0xffc93c);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    A(this.add.text(r.x+15,r.y+43,spec.name.toUpperCase(),{fontFamily:'Orbitron,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#35c9ff'}));
    this._drawArcadeCar(A,r.x+r.w/2,r.y+(compact?104:130),r.w*.50,compact?72:92);
    const s=[
      ['PUNTA',score(spec.maxFwd,420,700),0x39d8ff],
      ['ACELERACIÓN',score(spec.accel,450,900),0x2de4c4],
      ['FRENO',score(spec.brakeForce,800,1250),0x55df76],
      ['GIRO',score(spec.turnRate,2.4,4.5),0xffd33c],
      ['GRIP',score(1-spec.gripDrive,.75,.98),0xbe58ff]
    ];
    const sy=r.y+(compact?144:184),row=compact?22:26;
    s.forEach((q,i)=>{
      const y=sy+i*row;A(this.add.text(r.x+15,y,q[0],{fontFamily:'system-ui',fontSize:compact?'7px':'8px',fontStyle:'900',color:'#eef4f6'}));
      const bw=r.w-86;const g=A(this.add.graphics());g.fillStyle(0x172026);g.fillRect(r.x+15,y+12,bw,4);g.fillStyle(q[2]);g.fillRect(r.x+15,y+12,bw*q[1]/100,4);
      A(this.add.text(r.x+r.w-12,y,q[1],{fontFamily:'Orbitron,system-ui',fontSize:compact?'8px':'9px',fontStyle:'900',color:'#fff'}).setOrigin(1,0));
    });
    const eq=getEquippedForCar(this.state,this.car);const startY=sy+s.length*row+(compact?4:10);const gap=4;const cw=(r.w-28-gap*4)/5;
    A(this.add.text(r.x+15,startY,'COMPONENTES EQUIPADOS',{fontFamily:'system-ui',fontSize:compact?'6px':'7px',fontStyle:'900',color:'#ffd34a'}));
    FAMILIES.forEach((f,i)=>{
      const x=r.x+14+i*(cw+gap),y=startY+(compact?16:20),id=eq?.[f],item=id?GARAGE_ITEMS[id]:null,h=compact?54:74;
      const g=A(this.add.graphics());g.fillStyle(0x071116,.98);g.fillRoundedRect(x,y,cw,h,6);g.lineStyle(1,item?0x43df9c:0x33484f,.8);g.strokeRoundedRect(x,y,cw,h,6);
      A(this.add.text(x+cw/2,y+8,LABEL[f],{fontFamily:'system-ui',fontSize:compact?'5px':'6px',fontStyle:'900',color:'#c7d0d3'}).setOrigin(.5,0));
      if(item){this._art(A(this.add.container()),item,x+cw/2,y+h*.49,Math.min(28,cw*.58));A(this.add.text(x+cw/2,y+h-10,`T${item.tier||1}`,{fontFamily:'Orbitron,system-ui',fontSize:'6px',fontStyle:'900',color:'#58ef9d'}).setOrigin(.5));}
      else A(this.add.text(x+cw/2,y+h*.55,'+', {fontFamily:'Orbitron,system-ui',fontSize:'12px',fontStyle:'900',color:'#3b535d'}).setOrigin(.5));
      this.mount[f]={x,y,w:cw,h};
    });
  }

  _drawArcadeCar(A,cx,cy,w,h){
    const c=A(this.add.container(cx,cy));const g=this.add.graphics();c.add(g);
    g.fillStyle(0x000000,.45);g.fillEllipse(8,10,w*.92,h*.66);
    g.fillStyle(0x8c110c);g.fillRoundedRect(-w*.46,-h*.30,w*.92,h*.60,Math.max(8,h*.18));
    g.fillStyle(0xe3291d);g.fillRoundedRect(-w*.39,-h*.34,w*.78,h*.68,Math.max(8,h*.18));
    g.fillStyle(0x171d22);g.fillRoundedRect(-w*.15,-h*.25,w*.32,h*.50,Math.max(5,h*.10));
    g.fillStyle(0xffffff,.92);g.fillRect(-w*.09,-h*.33,w*.07,h*.66);g.fillRect(w*.03,-h*.33,w*.07,h*.66);
    g.fillStyle(0x0a0d0f);g.fillRoundedRect(-w*.50,-h*.31,w*.10,h*.20,4);g.fillRoundedRect(w*.40,-h*.31,w*.10,h*.20,4);g.fillRoundedRect(-w*.50,h*.11,w*.10,h*.20,4);g.fillRoundedRect(w*.40,h*.11,w*.10,h*.20,4);
    g.fillStyle(0xfff0c2);g.fillCircle(-w*.34,-h*.27,3);g.fillCircle(w*.34,-h*.27,3);
  }

  _recipeStrip(A,r,compact){
    const g=A(this.add.graphics());g.fillStyle(0x071014,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,0x4dcdf5,.42);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);
    A(this.add.text(r.x+14,r.y+8,'⚗  RECETAS DESTACADAS',{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#ffd349'}));
    const cards=[['scrap','alloy','BLOQUE PREPARADO'],['disc','compound','FRENADA'],['rubber','compound','NEUMÁTICO'],['spring','alloy','SUSPENSIÓN'],['gear','alloy','TRANSMISIÓN']];
    const y=r.y+(compact?24:30),gap=7,cw=(r.w-gap*6)/5;
    cards.forEach((rec,i)=>{
      const x=r.x+gap+i*(cw+gap),h=r.h-(compact?30:38);const gg=A(this.add.graphics());gg.fillStyle(0x0a1419,.98);gg.fillRoundedRect(x,y,cw,h,7);gg.lineStyle(1,0x344b55,.8);gg.strokeRoundedRect(x,y,cw,h,7);
      A(this.add.text(x+cw/2,y+6,rec[2],{fontFamily:'system-ui',fontSize:compact?'5px':'6px',fontStyle:'900',color:'#eef4f6'}).setOrigin(.5,0));
      const a=GARAGE_ITEMS[rec[0]],b=GARAGE_ITEMS[rec[1]];if(a)this._art(A(this.add.container()),a,x+cw*.30,y+h*.55,Math.min(30,cw*.24));if(b)this._art(A(this.add.container()),b,x+cw*.70,y+h*.55,Math.min(30,cw*.24));
      A(this.add.text(x+cw/2,y+h*.55,'+',{fontFamily:'Orbitron,system-ui',fontSize:compact?'10px':'13px',fontStyle:'900',color:'#43dcff'}).setOrigin(.5));
    });
  }

  _ghost(item,x,y){
    const c=this.add.container(x,y).setDepth(3000),g=this.add.graphics();c.add(g);
    g.fillStyle(0x000000,.32);g.fillEllipse(4,16,96,32);g.fillStyle(0x091217,.96);g.fillCircle(0,0,49);g.lineStyle(4,item.tone||0x55d6ff,.98);g.strokeCircle(0,0,49);g.lineStyle(2,0xffc638,.35);g.strokeCircle(0,0,58);this._art(c,item,0,0,70);return c;
  }
}

import Phaser from 'phaser';
import { UpgradeShopScene as ArcadeWorkshop } from './UpgradeWorkshopArcadeScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { qty, getEquippedForCar } from '../garage/garageStore.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class UpgradeShopScene extends ArcadeWorkshop{
  render(){
    const {width:w,height:h}=this.scale;
    if(this.ui)this.ui.destroy(true);
    this.ui=this.add.container();this.views.clear();this.mount={};
    const A=o=>{this.ui.add(o);return o;};
    const compact=h<560;
    this._drawGarageV2(A,w,h);

    const topH=compact?56:68;
    const pad=compact?8:14;
    const gap=compact?8:12;
    const bodyTop=topH+4;
    const bodyH=h-bodyTop-pad;
    const leftW=Math.round(w*.245);
    const rightW=Math.round(w*.285);
    const centerX=pad+leftW+gap;
    const rightX=w-pad-rightW;
    const centerW=rightX-gap-centerX;

    this._topBar(A,w,topH,compact);
    this._backpackInventory(A,{x:pad,y:bodyTop,w:leftW,h:bodyH},compact);
    this._fusionPanel(A,{x:centerX,y:bodyTop,w:centerW,h:bodyH},compact);
    this._carPanel(A,{x:rightX,y:bodyTop,w:rightW,h:bodyH},compact);
    this._tokens(A);
  }

  _drawGarageV2(A,w,h){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x040506,0x11171a,0x090b0c,0x24170d,1);g.fillRect(0,0,w,h);
    g.fillStyle(0x0b1114,.76);g.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){
      const x=i*w/7;g.fillStyle(i%2?0x11191c:0x080b0d,.40);g.fillRect(x-75,58,150,h-58);
      g.lineStyle(2,0x57646a,.10);g.lineBetween(x,60,x,h);
    }
    g.fillStyle(0xffa82c,.15);g.fillEllipse(w*.64,h*.30,w*.31,h*.46);
    g.fillStyle(0x24bfff,.11);g.fillEllipse(w*.35,h*.25,w*.24,h*.40);
    g.fillStyle(0x000000,.30);g.fillRect(0,0,w,h);
    g.lineStyle(1,0xffffff,.025);for(let y=h*.56;y<h;y+=38)g.lineBetween(0,y,w,y);
  }

  _backpackInventory(A,r,compact){
    // backpack silhouette: the inventory is physically a bag, not a dashboard panel.
    const g=A(this.add.graphics());
    const x=r.x,y=r.y,w=r.w,h=r.h;
    g.fillStyle(0x171310,.96);g.fillRoundedRect(x+10,y+12,w-20,h-20,28);
    g.lineStyle(3,0x5f4b35,.95);g.strokeRoundedRect(x+10,y+12,w-20,h-20,28);
    // padded shoulder straps and top handle
    g.lineStyle(10,0x2c241c,.95);g.beginPath();g.arc(x+w*.33,y+30,w*.18,Math.PI,Math.PI*2);g.strokePath();
    g.beginPath();g.arc(x+w*.67,y+30,w*.18,Math.PI,Math.PI*2);g.strokePath();
    g.lineStyle(7,0x6b553c,.9);g.strokeRoundedRect(x+w*.40,y+3,w*.20,20,8);
    // top flap
    g.fillStyle(0x2a2118,.98);g.fillRoundedRect(x+18,y+20,w-36,64,18);
    g.lineStyle(2,0xc19043,.75);g.strokeRoundedRect(x+18,y+20,w-36,64,18);
    g.fillStyle(0x0b0d0f,.65);g.fillRoundedRect(x+27,y+32,w-54,36,10);
    A(this.add.text(x+38,y+42,'MOCHILA',{fontFamily:'Orbitron,system-ui',fontSize:compact?'11px':'13px',fontStyle:'900',color:'#fff'}));
    A(this.add.text(x+w-38,y+42,'TDR',{fontFamily:'Orbitron,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900 italic',color:'#f2b83e'}).setOrigin(1,0));

    const tabY=y+90,tabGap=8,tabW=(w-44-tabGap)/2;
    this._bagTab(A,x+18,tabY,tabW,'MATERIALES','materials');
    this._bagTab(A,x+18+tabW+tabGap,tabY,tabW,'PIEZAS','parts');

    // large front pocket where the actual cards live
    const pocketY=tabY+38,pocketH=h-(pocketY-y)-32;
    g.fillStyle(0x201a14,.98);g.fillRoundedRect(x+18,pocketY,w-36,pocketH,20);
    g.lineStyle(2,0x73593a,.9);g.strokeRoundedRect(x+18,pocketY,w-36,pocketH,20);
    g.lineStyle(1,0xcaa164,.22);g.lineBetween(x+28,pocketY+15,x+w-28,pocketY+15);
    // zipper
    g.lineStyle(2,0xb59b75,.42);g.lineBetween(x+32,pocketY+14,x+w-42,pocketY+14);
    for(let zx=x+38;zx<x+w-48;zx+=12){g.fillStyle(0xcab28e,.45);g.fillRect(zx,pocketY+10,5,8);}

    const ids=Object.keys(GARAGE_ITEMS)
      .filter(id=>qty(this.state,id)>0)
      .filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind!=='part');
    const cols=3,gap=5,gx=x+26,gy=pocketY+24,gw=w-52,cw=(gw-gap*2)/3;
    const rows=3,ch=(pocketH-34-gap*(rows-1))/rows;
    if(!ids.length){
      A(this.add.text(x+w/2,pocketY+pocketH/2,this.filter==='parts'?'Aún no has fabricado piezas':'Mochila vacía',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:'#8f7a61'}).setOrigin(.5));
      return;
    }
    ids.slice(0,9).forEach((id,i)=>this._premiumCard(A,id,gx+(i%3)*(cw+gap),gy+Math.floor(i/3)*(ch+gap),cw,ch));
    A(this.add.text(x+w/2,y+h-18,this.filter==='parts'?'ARRASTRA UNA PIEZA AL COCHE':'ARRASTRA UN MATERIAL A LA MESA',{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#d3ad70'}).setOrigin(.5));
  }

  _bagTab(A,x,y,w,label,key){
    const on=this.filter===key;
    const q=A(this.add.graphics());q.fillStyle(on?0x432f13:0x171410,.98);q.fillRoundedRect(x,y,w,30,8);q.lineStyle(1,on?0xffc642:0x5b4a35,.9);q.strokeRoundedRect(x,y,w,30,8);
    const hit=A(this.add.rectangle(x,y,w,30,0x000000,0.001).setOrigin(0).setInteractive({useHandCursor:true}));
    A(this.add.text(x+w/2,y+15,label,{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:on?'#ffd75a':'#a99880'}).setOrigin(.5));
    hit.on('pointerdown',()=>{if(!this.drag){this.filter=key;this.render();}});
  }

  _premiumCard(A,id,x,y,w,h){
    const item=GARAGE_ITEMS[id],tone=item.tone||0x43d9ff;
    const c=A(this.add.container(x,y));const g=this.add.graphics();c.add(g);
    g.fillGradientStyle(0x10181c,0x080b0d,0x0b1215,0x050607,1);g.fillRoundedRect(0,0,w,h,8);
    g.lineStyle(1,tone,.75);g.strokeRoundedRect(0,0,w,h,8);
    g.fillStyle(tone,.09);g.fillEllipse(w*.5,h*.38,w*.82,h*.55);
    // small rarity strip + metallic corner tabs
    g.fillStyle(tone,.70);g.fillRect(0,0,3,h);
    g.fillStyle(0xb6c2c7,.18);g.fillTriangle(w-13,0,w,0,w,13);
    this._art(c,item,w*.5,h*.42,Math.min(w*.72,h*.64,72));
    c.add(this.add.text(w-7,5,`×${qty(this.state,id)}`,{fontFamily:'Orbitron,system-ui',fontSize:'8px',fontStyle:'900',color:'#ffd54c'}).setOrigin(1,0));
    c.add(this.add.text(w*.5,h-11,item.name.toUpperCase(),{fontFamily:'system-ui',fontSize:'6.8px',fontStyle:'900',color:'#f7fafb',align:'center',wordWrap:{width:w-8}}).setOrigin(.5));
    c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(0,0,w,h),Phaser.Geom.Rectangle.Contains,{useHandCursor:true});
    c.on('pointerdown',p=>this._startInventory(id,p));
  }

  // richer semi-realistic arcade item art, still lightweight Phaser vector graphics.
  _art(c,item,x,y,size){
    const g=this.add.graphics();c.add(g);g.x=x;g.y=y;
    const s=size/64,id=item.id||'',fam=item.family,t=item.tone||0x63d9ff;
    const rr=(x,y,w,h,r,col,a=1)=>{g.fillStyle(col,a);g.fillRoundedRect(x*s,y*s,w*s,h*s,r*s);};
    const ln=(w,col,a=1)=>g.lineStyle(w*s,col,a);
    g.fillStyle(0x000000,.34);g.fillEllipse(3*s,20*s,50*s,13*s);

    if(id==='scrap'){
      rr(-23,-7,28,12,3,0x59636a);rr(-13,-17,10,28,3,0xb9c3c8);rr(3,-13,26,11,3,0x7c8a92);rr(7,4,20,8,3,0x424b50);
      g.fillStyle(0x20262a);g.fillCircle(17*s,10*s,7*s);g.fillStyle(0xc8d0d4);g.fillCircle(17*s,10*s,3*s);ln(2,0xe5ecef,.45);g.lineBetween(-8*s,-13*s,-8*s,8*s);
    }else if(id==='alloy'){
      g.fillStyle(0x94aab6);g.beginPath();g.moveTo(-25*s,4*s);g.lineTo(-13*s,-19*s);g.lineTo(17*s,-14*s);g.lineTo(25*s,5*s);g.lineTo(8*s,20*s);g.lineTo(-16*s,16*s);g.closePath();g.fillPath();
      g.fillStyle(0xeaf7fc,.55);g.fillTriangle(-13*s,-16*s,13*s,-11*s,-3*s,2*s);g.fillStyle(0x53636c,.55);g.fillTriangle(-22*s,5*s,-3*s,2*s,7*s,17*s);ln(1,0xffffff,.55);g.strokePath();
    }else if(id==='rubber'||fam==='tires'){
      g.fillStyle(0x0a0d0f);g.fillCircle(0,0,26*s);g.fillStyle(0x2e3438);g.fillCircle(0,0,18*s);
      g.fillStyle(fam==='tires'?0xaeb9bf:0x101315);g.fillCircle(0,0,9*s);ln(2,fam==='tires'?t:0x69757b,.8);g.strokeCircle(0,0,21*s);
      ln(2,0x4a5256,.7);for(let a=0;a<Math.PI*2;a+=Math.PI/7)g.lineBetween(Math.cos(a)*20*s,Math.sin(a)*20*s,Math.cos(a)*25*s,Math.sin(a)*25*s);
    }else if(id==='compound'){
      g.fillStyle(0xc75e20);g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI*.2,r=i%2?20:27,px=Math.cos(a)*r*s,py=Math.sin(a)*r*s;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}g.closePath();g.fillPath();
      g.fillStyle(0xff9b39,.85);g.fillTriangle(-15*s,-8*s,4*s,-20*s,11*s,4*s);g.fillStyle(0xffcb69,.42);g.fillTriangle(-13*s,-8*s,1*s,-16*s,-4*s,-2*s);
    }else if(id==='disc'||fam==='brakes'){
      g.fillStyle(0xaeb9bf);g.fillCircle(-3*s,0,25*s);g.fillStyle(0x4e5960);g.fillCircle(-3*s,0,17*s);g.fillStyle(0x15191c);g.fillCircle(-3*s,0,6*s);
      g.fillStyle(0x293238);for(let a=0;a<Math.PI*2;a+=Math.PI/6)g.fillCircle((-3+Math.cos(a)*12)*s,(Math.sin(a)*12)*s,2*s);
      if(fam==='brakes'){rr(9,-17,18,34,6,t);g.fillStyle(0xffb36b,.40);g.fillRoundedRect(12*s,-12*s,12*s,24*s,4*s);}
    }else if(id==='spring'||fam==='suspension'){
      if(fam==='suspension'){rr(-7,-27,14,54,5,0x4f5d65);rr(-13,-31,26,7,3,0xa8b4ba);rr(-16,23,32,8,3,0xbac4c8);}
      ln(fam==='suspension'?5:4,fam==='suspension'?t:0x9e62ff,1);g.beginPath();g.moveTo(-18*s,-19*s);for(let i=0;i<10;i++)g.lineTo((i%2?18:-18)*s,(-19+i*4.4)*s);g.strokePath();ln(1,0xffffff,.35);g.strokePath();
    }else if(id==='gear'||fam==='transmission'){
      if(fam==='transmission'){rr(-26,-19,52,38,8,0x6c7b84);g.fillStyle(0xa9b5bb);g.fillCircle(-10*s,0,12*s);g.fillCircle(10*s,0,12*s);g.fillStyle(0x2d353a);g.fillCircle(-10*s,0,5*s);g.fillCircle(10*s,0,5*s);ln(3,t,.8);g.lineBetween(-10*s,0,10*s,0);}
      else{g.fillStyle(0xc4a34d);for(let i=0;i<12;i++){const a=i*Math.PI/6;g.fillRect((Math.cos(a)*23-4)*s,(Math.sin(a)*23-4)*s,8*s,8*s);}g.fillCircle(0,0,20*s);g.fillStyle(0x615b42);g.fillCircle(0,0,10*s);g.fillStyle(0x181b1d);g.fillCircle(0,0,4*s);}
    }else if(id==='ecu'){
      rr(-25,-18,50,36,6,0x174b3c);rr(-20,-13,40,26,4,0x20352f);g.fillStyle(0x63e7b4);for(let i=-14;i<=14;i+=7){g.fillRect(i*s,-7*s,4*s,4*s);g.fillRect(i*s,4*s,4*s);}g.fillStyle(0xd8bd4b);for(let i=-22;i<=22;i+=8)g.fillRect(i*s,18*s,4*s,5*s);ln(1,0x73f3c6,.5);g.lineBetween(-17*s,0,17*s,0);
    }else if(fam==='engine'||id==='engine_block'){
      rr(-28,-20,56,40,7,0x667983);rr(-20,-13,40,26,5,0x98a8b0);g.fillStyle(0x263036);for(let px=-12;px<=12;px+=12)g.fillCircle(px*s,-3*s,5*s);rr(-24,13,48,8,3,fam==='engine'?t:0x596971);ln(2,0xeef5f7,.35);g.lineBetween(-17*s,-10*s,17*s,-10*s);
    }else{
      g.fillStyle(t);g.fillCircle(0,0,22*s);g.fillStyle(0xffffff,.38);g.fillCircle(-7*s,-7*s,7*s);
    }
  }
}

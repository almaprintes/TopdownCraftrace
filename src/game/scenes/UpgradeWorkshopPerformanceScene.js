import Phaser from 'phaser';
import { GARAGE_ITEMS, findRecipe } from '../garage/partsCatalog.js';
import { loadGarage, qty, craft, equip, duplicateLastReward, getEquippedForCar, garageTuning } from '../garage/garageStore.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSPENSIÓN',transmission:'CAJA'};

function selectedCarId(){ try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';} }
function legacyUpgradeTuning(carId){
  let u={engine:0,brakes:0,tires:0};
  try{u=JSON.parse(localStorage.getItem(`tdr2:upgrades:${carId}`)||'null')||u;}catch{}
  const e=u.engine||0,b=u.brakes||0,t=u.tires||0;
  return {accelMult:1+e*.08,maxFwdAdd:e*35,brakeMult:1+b*.10,dragMult:1,turnRateMult:1,turnMinAdd:0,maxRevAdd:0,gripDriveAdd:t*.02,gripCoastAdd:t*.01,gripBrakeAdd:t*.015};
}
function combine(a,b){return{
  accelMult:(a.accelMult||1)*(b.accelMult||1), brakeMult:(a.brakeMult||1)*(b.brakeMult||1), dragMult:(a.dragMult||1)*(b.dragMult||1), turnRateMult:(a.turnRateMult||1)*(b.turnRateMult||1),
  maxFwdAdd:(a.maxFwdAdd||0)+(b.maxFwdAdd||0),maxRevAdd:(a.maxRevAdd||0)+(b.maxRevAdd||0),turnMinAdd:(a.turnMinAdd||0)+(b.turnMinAdd||0),
  gripCoastAdd:(a.gripCoastAdd||0)+(b.gripCoastAdd||0),gripDriveAdd:(a.gripDriveAdd||0)+(b.gripDriveAdd||0),gripBrakeAdd:(a.gripBrakeAdd||0)+(b.gripBrakeAdd||0)
};}
function pct(a,b){return a?((b-a)/a)*100:0;}
function fmtDelta(v,digits=1){const n=Number(v)||0;return `${n>=0?'+':''}${n.toFixed(digits)}%`;}
function inside(p,z){return !!z&&p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h;}

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){
    super('upgrade-shop');
    this.state=null;this.selA=null;this.selB=null;this.filter='materials';this.lastCraftedId=null;this.ui=null;this.carId='stock';
    this._dropZones={};this._dragging=false;
  }
  create(){
    this.carId=selectedCarId();this.state=loadGarage();this.cameras.main.setBackgroundColor('#060b0f');
    this._resize=()=>this.render();this.scale.on('resize',this._resize);this.render();
  }
  shutdown(){if(this._resize)this.scale.off('resize',this._resize);}
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
    this.ui=this.add.container(0,0);this._dropZones={};
    const add=o=>{this.ui.add(o);return o;};

    const bg=add(this.add.graphics());
    bg.fillGradientStyle(0x05090d,0x07141b,0x091017,0x101b18,1);bg.fillRect(0,0,width,height);
    bg.fillStyle(0x27f59a,.055);bg.fillEllipse(width*.14,height*.92,width*.65,height*.68);
    bg.fillStyle(0x2aa8ff,.035);bg.fillEllipse(width*.90,height*.05,width*.72,height*.65);
    bg.lineStyle(18,0xffffff,.018);for(let x=-height;x<width+height;x+=150)bg.lineBetween(x,height,x+height,0);
    bg.lineStyle(2,0x56f2aa,.06);for(let yy=0;yy<height;yy+=76)bg.lineBetween(0,yy,width,yy);

    const pad=clamp(width*.022,14,26),header=82;
    add(this.add.text(pad,12,'TDR WORKSHOP',{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.021,22,34)+'px',fontStyle:'900',color:'#f5fbff'}));
    const {spec,base,full}=this._performance();
    add(this.add.text(pad,48,`${spec.name}  ·  ARRASTRA · FUSIONA · MONTA · CORRE`,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'900',color:'#5dffad',letterSpacing:1.25}));
    const back=add(this.add.text(width-pad,20,'← GARAGE',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'900',color:'#e5f3f7'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>this.scene.start('menu'));

    const y=header,h=height-header-pad,leftW=width*.37,midW=width*.285,rightX=pad+leftW+12+midW+12,rightW=width-rightX-pad;
    const panel=(x,w,title,col)=>{
      const g=add(this.add.graphics());g.fillStyle(0x071116,.96);g.fillRoundedRect(x,y,w,h,12);g.lineStyle(1,col,.42);g.strokeRoundedRect(x,y,w,h,12);g.fillStyle(col,.12);g.fillRoundedRect(x+1,y+1,w-2,38,11);
      add(this.add.text(x+14,y+11,title,{fontFamily:'Orbitron,system-ui',fontSize:'11px',fontStyle:'900',color:'#fff'}));
    };
    panel(pad,leftW,'1 · ALMACÉN',0x57efa5);panel(pad+leftW+12,midW,'2 · BANCO DE FUSIÓN',0x4cbcff);panel(rightX,rightW,'3 · MONTAJE',0xffc857);

    const tabY=y+46,tabW=(leftW-36)/2;
    this._tab(add,pad+14,tabY,tabW,'MATERIALES','materials');this._tab(add,pad+22+tabW,tabY,tabW,'PIEZAS','parts');
    add(this.add.text(pad+14,tabY+35,this.filter==='materials'?'ARRASTRA los materiales a A y B':'ARRASTRA cada pieza hasta su hueco del coche',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'800',color:'#7f99a2'}));

    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0).filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind!=='part');
    const cols=3,gap=8,gx=pad+14,gy=tabY+57,gw=leftW-28,cw=(gw-gap*2)/3,ch=104;
    const equipped=getEquippedForCar(this.state,this.carId);
    ids.slice(0,12).forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],q=qty(this.state,id),x=gx+(i%3)*(cw+gap),yy=gy+Math.floor(i/3)*(ch+gap);if(yy+ch>y+h-12)return;
      const eq=item.kind==='part'&&equipped?.[item.family]===id;
      this._inventoryCard(add,{id,item,q,x,y:yy,w:cw,h:ch,eq,just:id===this.lastCraftedId});
    });

    const mx=pad+leftW+12;
    add(this.add.text(mx+14,y+47,'Arrastra dos elementos compatibles.\nToca un slot ocupado para vaciarlo.',{fontFamily:'system-ui',fontSize:'9px',color:'#89a4ad',lineSpacing:4,wordWrap:{width:midW-28}}));
    const sy=y+98,sw=(midW-44)/2;
    this._fusionSlot(add,'A',mx+14,sy,sw,108,this.selA);this._fusionSlot(add,'B',mx+30+sw,sy,sw,108,this.selB);
    add(this.add.text(mx+midW/2,sy+38,'+',{fontFamily:'Orbitron,system-ui',fontSize:'22px',fontStyle:'900',color:'#55c6ff'}).setOrigin(.5));

    const rec=this.selA&&this.selB?findRecipe(this.selA,this.selB):null,out=rec?GARAGE_ITEMS[rec.out]:null;
    const ry=sy+120;const result=add(this.add.graphics());result.fillStyle(out?0x172a20:0x0b151b,.98);result.fillRoundedRect(mx+14,ry,midW-28,54,8);result.lineStyle(1,out?0xffce5b:0x29434f,.7);result.strokeRoundedRect(mx+14,ry,midW-28,54,8);
    if(out){this._drawItemIcon(add,out,mx+42,ry+27,34);add(this.add.text(mx+68,ry+12,'RESULTADO',{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#d9a93f'}));add(this.add.text(mx+68,ry+27,out.name,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'900',color:'#fff',wordWrap:{width:midW-102}}));}
    else add(this.add.text(mx+midW/2,ry+27,'SIN RECETA',{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#4e6872'}).setOrigin(.5));

    const by=ry+65,btn=add(this.add.rectangle(mx+14,by,midW-28,46,out?0x43f18c:0x1d2c33,1).setOrigin(0).setInteractive({useHandCursor:true}));
    add(this.add.text(mx+midW/2,by+23,out?'FUSIONAR':'ARRASTRA DOS MATERIALES',{fontFamily:'Orbitron,system-ui',fontSize:'9.5px',fontStyle:'900',color:out?'#041d12':'#6e858e'}).setOrigin(.5));btn.on('pointerdown',()=>this._craft());
    add(this.add.text(mx+14,by+62,'PISTAS DE TALLER',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#66818b'}));
    add(this.add.text(mx+14,by+79,'Disco + Compuesto → frenada\nGoma + Compuesto → ruedas\nMuelle + Aleación → suspensión\nEngranaje + Aleación → transmisión\nChatarra + Aleación → bloque motor',{fontFamily:'system-ui',fontSize:'8.5px',color:'#b6cbd1',lineSpacing:5,wordWrap:{width:midW-28}}));
    if(this.state.lastReward&&!this.state.lastReward.doubled){const adY=y+h-43,rb=add(this.add.rectangle(mx+14,adY,midW-28,32,0x153329,.96).setOrigin(0).setStrokeStyle(1,0x58e99c,.55).setInteractive({useHandCursor:true}));add(this.add.text(mx+midW/2,adY+16,'▶ DUPLICAR ÚLTIMO BOTÍN',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#caffdf'}).setOrigin(.5));rb.on('pointerdown',()=>this._double());}

    add(this.add.text(rightX+14,y+45,`${spec.brand||''} · ${spec.role||''}`,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'900',color:'#9db1b8'}));
    const perf=[['PUNTA',base.maxFwd,full.maxFwd,'px/s'],['ACEL.',base.accel,full.accel,'px/s²'],['FRENO',base.brakeForce,full.brakeForce,'px/s²'],['GIRO',base.turnRate,full.turnRate,'rad/s'],['GRIP',base.gripDrive,full.gripDrive,'']];
    let py=y+66;perf.forEach(([lab,a,v,unit])=>{const d=pct(a,v);add(this.add.text(rightX+14,py,lab,{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#718991'}));add(this.add.text(rightX+59,py,`${Number(v).toFixed(unit==='rad/s'?2:(unit?0:3))}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#fff'}));add(this.add.text(rightX+rightW-16,py,Math.abs(d)<.01?'—':fmtDelta(d),{fontFamily:'Orbitron,system-ui',fontSize:'8px',fontStyle:'900',color:d>=0?'#57f0a2':'#ff7184'}).setOrigin(1,0));py+=19;});
    add(this.add.text(rightX+14,py+1,'Efecto real de las piezas equipadas',{fontFamily:'system-ui',fontSize:'7.5px',color:'#657b83'}));

    const ly=py+22,lh=54,lg=6;FAMILIES.forEach((f,i)=>{const yy=ly+i*(lh+lg),id=equipped?.[f],item=id?GARAGE_ITEMS[id]:null;this._mountSlot(add,f,rightX+14,yy,rightW-28,lh,item);});
    add(this.add.text(rightX+14,y+h-23,'PIEZAS → arrastra al hueco correcto',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#c5a54b'}));
  }

  _tab(add,x,y,w,label,key){const on=this.filter===key,r=add(this.add.rectangle(x,y,w,30,on?0x1b4936:0x101e23,.98).setOrigin(0).setStrokeStyle(1,on?0x58e99c:0x2b424b,.8).setInteractive({useHandCursor:true}));add(this.add.text(x+w/2,y+15,label,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:on?'#caffdf':'#71868d'}).setOrigin(.5));r.on('pointerdown',()=>{this.filter=key;this.selA=this.selB=null;this.render();});}

  _inventoryCard(add,{id,item,q,x,y,w,h,eq,just}){
    const c=add(this.add.container(x,y));c.setSize(w,h).setInteractive(new Phaser.Geom.Rectangle(0,0,w,h),Phaser.Geom.Rectangle.Contains);
    const g=this.add.graphics();c.add(g);const tone=item.tone||0x66c6ff;
    g.fillStyle(eq?0x173b2c:(just?0x392f18:0x0b171d),.98);g.fillRoundedRect(0,0,w,h,9);g.lineStyle(eq||just?2:1,eq?0x54f0a0:(just?0xffd05d:0x29434d),.92);g.strokeRoundedRect(0,0,w,h,9);g.fillStyle(tone,.14);g.fillRoundedRect(5,5,w-10,44,7);
    const iconHolder=this.add.container(w*.5,27);c.add(iconHolder);this._drawItemIconToContainer(iconHolder,item,Math.min(46,w*.52));
    c.add(this.add.text(w-8,7,`×${q}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#73e9ff'}).setOrigin(1,0));
    c.add(this.add.text(8,57,item.name,{fontFamily:'system-ui',fontSize:'8.4px',fontStyle:'900',color:'#edf7f8',align:'center',wordWrap:{width:w-16}}));
    c.add(this.add.text(w/2,h-12,eq?'MONTADA':'ARRASTRAR',{fontFamily:'system-ui',fontSize:'6.8px',fontStyle:'900',color:eq?'#61f2aa':'#607d87'}).setOrigin(.5));
    c.setData('itemId',id);c.setData('source','inventory');this.input.setDraggable(c);
    c.on('dragstart',()=>{this._dragging=true;c.setDepth(900).setScale(1.06).setAlpha(.92);});c.on('drag',(p,dx,dy)=>{c.x=dx;c.y=dy;});c.on('dragend',p=>this._handleDrop(id,'inventory',p));
  }

  _fusionSlot(add,key,x,y,w,h,id){
    const item=id?GARAGE_ITEMS[id]:null,g=add(this.add.graphics());g.fillStyle(item?0x10232b:0x071116,1);g.fillRoundedRect(x,y,w,h,10);g.lineStyle(2,item?0x59caff:0x29454f,.9);g.strokeRoundedRect(x,y,w,h,10);this._dropZones[key]={x,y,w,h};
    if(item){this._drawItemIcon(add,item,x+w/2,y+36,48);add(this.add.text(x+w/2,y+70,item.name,{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#e7f4f7',align:'center',wordWrap:{width:w-14}}).setOrigin(.5,0));add(this.add.text(x+w/2,y+h-10,'TOCA PARA QUITAR',{fontFamily:'system-ui',fontSize:'6.5px',fontStyle:'900',color:'#6d8a94'}).setOrigin(.5));}
    else{add(this.add.text(x+w/2,y+31,key,{fontFamily:'Orbitron,system-ui',fontSize:'24px',fontStyle:'900',color:'#35525d'}).setOrigin(.5));add(this.add.text(x+w/2,y+68,'SUELTA AQUÍ',{fontFamily:'system-ui',fontSize:'7px',fontStyle:'900',color:'#4e6c76'}).setOrigin(.5));}
    const hit=add(this.add.zone(x,y,w,h).setOrigin(0).setInteractive({useHandCursor:true}));
    hit.on('pointerdown',()=>{if(this._dragging)return;if(key==='A')this.selA=null;else this.selB=null;this.render();});
    if(item){hit.setData('itemId',id);hit.setData('source',key);this.input.setDraggable(hit);hit.on('dragstart',()=>{this._dragging=true;});hit.on('dragend',p=>this._handleDrop(id,key,p));}
  }

  _mountSlot(add,f,x,y,w,h,item){
    const g=add(this.add.graphics());g.fillStyle(item?0x153526:0x0d191e,.98);g.fillRoundedRect(x,y,w,h,8);g.lineStyle(1,item?0x4de39b:0x30454d,.8);g.strokeRoundedRect(x,y,w,h,8);this._dropZones[`family:${f}`]={x,y,w,h};
    add(this.add.text(x+10,y+7,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:'7.5px',fontStyle:'900',color:'#728991'}));
    if(item){this._drawItemIcon(add,item,x+31,y+34,34);add(this.add.text(x+54,y+24,item.name,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:'#fff',wordWrap:{width:w-90}}));add(this.add.text(x+w-12,y+18,`T${item.tier}`,{fontFamily:'Orbitron,system-ui',fontSize:'10px',fontStyle:'900',color:'#59eda3'}).setOrigin(1,0));}
    else add(this.add.text(x+14,y+28,'SUELTA AQUÍ',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#49636d'}));
  }

  _handleDrop(id,source,pointer){
    const item=GARAGE_ITEMS[id];if(!item){this._dragging=false;return this.render();}
    if(item.kind==='part'){
      const z=this._dropZones[`family:${item.family}`];if(inside(pointer,z)&&equip(this.state,id,this.carId)){this.state=loadGarage();this._toast(`${item.name} montada en ${FAMILY_LABEL[item.family]}`);}
    }else{
      const a=inside(pointer,this._dropZones.A),b=inside(pointer,this._dropZones.B);
      if(a){if(source==='B')this.selB=null;this.selA=id;}else if(b){if(source==='A')this.selA=null;this.selB=id;}else if(source==='A')this.selA=null;else if(source==='B')this.selB=null;
    }
    this._dragging=false;this.render();
  }

  _drawItemIcon(add,item,cx,cy,size){const c=add(this.add.container(cx,cy));this._drawItemIconToContainer(c,item,size);return c;}
  _drawItemIconToContainer(c,item,size){
    const g=this.add.graphics();c.add(g);const s=size/64,id=item.id||'',fam=item.family,tone=item.tone||0x8ab7c8,metal=0xaebac4;
    const rr=(x,y,w,h,r,col,a=1)=>{g.fillStyle(col,a);g.fillRoundedRect(x*s,y*s,w*s,h*s,r*s);};const line=(w,col,a=1)=>g.lineStyle(w*s,col,a);
    g.fillStyle(0x000000,.28);g.fillEllipse(2*s,16*s,52*s,16*s);
    if(id==='scrap'){
      rr(-23,-8,22,9,3,0x929da5);rr(-16,-13,9,19,3,0xb4bec4);rr(1,-14,25,9,3,0x7f8b93);rr(10,-18,8,18,2,0xa8b2b8);rr(-8,7,29,8,3,0x6f7b83);g.fillStyle(0x222a2f,1);g.fillCircle(20*s,8*s,5*s);g.fillStyle(0x98a4aa,1);g.fillCircle(20*s,8*s,2*s);
    }else if(id==='alloy'){
      line(2,0xd9f3ff,.9);g.fillStyle(0x9eb8c8,1);g.beginPath();g.moveTo(-23*s,-12*s);g.lineTo(9*s,-20*s);g.lineTo(24*s,-7*s);g.lineTo(18*s,15*s);g.lineTo(-16*s,18*s);g.lineTo(-25*s,4*s);g.closePath();g.fillPath();g.strokePath();g.fillStyle(0xe9fbff,.55);g.fillTriangle(-16*s,-9*s,8*s,-15*s,-6*s,1*s);
    }else if(id==='rubber'){
      g.fillStyle(0x101317,1);g.fillCircle(0,0,24*s);g.fillStyle(0x343b40,1);g.fillCircle(0,0,15*s);g.fillStyle(0x0b0d0f,1);g.fillCircle(0,0,9*s);line(2,0x69737a,.55);for(let a=0;a<Math.PI*2;a+=Math.PI/6)g.lineBetween(Math.cos(a)*16*s,Math.sin(a)*16*s,Math.cos(a)*22*s,Math.sin(a)*22*s);
    }else if(id==='compound'){
      rr(-23,-15,46,30,8,0xe28d2f);rr(-19,-11,38,22,6,0xf2b64a);g.fillStyle(0xffe09b,.7);g.fillEllipse(-7*s,-5*s,16*s,7*s);g.fillStyle(0x6b4318,.35);for(const [x,y] of [[-10,5],[5,8],[12,-2],[-16,-4]])g.fillCircle(x*s,y*s,2*s);
    }else if(id==='disc'){
      g.fillStyle(metal,1);g.fillCircle(0,0,25*s);g.fillStyle(0x5c6870,1);g.fillCircle(0,0,16*s);g.fillStyle(0xd9e1e5,1);g.fillCircle(0,0,8*s);g.fillStyle(0x151a1d,1);g.fillCircle(0,0,4*s);g.fillStyle(0x354149,1);for(let a=0;a<Math.PI*2;a+=Math.PI/5)g.fillCircle(Math.cos(a)*12*s,Math.sin(a)*12*s,2.1*s);
    }else if(id==='spring'){
      line(4,0x72dbff,1);g.beginPath();g.moveTo(-23*s,-14*s);for(let i=0;i<=8;i++)g.lineTo((-23+i*6)*s,(i%2?-8:8)*s);g.strokePath();line(2,0xe7fbff,.75);g.lineBetween(-26*s,-18*s,-26*s,18*s);g.lineBetween(26*s,-18*s,26*s,18*s);
    }else if(id==='gear'){
      g.fillStyle(0xcbb46b,1);for(let i=0;i<12;i++){const a=i*Math.PI/6,gx=Math.cos(a)*22*s,gy=Math.sin(a)*22*s;g.fillRect(gx-4*s,gy-4*s,8*s,8*s);}g.fillCircle(0,0,20*s);g.fillStyle(0x5f5a42,1);g.fillCircle(0,0,9*s);g.fillStyle(0x151a1d,1);g.fillCircle(0,0,4*s);
    }else if(id==='ecu'){
      rr(-25,-17,50,34,5,0x174f42);rr(-21,-13,42,26,4,0x203b35);g.fillStyle(0x57e5af,1);for(let i=-14;i<=14;i+=7){g.fillRect(i*s,-8*s,4*s,4*s);g.fillRect(i*s,4*s,4*s);}g.fillStyle(0xd6c66d,1);for(let i=-22;i<=22;i+=8)g.fillRect(i*s,17*s,4*s,5*s);line(1,0x68f0c1,.55);g.lineBetween(-18*s,0,18*s,0);
    }else if(id==='brake_pad'){
      rr(-23,-15,46,30,7,0xd96049);rr(-17,-10,34,20,5,0x3f4549);g.fillStyle(0xf58b61,1);g.fillRect(-15*s,-7*s,30*s,14*s);g.fillStyle(0x1d2225,.6);g.fillRect(-2*s,-7*s,4*s,14*s);
    }else if(id==='engine_block'){
      rr(-25,-18,50,36,6,0x758b99);rr(-18,-12,36,24,4,0x9fb0bb);g.fillStyle(0x37434b,1);for(let x=-12;x<=12;x+=12)g.fillCircle(x*s,-4*s,5*s);rr(-12,12,24,7,2,0x4c5961);line(2,0xd9e3e8,.55);g.lineBetween(-18*s,-8*s,18*s,-8*s);
    }else if(fam==='tires'){
      g.fillStyle(0x101317,1);g.fillCircle(0,0,25*s);g.fillStyle(0x3b4247,1);g.fillCircle(0,0,17*s);g.fillStyle(0xb7c1c7,1);g.fillCircle(0,0,10*s);g.fillStyle(0x2b3439,1);g.fillCircle(0,0,4*s);line(2,tone,.85);g.strokeCircle(0,0,19*s);
    }else if(fam==='brakes'){
      g.fillStyle(0xb9c3c9,1);g.fillCircle(-4*s,0,24*s);g.fillStyle(0x465159,1);g.fillCircle(-4*s,0,16*s);g.fillStyle(0x111619,1);g.fillCircle(-4*s,0,6*s);rr(7,-16,18,31,6,tone);line(2,0xf1f5f7,.5);g.strokeCircle(-4*s,0,20*s);
    }else if(fam==='suspension'){
      rr(-7,-26,14,52,5,0x596875);line(5,tone,1);g.beginPath();g.moveTo(-18*s,-17*s);for(let i=0;i<=7;i++)g.lineTo((i%2?16:-16)*s,(-17+i*5)*s);g.strokePath();rr(-18,22,36,7,3,0xc2cbd0);
    }else if(fam==='transmission'){
      rr(-25,-18,50,36,8,0x75858f);g.fillStyle(0xaab7bf,1);g.fillCircle(-10*s,0,11*s);g.fillCircle(10*s,0,11*s);g.fillStyle(0x303940,1);g.fillCircle(-10*s,0,5*s);g.fillCircle(10*s,0,5*s);line(3,tone,.9);g.lineBetween(-10*s,0,10*s,0);
    }else if(fam==='engine'){
      rr(-27,-19,54,38,7,0x697b87);rr(-20,-12,40,24,5,0x95a6b0);g.fillStyle(0x262f34,1);for(let x=-12;x<=12;x+=12)g.fillCircle(x*s,-3*s,5*s);rr(-24,12,48,8,3,tone);line(2,0xeaf4f7,.45);g.lineBetween(-18*s,-9*s,18*s,-9*s);
    }else{g.fillStyle(tone,1);g.fillCircle(0,0,20*s);g.fillStyle(0xffffff,.5);g.fillCircle(-6*s,-6*s,7*s);}
  }

  _craft(){if(!this.selA||!this.selB)return this._toast('Arrastra dos materiales al banco');const r=craft(this.state,this.selA,this.selB);if(!r.ok)return this._toast(r.reason);this.lastCraftedId=r.item.id;this.selA=this.selB=null;this.state=loadGarage();this.filter=r.item.kind==='part'?'parts':'materials';this._toast(`FABRICADO · ${r.item.name}`);this.render();}
  async _double(){const ok=await showRewardedAd(this,{title:'DUPLICAR BOTÍN'});if(ok){const r=duplicateLastReward();this.state=loadGarage();this._toast(r?'Botín duplicado':'Ya reclamado');this.render();}}
  _toast(msg){const {width,height}=this.scale;const t=this.add.text(width/2,height-30,msg,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'900',color:'#fff',backgroundColor:'#113129',padding:{x:14,y:8}}).setOrigin(.5).setDepth(9999);this.time.delayedCall(1500,()=>t.destroy());}
}

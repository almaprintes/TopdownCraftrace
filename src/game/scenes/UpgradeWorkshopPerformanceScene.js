import Phaser from 'phaser';
import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST, findRecipe } from '../garage/partsCatalog.js';
import { loadGarage, qty, craft, evolve, equip, duplicateLastReward, getEquippedForCar, garageTuning } from '../garage/garageStore.js';
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

export class UpgradeShopScene extends Phaser.Scene{
  constructor(){super('upgrade-shop');this.state=null;this.selA=null;this.selB=null;this.filter='materials';this.lastCraftedId=null;this.ui=null;this.carId='stock';}
  create(){this.carId=selectedCarId();this.state=loadGarage();this.cameras.main.setBackgroundColor('#061015');this.scale.on('resize',()=>this.render());this.render();}
  shutdown(){this.scale.off('resize',this.render,this);}

  _performance(){
    const spec=CAR_SPECS[this.carId]||CAR_SPECS.stock;
    const legacy=legacyUpgradeTuning(this.carId);
    const base=resolveCarParams(spec,legacy);
    const full=resolveCarParams(spec,combine(legacy,garageTuning(this.state,this.carId)));
    return {spec,base,full};
  }

  render(){
    const {width,height}=this.scale;if(this.ui)this.ui.destroy(true);this.ui=this.add.container(0,0);const add=o=>{this.ui.add(o);return o;};
    const bg=add(this.add.graphics());bg.fillGradientStyle(0x061015,0x0c1d1b,0x071019,0x13281d,1);bg.fillRect(0,0,width,height);bg.fillStyle(0x52ff9b,.035);bg.fillEllipse(width*.72,height*.22,width*.72,height*.55);
    const pad=clamp(width*.024,16,28),header=78;
    add(this.add.text(pad,14,'TDR WORKSHOP',{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.022,22,34)+'px',fontStyle:'900',color:'#fff'}));
    const {spec,base,full}=this._performance();
    add(this.add.text(pad,47,`${spec.name}  ·  CRAFTING Y TELEMETRÍA DE MONTAJE`,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:'#59e89d',letterSpacing:1.1}));
    const back=add(this.add.text(width-pad,20,'← GARAGE',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'800',color:'#dcecef'}).setOrigin(1,0).setInteractive({useHandCursor:true}));back.on('pointerdown',()=>this.scene.start('menu'));

    const y=header,h=height-header-pad,leftW=width*.35,midW=width*.29,rightX=pad+leftW+12+midW+12,rightW=width-rightX-pad;
    const panel=(x,w,title,col)=>{add(this.add.rectangle(x,y,w,h,0x09141a,.94).setOrigin(0).setStrokeStyle(1,col,.30));add(this.add.text(x+14,y+12,title,{fontFamily:'Orbitron,system-ui',fontSize:'11px',fontStyle:'900',color:'#fff'}));};
    panel(pad,leftW,'ALMACÉN',0x58e99c);panel(pad+leftW+12,midW,'BANCO DE FUSIÓN',0x68e6ff);panel(rightX,rightW,'COCHE / RENDIMIENTO',0xffc95a);

    // inventory
    const tabY=y+38,tabW=(leftW-36)/2;this._tab(add,pad+14,tabY,tabW,'MATERIALES','materials');this._tab(add,pad+22+tabW,tabY,tabW,'PIEZAS','parts');
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0).filter(id=>this.filter==='parts'?GARAGE_ITEMS[id].kind==='part':GARAGE_ITEMS[id].kind!=='part');
    const cols=3,gap=7,gx=pad+14,gy=tabY+40,gw=leftW-28,cw=(gw-gap*2)/3,ch=92;
    const equipped=getEquippedForCar(this.state,this.carId);
    ids.slice(0,12).forEach((id,i)=>{const item=GARAGE_ITEMS[id],q=qty(this.state,id),x=gx+(i%3)*(cw+gap),yy=gy+Math.floor(i/3)*(ch+gap);if(yy+ch>y+h-10)return;const eq=equipped?.[item.family]===id,just=id===this.lastCraftedId;
      const r=add(this.add.rectangle(x,yy,cw,ch,eq?0x19392d:(just?0x3a321c:0x0d1d22),.98).setOrigin(0).setStrokeStyle(eq||just?2:1,eq?0x58e99c:(just?0xffd166:0x28414b),.95).setInteractive({useHandCursor:true}));
      add(this.add.text(x+9,yy+7,item.icon,{fontFamily:'system-ui',fontSize:'23px',color:'#fff'}));add(this.add.text(x+cw-7,yy+8,`×${q}`,{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:'#68e6ff'}).setOrigin(1,0));add(this.add.text(x+9,yy+39,item.name,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'800',color:'#eef6f7',wordWrap:{width:cw-16}}));
      if(item.kind==='part'){const a=add(this.add.text(x+cw/2,yy+76,eq?'EQUIPADA':'EQUIPAR',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:eq?'#58e99c':'#fff',backgroundColor:eq?'#143525':'#17465a',padding:{x:6,y:3}}).setOrigin(.5).setInteractive({useHandCursor:true}));a.on('pointerdown',p=>{p.event?.stopPropagation?.();if(!eq)this._equip(id);});}
      r.on('pointerdown',()=>{if(item.kind!=='part')this._pick(id);});
    });

    // fusion bench
    const mx=pad+leftW+12;add(this.add.text(mx+14,y+38,'Selecciona dos materiales. El resultado\nse guarda automáticamente en ALMACÉN → PIEZAS.',{fontFamily:'system-ui',fontSize:'9px',color:'#79939b',lineSpacing:4,wordWrap:{width:midW-28}}));
    const sy=y+90,sw=(midW-42)/2;this._slot(add,mx+14,sy,sw,92,this.selA,'A');this._slot(add,mx+28+sw,sy,sw,92,this.selB,'B');add(this.add.text(mx+midW/2,sy+30,'+',{fontFamily:'Orbitron',fontSize:'20px',color:'#68e6ff'}).setOrigin(.5,0));
    const rec=this.selA&&this.selB?findRecipe(this.selA,this.selB):null,out=rec?GARAGE_ITEMS[rec.out]:null;add(this.add.text(mx+midW/2,sy+104,out?`→ ${out.icon} ${out.name}`:'→ resultado',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'900',color:out?'#ffd166':'#536b74'}).setOrigin(.5,0));
    const by=sy+132,b=add(this.add.rectangle(mx+14,by,midW-28,44,out?0x42f18b:0x203138,1).setOrigin(0).setInteractive({useHandCursor:true}));add(this.add.text(mx+midW/2,by+22,out?'FABRICAR':'ELIGE UNA RECETA',{fontFamily:'Orbitron',fontSize:'10px',fontStyle:'900',color:out?'#062014':'#778e96'}).setOrigin(.5));b.on('pointerdown',()=>this._craft());
    add(this.add.text(mx+14,by+62,'RECETAS BASE\n◎ + ◆  → Pastilla deportiva\n◉ + ◆  → Neumático de calle\n〰 + ⬡  → Suspensión reforzada\n⚙ + ⬡  → Caja reforzada\nChatarra + ⬡ → Bloque preparado\nBloque + ECU → Motor preparado',{fontFamily:'system-ui',fontSize:'8.5px',color:'#a9c0c7',lineSpacing:5,wordWrap:{width:midW-28}}));
    if(this.state.lastReward&&!this.state.lastReward.doubled){const ry=y+h-44,rb=add(this.add.rectangle(mx+14,ry,midW-28,34,0x153329,.95).setOrigin(0).setInteractive({useHandCursor:true}));add(this.add.text(mx+midW/2,ry+17,'▶ DUPLICAR BOTÍN',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'900',color:'#caffdf'}).setOrigin(.5));rb.on('pointerdown',()=>this._double());}

    // loadout + real deltas
    add(this.add.text(rightX+14,y+36,`${spec.brand||''} · ${spec.role||''}`,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:'#9cb0b6'}));
    const perf=[['PUNTA',base.maxFwd,full.maxFwd,'px/s'],['ACEL.',base.accel,full.accel,'px/s²'],['FRENO',base.brakeForce,full.brakeForce,'px/s²'],['GIRO',base.turnRate,full.turnRate,'rad/s'],['GRIP',base.gripDrive,full.gripDrive,'']];
    let py=y+62;perf.forEach(([lab,a,v,unit])=>{const d=pct(a,v);add(this.add.text(rightX+14,py,lab,{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#748a91'}));add(this.add.text(rightX+70,py,`${Number(v).toFixed(unit==='rad/s'?2:(unit?1:3))} ${unit}`,{fontFamily:'Orbitron,system-ui',fontSize:'10px',fontStyle:'900',color:'#fff'}));add(this.add.text(rightX+rightW-16,py,Math.abs(d)<.01?'—':fmtDelta(d),{fontFamily:'Orbitron,system-ui',fontSize:'9px',fontStyle:'900',color:d>=0?'#58e99c':'#ff7082'}).setOrigin(1,0));py+=23;});
    add(this.add.text(rightX+14,py+2,'Los porcentajes muestran SOLO el efecto de las piezas fabricadas.',{fontFamily:'system-ui',fontSize:'8px',color:'#657c84',wordWrap:{width:rightW-28}}));

    const ly=py+34,lh=47,lg=5;FAMILIES.forEach((f,i)=>{const yy=ly+i*(lh+lg),id=equipped?.[f],item=id?GARAGE_ITEMS[id]:null;add(this.add.rectangle(rightX+14,yy,rightW-28,lh,item?0x173126:0x101d21,.96).setOrigin(0).setStrokeStyle(1,item?0x4ee1a0:0x30444b,.7));add(this.add.text(rightX+24,yy+7,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:'8px',fontStyle:'900',color:'#788e95'}));add(this.add.text(rightX+24,yy+23,item?`${item.icon} ${item.name}`:'SIN PIEZA',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'800',color:item?'#fff':'#52666d',wordWrap:{width:rightW-58}}));if(item)add(this.add.text(rightX+rightW-22,yy+15,`T${item.tier}`,{fontFamily:'Orbitron',fontSize:'10px',fontStyle:'900',color:'#58e99c'}).setOrigin(1,0));});
  }

  _tab(add,x,y,w,label,key){const on=this.filter===key,r=add(this.add.rectangle(x,y,w,30,on?0x1c4936:0x101e23,.98).setOrigin(0).setStrokeStyle(1,on?0x58e99c:0x2b424b,.8).setInteractive({useHandCursor:true}));add(this.add.text(x+w/2,y+15,label,{fontFamily:'system-ui',fontSize:'8.5px',fontStyle:'900',color:on?'#caffdf':'#71868d'}).setOrigin(.5));r.on('pointerdown',()=>{this.filter=key;this.selA=this.selB=null;this.render();});}
  _slot(add,x,y,w,h,id,label){const it=id?GARAGE_ITEMS[id]:null;add(this.add.rectangle(x,y,w,h,0x071116,1).setOrigin(0).setStrokeStyle(2,it?0x68e6ff:0x29414f,.9));add(this.add.text(x+w/2,y+11,it?it.icon:label,{fontFamily:'system-ui',fontSize:it?'27px':'21px',fontStyle:'900',color:it?'#fff':'#405b66'}).setOrigin(.5,0));add(this.add.text(x+w/2,y+52,it?it.name:'Selecciona',{fontFamily:'system-ui',fontSize:'8px',fontStyle:'800',color:it?'#dcebef':'#58717b',align:'center',wordWrap:{width:w-10}}).setOrigin(.5,0));}
  _pick(id){if(!this.selA||(this.selA&&this.selB)){this.selA=id;this.selB=null;}else this.selB=id;this.render();}
  _craft(){if(!this.selA||!this.selB)return this._toast('Selecciona dos materiales');const r=craft(this.state,this.selA,this.selB);if(!r.ok)return this._toast(r.reason);this.lastCraftedId=r.item.id;this.selA=this.selB=null;this.state=loadGarage();this.filter=r.item.kind==='part'?'parts':'materials';this._toast(`FABRICADO · ${r.item.name}`);this.render();}
  _equip(id){if(equip(this.state,id,this.carId)){this.state=loadGarage();this._toast(`${GARAGE_ITEMS[id].name} equipada en ${CAR_SPECS[this.carId]?.name||this.carId}`);}this.render();}
  async _double(){const ok=await showRewardedAd(this,{title:'DUPLICAR BOTÍN'});if(ok){duplicateLastReward();this.state=loadGarage();this.render();}}
  _toast(msg){const {width,height}=this.scale,t=this.add.text(width/2,height-30,msg,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'900',color:'#fff',backgroundColor:'#102a24',padding:{x:13,y:7}}).setOrigin(.5).setDepth(999);this.tweens.add({targets:t,alpha:0,y:t.y-10,delay:1000,duration:350,onComplete:()=>t.destroy()});}
}

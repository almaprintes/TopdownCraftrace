import Phaser from 'phaser';
import { GARAGE_ITEMS, EVOLUTION_CHAIN, EVOLUTION_COST } from '../garage/partsCatalog.js';
import { loadGarage, qty, craft, evolve, equip, duplicateLastReward } from '../garage/garageStore.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'RUEDAS',suspension:'SUSPENSIÓN',transmission:'CAJA'};
const FAMILIES=['engine','brakes','tires','suspension','transmission'];

export class UpgradeShopScene extends Phaser.Scene {
  constructor(){
    super('upgrade-shop');
    this.state=null; this.selA=null; this.selB=null; this.ui=null; this.filter='materials';
  }

  create(){
    this.cameras.main.setBackgroundColor('#071018');
    this.state=loadGarage();
    this.scale.on('resize',()=>this.render());
    this.render();
  }

  render(){
    const {width,height}=this.scale;
    if(this.ui)this.ui.destroy(true);
    this.ui=this.add.container(0,0);
    const add=o=>{this.ui.add(o);return o;};

    const bg=add(this.add.graphics());
    bg.fillGradientStyle(0x061015,0x0b1b1b,0x071018,0x10261b,1);bg.fillRect(0,0,width,height);
    bg.fillStyle(0x4fffa0,.035);bg.fillEllipse(width*.72,height*.22,width*.72,height*.54);
    bg.lineStyle(1,0xffffff,.025);for(let x=0;x<width;x+=72)bg.lineBetween(x,0,x,height);for(let y=0;y<height;y+=72)bg.lineBetween(0,y,width,y);

    const pad=clamp(width*.025,16,30),headerH=78;
    add(this.add.text(pad,16,'TDR WORKSHOP',{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.022,22,34)+'px',fontStyle:'900',color:'#fff'}));
    add(this.add.text(pad,48,'CORRE · RECUPERA MATERIALES · FUSIONA · EQUIPA',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:'#58e99c',letterSpacing:1.4}));
    const back=add(this.add.text(width-pad,20,'← GARAGE',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'800',color:'#dcecef'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>this.scene.start('menu'));

    const contentY=headerH,contentH=height-headerH-pad;
    const leftW=width*.36,midW=width*.30,rightX=pad+leftW+12+midW+12,rightW=width-rightX-pad;
    const panel=(x,y,w,h,title,accent=0x58e99c)=>{
      add(this.add.rectangle(x,y,w,h,0x09141a,.92).setOrigin(0).setStrokeStyle(1,accent,.28));
      add(this.add.text(x+14,y+12,title,{fontFamily:'Orbitron,system-ui',fontSize:'11px',fontStyle:'900',color:'#fff'}));
    };

    // INVENTORY
    panel(pad,contentY,leftW,contentH,'ALMACÉN');
    const tabY=contentY+38,tabW=(leftW-28-8)/2;
    this._tab(add,pad+14,tabY,tabW,'MATERIALES','materials');
    this._tab(add,pad+14+tabW+8,tabY,tabW,'PIEZAS','parts');

    const ids=Object.keys(GARAGE_ITEMS).filter(id=>qty(this.state,id)>0).filter(id=>{
      const k=GARAGE_ITEMS[id].kind;
      return this.filter==='materials' ? k!=='part' : k==='part';
    });
    const cols=3,gap=7,gridX=pad+14,gridY=tabY+40,gridW=leftW-28,cellW=(gridW-gap*(cols-1))/cols,cellH=82;
    ids.slice(0,12).forEach((id,idx)=>{
      const item=GARAGE_ITEMS[id],q=qty(this.state,id),x=gridX+(idx%cols)*(cellW+gap),y=gridY+Math.floor(idx/cols)*(cellH+gap);
      if(y+cellH>contentY+contentH-12)return;
      const selected=id===this.selA||id===this.selB;
      const r=add(this.add.rectangle(x,y,cellW,cellH,selected?0x173c32:0x0d1d22,.98).setOrigin(0).setStrokeStyle(selected?2:1,selected?0x58e99c:0x28414b,.95).setInteractive({useHandCursor:true}));
      add(this.add.text(x+10,y+8,item.icon,{fontFamily:'system-ui',fontSize:'24px',color:'#fff'}));
      add(this.add.text(x+cellW-8,y+8,`×${q}`,{fontFamily:'Orbitron,system-ui',fontSize:'10px',fontStyle:'900',color:'#68e6ff'}).setOrigin(1,0));
      add(this.add.text(x+10,y+43,item.name,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'800',color:'#eaf4f5',wordWrap:{width:cellW-18}}));
      r.on('pointerdown',()=>this._pick(id));
    });

    // WORKBENCH
    const midX=pad+leftW+12;
    panel(midX,contentY,midW,contentH,'BANCO DE FUSIÓN',0x68e6ff);
    add(this.add.text(midX+14,contentY+38,'Combina dos materiales compatibles.\nLas recetas se descubren al fabricar.',{fontFamily:'system-ui',fontSize:'10px',color:'#7f9da8',lineSpacing:4,wordWrap:{width:midW-28}}));

    const slotY=contentY+94,slotW=(midW-42)/2;
    this._slot(add,midX+14,slotY,slotW,104,this.selA,'A');
    this._slot(add,midX+28+slotW,slotY,slotW,104,this.selB,'B');
    add(this.add.text(midX+midW/2,slotY+34,'+',{fontFamily:'Orbitron,system-ui',fontSize:'22px',color:'#68e6ff'}).setOrigin(.5,0));

    const can=!!(this.selA&&this.selB),craftY=slotY+122;
    const craftBtn=add(this.add.rectangle(midX+14,craftY,midW-28,48,can?0x42f18b:0x203138,1).setOrigin(0).setInteractive({useHandCursor:true}));
    add(this.add.text(midX+midW/2,craftY+24,'FUSIONAR',{fontFamily:'Orbitron,system-ui',fontSize:'13px',fontStyle:'900',color:can?'#062014':'#78909a'}).setOrigin(.5));
    craftBtn.on('pointerdown',()=>this._doCraft());

    const hintY=craftY+64;
    add(this.add.text(midX+14,hintY,'RECETAS INICIALES',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'900',color:'#6d8790'}));
    add(this.add.text(midX+14,hintY+20,'◎ Disco + ◆ Compuesto → Frenos\n◉ Goma + ◆ Compuesto → Neumático\n〰 Muelle + ⬡ Aleación → Suspensión\n⚙ Engranaje + ⬡ Aleación → Caja',{fontFamily:'system-ui',fontSize:'9px',color:'#b6cbd1',lineSpacing:6}));

    if(this.state.lastReward&&!this.state.lastReward.doubled){
      const ry=contentY+contentH-54;
      const rb=add(this.add.rectangle(midX+14,ry,midW-28,40,0x163329,.96).setOrigin(0).setStrokeStyle(1,0x58e99c,.65).setInteractive({useHandCursor:true}));
      add(this.add.text(midX+midW/2,ry+20,'▶ DUPLICAR ÚLTIMO BOTÍN',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'900',color:'#caffdf'}).setOrigin(.5));
      rb.on('pointerdown',()=>this._doubleReward());
    }

    // LOADOUT
    panel(rightX,contentY,rightW,contentH,'COCHE / MONTAJE',0xffc95a);
    add(this.add.text(rightX+14,contentY+38,'Las piezas equipadas modifican\nel comportamiento real del coche.',{fontFamily:'system-ui',fontSize:'10px',color:'#879ba1',lineSpacing:4}));
    const sy=contentY+88,sh=58,sg=7;
    FAMILIES.forEach((f,i)=>{
      const y=sy+i*(sh+sg),id=this.state.equipped?.[f],item=id?GARAGE_ITEMS[id]:null;
      const r=add(this.add.rectangle(rightX+14,y,rightW-28,sh,item?0x173126:0x101d21,.96).setOrigin(0).setStrokeStyle(1,item?0x4ee1a0:0x30444b,.7));
      add(this.add.text(rightX+25,y+9,FAMILY_LABEL[f],{fontFamily:'system-ui',fontSize:'9px',fontStyle:'900',color:'#789098'}));
      add(this.add.text(rightX+25,y+27,item?`${item.icon} ${item.name}`:'SIN PIEZA',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:item?'#fff':'#53666d',wordWrap:{width:rightW-55}}));
      if(item)add(this.add.text(rightX+rightW-24,y+19,`T${item.tier}`,{fontFamily:'Orbitron,system-ui',fontSize:'12px',fontStyle:'900',color:'#4ee1a0'}).setOrigin(1,0));
    });

    if(this.filter==='parts'){
      add(this.add.text(rightX+14,contentY+contentH-74,'TOCA UNA PIEZA DEL ALMACÉN PARA SELECCIONARLA.\nDespués tócala otra vez para equiparla/evolucionarla.',{fontFamily:'system-ui',fontSize:'9px',color:'#71868d',wordWrap:{width:rightW-28},lineSpacing:4}));
    }
  }

  _tab(add,x,y,w,label,key){
    const active=this.filter===key;
    const r=add(this.add.rectangle(x,y,w,31,active?0x1d4937:0x101e23,.98).setOrigin(0).setStrokeStyle(1,active?0x58e99c:0x2b424b,.8).setInteractive({useHandCursor:true}));
    add(this.add.text(x+w/2,y+15,label,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'900',color:active?'#caffdf':'#71868d'}).setOrigin(.5));
    r.on('pointerdown',()=>{this.filter=key;this.selA=this.selB=null;this.render();});
  }

  _slot(add,x,y,w,h,id,label){
    const item=id?GARAGE_ITEMS[id]:null;
    add(this.add.rectangle(x,y,w,h,0x071116,1).setOrigin(0).setStrokeStyle(2,item?0x68e6ff:0x29414f,.9));
    add(this.add.text(x+w/2,y+12,item?item.icon:label,{fontFamily:'system-ui',fontSize:item?'30px':'23px',fontStyle:'900',color:item?'#fff':'#405b66'}).setOrigin(.5,0));
    add(this.add.text(x+w/2,y+57,item?item.name:'Selecciona',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'800',color:item?'#dcebef':'#58717b',align:'center',wordWrap:{width:w-12}}).setOrigin(.5,0));
  }

  _pick(id){
    const item=GARAGE_ITEMS[id];
    if(item?.kind==='part' && this.filter==='parts'){
      const eq=this.state.equipped?.[item.family]===id;
      if(eq){ this._toast('Ya está equipada'); return; }
      if(this.selA===id){
        if(EVOLUTION_CHAIN[id]&&qty(this.state,id)>=EVOLUTION_COST){this._doEvolve(id);return;}
        this._doEquip(id);return;
      }
    }
    if(!this.selA||(this.selA&&this.selB)){this.selA=id;this.selB=null;}else this.selB=id;
    this.render();
  }

  _doCraft(){
    if(!this.selA||!this.selB)return this._toast('Selecciona dos elementos');
    const res=craft(this.state,this.selA,this.selB);
    if(!res.ok)return this._toast(res.reason);
    this.selA=this.selB=null;this.state=loadGarage();this._toast(`NUEVO · ${res.item.name}`);this.render();
  }
  _doEvolve(id){const r=evolve(this.state,id);this.state=loadGarage();this._toast(r.ok?`EVOLUCIÓN · ${r.item.name}`:r.reason);this.render();}
  _doEquip(id){if(equip(this.state,id)){this.state=loadGarage();this._toast(`${GARAGE_ITEMS[id].name} equipada`);}this.render();}
  async _doubleReward(){const ok=await showRewardedAd(this,{title:'DUPLICAR BOTÍN'});if(ok){const r=duplicateLastReward();this.state=loadGarage();this._toast(r?'Botín duplicado':'Ya reclamado');this.render();}}
  _toast(msg){const {width,height}=this.scale;const t=this.add.text(width/2,height-32,msg,{fontFamily:'system-ui',fontSize:'12px',fontStyle:'900',color:'#fff',backgroundColor:'#102a24',padding:{x:14,y:8}}).setOrigin(.5).setDepth(999);this.tweens.add({targets:t,alpha:0,y:t.y-10,delay:1100,duration:350,onComplete:()=>t.destroy()});}
}

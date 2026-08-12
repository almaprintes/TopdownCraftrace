import { UpgradeShopScene as PremiumWorkshopV2 } from './UpgradeWorkshopPremiumV2Scene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, findStripRecipe, stripRecipeCanAccept } from '../garage/partsCatalog.js';
import { getEquippedForCar, qty, garageDisplayStats } from '../garage/garageStore.js';

const WORKSHOP_BASE=`${import.meta.env.BASE_URL || './'}assets/cars/workshop/`;
const CRAFT_BASE=`${import.meta.env.BASE_URL || './'}assets/crafting/`;

const CRAFT_ASSETS={
  scrap:'materials/chatarra.webp',
  alloy:'materials/aleacion.webp',
  rubber:'materials/goma.webp',
  compound:'materials/compuesto.webp',
  disc:'materials/disco_metalico.webp',
  spring:'materials/muelle.webp',
  gear:'materials/engranaje.webp',
  ecu:'materials/electronica.webp',

  engine_street:'parts/engine/engine_street.webp',
  engine_sport:'parts/engine/engine_sport.webp',
  engine_racing:'parts/engine/engine_racing.webp',
  engine_prototype:'parts/engine/engine_prototype.webp',

  brakes_street:'parts/brakes/brakes_street.webp',
  brakes_sport:'parts/brakes/brakes_sport.webp',
  brakes_racing:'parts/brakes/brakes_racing.webp',
  brakes_prototype:'parts/brakes/brakes_prototype.webp',

  tires_street:'parts/tires/tires_street.webp',
  tires_sport:'parts/tires/tires_sport.webp',
  tires_racing:'parts/tires/tires_racing_t3.webp',
  tires_prototype:'parts/tires/tires_prototype_t4.webp',

  suspension_street:'parts/suspension/suspension_street_t1.webp',
  suspension_sport:'parts/suspension/suspension_sport_t2.webp',
  suspension_racing:'parts/suspension/suspension_racing_t3.webp',
  suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',

  transmission_street:'parts/transmission/transmission_street_t1.webp',
  transmission_sport:'parts/transmission/transmission_sport_t2.webp',
  transmission_racing:'parts/transmission/transmission_racing_t3.webp',
  transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};

const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];

const WORKSHOP_CAR_LAYOUT={
  avenir_gripline:{x:0.49,y:0.55,scale:1.18},
  avenir_apex:{x:0.47,y:0.55,scale:1.13},
};

export class UpgradeShopScene extends PremiumWorkshopV2 {
  create(){
    this._workshopMissing=new Set();
    super.create();
  }

  // Rediseño: el Craft Strip pasa a ser protagonista visual.
  render(){
    const {width:w,height:h}=this.scale;
    if(this.root)this.root.destroy(true);
    this.root=this.add.container();
    const A=o=>{this.root.add(o);return o;};
    const compact=h<520;

    this._bg(A,w,h);
    this._header(A,w,compact);

    const top=compact?51:64;
    const pad=compact?8:12;
    const gap=compact?9:12;
    const bottom=compact?66:84;
    const bodyH=h-top-bottom-pad;

    const leftW=Math.round(w*.48);
    const left={x:pad,y:top,w:leftW-pad,h:bodyH};
    const right={x:left.x+left.w+gap,y:top,w:w-(left.x+left.w+gap)-pad,h:bodyH};

    this._carPanel(A,left,compact);
    this._craftPanel(A,right,compact);
    this._equippedStrip(A,{x:pad,y:h-bottom,w:w-pad*2,h:bottom-pad},compact);
  }

  _carPanel(A,r,compact){
    this._panel(A,r,0x2bcfff);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const y=r.y+(compact?10:14);
    A(this.add.text(r.x+15,y,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'800',color:'#8da3ae'}));
    A(this.add.text(r.x+15,y+(compact?17:20),spec.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'27px',fontStyle:'900 italic',color:'#fff'}));
    A(this.add.text(r.x+r.w-15,y+2,String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'10px':'12px',fontStyle:'900',color:'#ffd05a'}).setOrigin(1,0));

    const imageH=Math.round(r.h*(compact?0.45:0.52));
    const carR={x:r.x+10,y:r.y+(compact?53:66),w:r.w-20,h:imageH};
    this._platform(A,carR);
    this._carImage(A,spec,carR);
    this._stats(A,spec,{x:r.x+14,y:carR.y+carR.h+8,w:r.w-28,h:r.y+r.h-carR.y-carR.h-16},compact);
  }

  _carImage(A,spec,r){
    const cleanKey=`workshop_render_v5_${this.car}`;
    const layout=WORKSHOP_CAR_LAYOUT[this.car]||{x:0.49,y:0.53,scale:1.08};
    const cx=r.x+r.w*layout.x,cy=r.y+r.h*layout.y,w=r.w*.92,h=r.h*.94;

    const showClean=()=>{
      if(!this.textures.exists(cleanKey))return false;
      const img=A(this.add.image(cx,cy,cleanKey));
      const baseScale=Math.min(w/(img.width||1),h/(img.height||1));
      img.setScale(baseScale*layout.scale);
      return true;
    };

    if(showClean())return;
    if(this._workshopMissing?.has(cleanKey))return super._carImage(A,spec,r);
    if(this.loadingAssets.has(cleanKey))return;

    this.loadingAssets.add(cleanKey);
    const cleanup=()=>{
      this.loadingAssets.delete(cleanKey);
      this.load.off(`filecomplete-image-${cleanKey}`,ok);
      this.load.off('loaderror',err);
    };
    const ok=()=>{cleanup();if(this.root?.scene)this.render();};
    const err=f=>{if(f?.key!==cleanKey)return;cleanup();this._workshopMissing?.add(cleanKey);if(this.root?.scene)this.render();};

    this.load.once(`filecomplete-image-${cleanKey}`,ok);
    this.load.on('loaderror',err);
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp?v=20260811-5`);
    if(!this.load.isLoading())this.load.start();
  }

  _craftPanel(A,r,compact){
    this._panel(A,r,0x2dcfff);
    A(this.add.text(r.x+16,r.y+11,'ELIGE 3 COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'19px',fontStyle:'900',color:'#fff'}));
    A(this.add.text(r.x+r.w-16,r.y+13,'CRAFT STRIP',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'12px',fontStyle:'900 italic',color:'#5edcff'}).setOrigin(1,0));

    const sy=r.y+(compact?36:45);
    const gap=compact?7:10;
    const sw=(r.w-32-gap*2)/3;
    const sh=compact?68:112;
    for(let i=0;i<3;i++)this._slot(A,i,r.x+16+i*(sw+gap),sy,sw,sh,compact);

    const ry=sy+sh+(compact?7:10);
    const rh=compact?70:144;
    this._result(A,{x:r.x+16,y:ry,w:r.w-32,h:rh},compact);

    const ty=ry+rh+(compact?6:9);
    const th=compact?26:34;
    this._tab(A,r.x+16,ty,(r.w-38)/2,th,'MATERIALES','materials',compact);
    this._tab(A,r.x+22+(r.w-38)/2,ty,(r.w-38)/2,th,'PIEZAS','parts',compact);

    const gridY=ty+th+(compact?5:8);
    this._inventory(A,{x:r.x+14,y:gridY,w:r.w-28,h:r.y+r.h-gridY-10},compact);
  }

  _slot(A,i,x,y,w,h,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null;
    const g=A(this.add.graphics());
    g.fillStyle(item?0x07151c:0x081015);g.fillRoundedRect(x,y,w,h,10);
    g.lineStyle(item?2:1,item?(item.tone||0x2dcfff):0x2e4854,item?1:.8);g.strokeRoundedRect(x,y,w,h,10);

    if(!item){
      A(this.add.text(x+w/2,y+h/2,`+ ${i+1}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'20px':'30px',fontStyle:'900',color:'#4c6874'}).setOrigin(.5));
      return;
    }

    const artSize=Math.min(w*.78,h*.62);
    this._itemArt(A,item,x+w/2,y+h*.40,artSize);
    A(this.add.text(x+w/2,y+h-compact?13:17,'',{fontSize:'1px'}));
    A(this.add.text(x+w/2,y+h-(compact?10:14),item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'12px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:w-10}}).setOrigin(.5,1));
    A(this.add.text(x+w-7,y+6,`×${qty(this.state,id)}`,{fontFamily:'system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(1,0));

    const hit=A(this.add.rectangle(x,y,w,h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true}));
    hit.on('pointerdown',()=>{if(!this.busy){this.slots.splice(i,1);this.render();}});
  }

  _result(A,r,compact){
    const recipe=findStripRecipe(this.slots);
    const item=recipe?GARAGE_ITEMS[recipe.out]:null;
    const g=A(this.add.graphics());
    g.fillGradientStyle(item?0x160821:0x071017,0x071017,item?0x240b31:0x071017,0x05090d,1);
    g.fillRoundedRect(r.x,r.y,r.w,r.h,11);
    g.lineStyle(item?2:1,item?0xc74cff:0x31515f,.85);g.strokeRoundedRect(r.x,r.y,r.w,r.h,11);

    if(!item){
      A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length?'COMPLETA UNA RECETA':'SELECCIONA TRES COMPONENTES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'12px':'17px',fontStyle:'900',color:'#718993'}).setOrigin(.5));
      return;
    }

    const artSize=Math.min(r.h*.78,r.w*.24);
    this._itemArt(A,item,r.x+r.w*.15,r.y+r.h*.49,artSize);

    const tx=r.x+r.w*.28;
    A(this.add.text(tx,r.y+(compact?8:15),item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'16px':'25px',fontStyle:'900 italic',color:'#dc59ff'}));
    A(this.add.text(tx,r.y+(compact?29:48),`${FAMILY_LABEL[item.family]||'PIEZA'} · T${item.tier||1}`,{fontFamily:'system-ui',fontSize:compact?'9px':'12px',fontStyle:'800',color:'#dac2df'}));

    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const cur=garageDisplayStats(spec,this.state,this.car,null);
    const next=garageDisplayStats(spec,this.state,this.car,item.id);
    const changes=STATS.filter(([k])=>next[k]!==cur[k]).map(([k,l])=>`${l} +${next[k]-cur[k]}`);
    A(this.add.text(tx,r.y+(compact?45:72),changes.slice(0,2).join('  ·  ')||'LISTA PARA EQUIPAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'14px',fontStyle:'900',color:'#65ef70'}));

    const bw=compact?116:170,bh=compact?29:42;
    const bx=r.x+r.w-bw-10,by=r.y+r.h-bh-9;
    const btn=A(this.add.rectangle(bx,by,bw,bh,0xf5bb11).setOrigin(0).setStrokeStyle(1,0xffdf58).setInteractive({useHandCursor:true}));
    A(this.add.text(bx+bw/2,by+bh/2,'FABRICAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'13px':'18px',fontStyle:'900',color:'#111'}).setOrigin(.5));
    btn.on('pointerdown',()=>this._craft());
  }

  _inventory(A,r,compact){
    const used={};
    for(const id of this.slots)used[id]=(used[id]||0)+1;
    const ids=Object.keys(GARAGE_ITEMS).filter(id=>{
      const item=GARAGE_ITEMS[id],part=item.kind==='part';
      if(this.filter==='parts'?!part:part)return false;
      if(qty(this.state,id)-(used[id]||0)<=0)return false;
      return this.slots.length<3&&stripRecipeCanAccept(this.slots,id);
    });

    const cols=4,gap=7;
    const cw=(r.w-gap*3)/4;
    const rows=Math.max(1,Math.min(2,Math.ceil(ids.length/cols)));
    const ch=Math.max(compact?54:84,(r.h-gap*(rows-1))/rows);

    ids.slice(0,8).forEach((id,i)=>{
      const x=r.x+(i%4)*(cw+gap),y=r.y+Math.floor(i/4)*(ch+gap);
      if(y+ch>r.y+r.h+2)return;
      const item=GARAGE_ITEMS[id];
      const g=A(this.add.graphics());
      g.fillStyle(0x071218);g.fillRoundedRect(x,y,cw,ch,9);
      g.lineStyle(1,item.tone||0x2dcfff,.66);g.strokeRoundedRect(x,y,cw,ch,9);
      g.fillStyle(item.tone||0x2dcfff,.055);g.fillEllipse(x+cw/2,y+ch*.42,cw*.76,ch*.66);

      const artSize=Math.min(cw*.67,ch*.61);
      this._itemArt(A,item,x+cw/2,y+ch*.40,artSize);
      A(this.add.text(x+cw/2,y+ch-(compact?9:12),item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'11px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:cw-8}}).setOrigin(.5,1));
      A(this.add.text(x+cw-6,y+5,`×${qty(this.state,id)-(used[id]||0)}`,{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#66e7ff'}).setOrigin(1,0));
      A(this.add.rectangle(x,y,cw,ch,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true})).on('pointerdown',()=>this._select(id));
    });

    if(!ids.length)A(this.add.text(r.x+r.w/2,r.y+r.h/2,this.slots.length===3?'RECETA COMPLETA':'SIN COMPONENTES COMPATIBLES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'10px':'13px',fontStyle:'900',color:'#627985'}).setOrigin(.5));
  }

  _itemArt(A,item,cx,cy,size){
    const rel=CRAFT_ASSETS[item?.id];
    if(!rel)return super._itemArt(A,item,cx,cy,size);

    const key=`craft_real_${item.id}`;
    if(this.textures.exists(key)){
      const img=A(this.add.image(cx,cy,key));
      img.setScale(Math.min(size/(img.width||1),size/(img.height||1)));
      return;
    }

    if(!this.failedAssets.has(key)&&!this.loadingAssets.has(key)){
      this.loadingAssets.add(key);
      const cleanup=()=>{this.loadingAssets.delete(key);this.load.off(`filecomplete-image-${key}`,ok);this.load.off('loaderror',err);};
      const ok=()=>{cleanup();if(this.root?.scene)this.render();};
      const err=f=>{if(f?.key!==key)return;cleanup();this.failedAssets.add(key);if(this.root?.scene)this.render();};
      this.load.once(`filecomplete-image-${key}`,ok);
      this.load.on('loaderror',err);
      this.load.image(key,`${CRAFT_BASE}${rel}?v=20260812-3`);
      if(!this.load.isLoading())this.load.start();
    }

    const g=A(this.add.graphics());
    g.fillStyle(item.tone||0x2dcfff,.12);g.fillCircle(cx,cy,size*.48);
    g.lineStyle(2,item.tone||0x2dcfff,.55);g.strokeCircle(cx,cy,size*.46);
    A(this.add.text(cx,cy,item.icon||'◆',{fontFamily:'system-ui',fontSize:`${Math.max(18,Math.round(size*.55))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5));
  }

  _equippedStrip(A,r,compact){
    const families=['engine','brakes','tires','suspension','transmission'];
    const eq=getEquippedForCar(this.state,this.car)||{};
    const g=A(this.add.graphics());
    g.fillStyle(0x03080b,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,9);
    g.lineStyle(1,0x223c47,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);
    const gap=6,cw=(r.w-gap*4)/5;

    families.forEach((f,i)=>{
      const x=r.x+i*(cw+gap),item=eq[f]?GARAGE_ITEMS[eq[f]]:null;
      const q=A(this.add.graphics());
      q.fillStyle(item?0x0a1b21:0x081116);q.fillRoundedRect(x+2,r.y+2,cw-4,r.h-4,7);
      q.lineStyle(1,item?(item.tone||0x2dcfff):0x2b424c,.72);q.strokeRoundedRect(x+2,r.y+2,cw-4,r.h-4,7);

      if(item){
        const artSize=Math.min(compact?42:58,r.h*.72,cw*.34);
        this._itemArt(A,item,x+9+artSize/2,r.y+r.h/2,artSize);
        const textX=x+artSize+18;
        const textW=cw-artSize-25;
        A(this.add.text(textX,r.y+(compact?10:13),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}));
        A(this.add.text(textX,r.y+r.h-(compact?9:12),`${item.name} · T${item.tier}`,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'700',color:'#66dfff',wordWrap:{width:textW}}).setOrigin(0,1));
      }else{
        A(this.add.text(x+cw/2,r.y+(compact?14:18),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
        A(this.add.text(x+cw/2,r.y+r.h-(compact?13:16),'SIN EQUIPAR',{fontFamily:'system-ui',fontSize:compact?'8px':'9px',fontStyle:'700',color:'#667a83'}).setOrigin(.5));
      }
    });
  }
}

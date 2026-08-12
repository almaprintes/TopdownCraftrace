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
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];

const WORKSHOP_CAR_LAYOUT={
  avenir_gripline:{x:0.49,y:0.55,scale:1.18},
  avenir_apex:{x:0.47,y:0.55,scale:1.13},
};

export class UpgradeShopScene extends PremiumWorkshopV2 {
  create(){
    this._workshopMissing=new Set();
    this.selectedFamily=this.selectedFamily||'engine';
    super.create();
  }

  render(){
    const {width:w,height:h}=this.scale;
    if(this.root)this.root.destroy(true);
    this.root=this.add.container();
    const A=o=>{this.root.add(o);return o;};
    const compact=h<520;

    this._bg(A,w,h);
    this._header(A,w,compact);

    const top=compact?50:63;
    const pad=compact?8:12;
    const gap=compact?8:12;
    const bottom=compact?58:76;
    const bodyH=h-top-bottom-pad;

    const leftW=Math.round(w*.34);
    const left={x:pad,y:top,w:leftW-pad,h:bodyH};
    const right={x:left.x+left.w+gap,y:top,w:w-(left.x+left.w+gap)-pad,h:bodyH};

    this._compactCarPanel(A,left,compact);
    this._forgePanel(A,right,compact);
    this._familyDock(A,{x:pad,y:h-bottom,w:w-pad*2,h:bottom-pad},compact);
  }

  _compactCarPanel(A,r,compact){
    this._panel(A,r,0x2bcfff);
    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const y=r.y+(compact?9:13);

    A(this.add.text(r.x+13,y,'COCHE ACTUAL',{fontFamily:'system-ui',fontSize:compact?'8px':'10px',fontStyle:'800',color:'#8da3ae'}));
    A(this.add.text(r.x+13,y+(compact?14:18),spec.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'17px':'23px',fontStyle:'900 italic',color:'#fff'}));
    A(this.add.text(r.x+r.w-12,y+1,String(spec.rarity||'COMÚN').toUpperCase(),{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#ffd05a'}).setOrigin(1,0));

    const imageH=Math.round(r.h*(compact?.43:.50));
    const carR={x:r.x+9,y:r.y+(compact?45:57),w:r.w-18,h:imageH};
    this._platform(A,carR);
    this._carImage(A,spec,carR);

    const statsR={x:r.x+13,y:carR.y+carR.h+7,w:r.w-26,h:r.y+r.h-carR.y-carR.h-14};
    this._miniStats(A,spec,statsR,compact);
  }

  _miniStats(A,spec,r,compact){
    const recipe=findStripRecipe(this.slots);
    const result=recipe?GARAGE_ITEMS[recipe.out]:null;
    const cur=garageDisplayStats(spec,this.state,this.car,null);
    const next=result?.kind==='part'?garageDisplayStats(spec,this.state,this.car,result.id):cur;
    A(this.add.text(r.x,r.y,'RENDIMIENTO',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'12px',fontStyle:'900',color:'#fff'}));
    const start=r.y+(compact?17:22);
    const row=Math.max(compact?24:31,(r.h-(compact?18:24))/4);
    STATS.forEach(([k,label],i)=>{
      const y=start+i*row,v=cur[k],nv=next[k],d=nv-v;
      A(this.add.text(r.x,y,label,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'800',color:'#d8e4e9'}));
      A(this.add.text(r.x+r.w,y,d?`${v}  +${d}`:`${v}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:d?'#64ef73':'#fff'}).setOrigin(1,0));
      const by=y+(compact?11:14),bh=compact?5:7;
      const g=A(this.add.graphics());
      g.fillStyle(0x14232a);g.fillRoundedRect(r.x,by,r.w,bh,bh/2);
      g.fillStyle(0x25c6ff);g.fillRoundedRect(r.x,by,r.w*v/99,bh,bh/2);
      if(nv>v){g.fillStyle(0x63ef70);g.fillRoundedRect(r.x+r.w*v/99,by,r.w*(nv-v)/99,bh,bh/2);}
    });
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
    const cleanup=()=>{this.loadingAssets.delete(cleanKey);this.load.off(`filecomplete-image-${cleanKey}`,ok);this.load.off('loaderror',err);};
    const ok=()=>{cleanup();if(this.root?.scene)this.render();};
    const err=f=>{if(f?.key!==cleanKey)return;cleanup();this._workshopMissing?.add(cleanKey);if(this.root?.scene)this.render();};
    this.load.once(`filecomplete-image-${cleanKey}`,ok);
    this.load.on('loaderror',err);
    this.load.image(cleanKey,`${WORKSHOP_BASE}${this.car}.webp?v=20260811-5`);
    if(!this.load.isLoading())this.load.start();
  }

  _forgePanel(A,r,compact){
    this._panel(A,r,0xffb72b);
    A(this.add.text(r.x+15,r.y+10,'FORJA CENTRAL',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'15px':'21px',fontStyle:'900 italic',color:'#fff'}));
    A(this.add.text(r.x+r.w-15,r.y+12,'3 COMPONENTES  →  1 PIEZA',{fontFamily:'system-ui',fontSize:compact?'7px':'10px',fontStyle:'900',color:'#ffd46b'}).setOrigin(1,0));

    const inner={x:r.x+12,y:r.y+(compact?34:43),w:r.w-24,h:r.h-(compact?42:53)};
    const inventoryH=compact?67:100;
    const forgeH=inner.h-inventoryH-(compact?7:10);
    const forge={x:inner.x,y:inner.y,w:inner.w,h:forgeH};
    const inv={x:inner.x,y:inner.y+forgeH+(compact?7:10),w:inner.w,h:inventoryH};

    this._forgeCore(A,forge,compact);
    this._inventoryShelf(A,inv,compact);
  }

  _forgeCore(A,r,compact){
    const g=A(this.add.graphics());
    g.fillGradientStyle(0x071116,0x0b1117,0x0c1015,0x05080b,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,12);
    g.lineStyle(1,0x2e4c57,.8);g.strokeRoundedRect(r.x,r.y,r.w,r.h,12);

    const cx=r.x+r.w*.54,cy=r.y+r.h*.46;
    const resultW=r.w*(compact?.38:.42),resultH=r.h*(compact?.58:.64);
    const result={x:cx-resultW/2,y:cy-resultH/2,w:resultW,h:resultH};

    const slotW=r.w*(compact?.20:.21),slotH=r.h*(compact?.28:.30);
    const s0={x:r.x+r.w*.035,y:r.y+r.h*.08,w:slotW,h:slotH};
    const s1={x:r.x+r.w*.035,y:r.y+r.h*.61,w:slotW,h:slotH};
    const s2={x:r.x+r.w*.765,y:r.y+r.h*.34,w:slotW,h:slotH};

    const line=A(this.add.graphics());
    line.lineStyle(compact?2:3,0x3bcfff,.35);
    [[s0,result],[s1,result],[s2,result]].forEach(([s,t])=>{
      line.lineBetween(s.x+s.w,s.y+s.h/2,t.x,t.y+t.h/2);
    });
    line.fillStyle(0x3bcfff,.12);line.fillCircle(cx,cy,Math.min(resultW,resultH)*.55);
    line.lineStyle(compact?2:3,0xc74cff,.28);line.strokeCircle(cx,cy,Math.min(resultW,resultH)*.54);

    this._forgeSlot(A,0,s0,compact);
    this._forgeSlot(A,1,s1,compact);
    this._forgeSlot(A,2,s2,compact);
    this._forgeResult(A,result,compact);
  }

  _forgeSlot(A,i,r,compact){
    const id=this.slots[i],item=id?GARAGE_ITEMS[id]:null;
    const g=A(this.add.graphics());
    g.fillStyle(item?0x0a1920:0x091116,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);
    g.lineStyle(item?2:1,item?(item.tone||0x2dcfff):0x334b55,item?1:.75);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);

    if(!item){
      A(this.add.text(r.x+r.w/2,r.y+r.h/2,`+ ${i+1}`,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'18px':'27px',fontStyle:'900',color:'#4b6570'}).setOrigin(.5));
      return;
    }

    const size=Math.min(r.w*.80,r.h*.66);
    this._itemArt(A,item,r.x+r.w/2,r.y+r.h*.43,size);
    A(this.add.text(r.x+r.w/2,r.y+r.h-(compact?7:10),item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'7px':'10px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:r.w-8}}).setOrigin(.5,1));
    A(this.add.text(r.x+r.w-5,r.y+4,`×${qty(this.state,id)}`,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#fff'}).setOrigin(1,0));
    A(this.add.rectangle(r.x,r.y,r.w,r.h,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true})).on('pointerdown',()=>{if(!this.busy){this.slots.splice(i,1);this.render();}});
  }

  _forgeResult(A,r,compact){
    const recipe=findStripRecipe(this.slots),item=recipe?GARAGE_ITEMS[recipe.out]:null;
    const g=A(this.add.graphics());
    g.fillGradientStyle(item?0x1b0926:0x0a1015,0x091016,item?0x280b34:0x081015,0x05090d,1);g.fillRoundedRect(r.x,r.y,r.w,r.h,13);
    g.lineStyle(item?2:1,item?0xd45aff:0x38505a,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,13);

    if(!item){
      A(this.add.text(r.x+r.w/2,r.y+r.h*.42,this.slots.length?'COMPLETA\nLA RECETA':'PIEZA\nRESULTANTE',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'13px':'20px',fontStyle:'900',color:'#6e828c',align:'center'}).setOrigin(.5));
      A(this.add.text(r.x+r.w/2,r.y+r.h*.70,`${this.slots.length}/3 COMPONENTES`,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#41545c'}).setOrigin(.5));
      return;
    }

    const artSize=Math.min(r.w*.82,r.h*.50);
    this._itemArt(A,item,r.x+r.w/2,r.y+r.h*.31,artSize);
    A(this.add.text(r.x+r.w/2,r.y+r.h*.57,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'14px':'21px',fontStyle:'900 italic',color:'#e260ff',align:'center',wordWrap:{width:r.w-12}}).setOrigin(.5));
    A(this.add.text(r.x+r.w/2,r.y+r.h*.68,`${FAMILY_LABEL[item.family]||'PIEZA'} · T${item.tier||1}`,{fontFamily:'system-ui',fontSize:compact?'7px':'10px',fontStyle:'900',color:'#dbc4e1'}).setOrigin(.5));

    const spec=CAR_SPECS[this.car]||CAR_SPECS.stock;
    const cur=garageDisplayStats(spec,this.state,this.car,null),next=garageDisplayStats(spec,this.state,this.car,item.id);
    const changes=STATS.filter(([k])=>next[k]!==cur[k]).map(([k,l])=>`${l} +${next[k]-cur[k]}`).slice(0,2).join(' · ');
    A(this.add.text(r.x+r.w/2,r.y+r.h*.77,changes||'LISTA PARA EQUIPAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'7px':'10px',fontStyle:'900',color:'#65ef70',align:'center'}).setOrigin(.5));

    const bw=r.w*.78,bh=compact?25:36,bx=r.x+(r.w-bw)/2,by=r.y+r.h-bh-(compact?6:9);
    const btn=A(this.add.rectangle(bx,by,bw,bh,0xf6bb13).setOrigin(0).setStrokeStyle(1,0xffdf59).setInteractive({useHandCursor:true}));
    A(this.add.text(bx+bw/2,by+bh/2,'FABRICAR',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'11px':'16px',fontStyle:'900',color:'#111'}).setOrigin(.5));
    btn.on('pointerdown',()=>this._craft());
  }

  _inventoryShelf(A,r,compact){
    const g=A(this.add.graphics());
    g.fillStyle(0x060d11,.98);g.fillRoundedRect(r.x,r.y,r.w,r.h,10);g.lineStyle(1,0x28404a,.85);g.strokeRoundedRect(r.x,r.y,r.w,r.h,10);

    const tabW=compact?70:94,tabH=compact?20:25;
    this._miniTab(A,r.x+7,r.y+6,tabW,tabH,'MATERIALES','materials',compact);
    this._miniTab(A,r.x+12+tabW,r.y+6,tabW,tabH,'PIEZAS','parts',compact);

    const used={};for(const id of this.slots)used[id]=(used[id]||0)+1;
    let ids=Object.keys(GARAGE_ITEMS).filter(id=>{
      const item=GARAGE_ITEMS[id],part=item.kind==='part';
      if(this.filter==='parts'?!part:part)return false;
      if(this.filter==='parts'&&this.selectedFamily&&item.family!==this.selectedFamily)return false;
      if(qty(this.state,id)-(used[id]||0)<=0)return false;
      return this.slots.length<3&&stripRecipeCanAccept(this.slots,id);
    });

    const areaX=r.x+compact?150:205;
    const startX=r.x+(compact?151:205);
    const areaW=r.x+r.w-startX-7;
    const gap=compact?5:7,cols=4,cw=(areaW-gap*(cols-1))/cols,ch=r.h-12;

    ids.slice(0,4).forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],x=startX+i*(cw+gap),y=r.y+6;
      const q=A(this.add.graphics());q.fillStyle(0x0a151a);q.fillRoundedRect(x,y,cw,ch,8);q.lineStyle(1,item.tone||0x2dcfff,.65);q.strokeRoundedRect(x,y,cw,ch,8);
      const size=Math.min(cw*.62,ch*.60);
      this._itemArt(A,item,x+cw*.38,y+ch*.48,size);
      A(this.add.text(x+cw-5,y+4,`×${qty(this.state,id)-(used[id]||0)}`,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'900',color:'#69e8ff'}).setOrigin(1,0));
      A(this.add.text(x+cw*.72,y+ch*.52,item.name.toUpperCase(),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:'#fff',align:'center',wordWrap:{width:cw*.48}}).setOrigin(.5));
      A(this.add.rectangle(x,y,cw,ch,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true})).on('pointerdown',()=>this._select(id));
    });

    if(!ids.length){
      A(this.add.text(startX+areaW/2,r.y+r.h/2,this.slots.length===3?'RECETA COMPLETA':'SIN COMPONENTES COMPATIBLES',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#5d737c'}).setOrigin(.5));
    }
  }

  _miniTab(A,x,y,w,h,label,key,compact){
    const on=this.filter===key;
    const q=A(this.add.rectangle(x,y,w,h,on?0x103444:0x0b151a).setOrigin(0).setStrokeStyle(1,on?0x36d7ff:0x31454d).setInteractive({useHandCursor:true}));
    A(this.add.text(x+w/2,y+h/2,label,{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'6px':'8px',fontStyle:'900',color:on?'#fff':'#7d929b'}).setOrigin(.5));
    q.on('pointerdown',()=>{if(!this.busy){this.filter=key;this.render();}});
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
      this.load.image(key,`${CRAFT_BASE}${rel}?v=20260812-forge1`);
      if(!this.load.isLoading())this.load.start();
    }

    const g=A(this.add.graphics());
    g.fillStyle(item.tone||0x2dcfff,.12);g.fillCircle(cx,cy,size*.48);
    g.lineStyle(2,item.tone||0x2dcfff,.55);g.strokeCircle(cx,cy,size*.46);
    A(this.add.text(cx,cy,item.icon||'◆',{fontFamily:'system-ui',fontSize:`${Math.max(18,Math.round(size*.55))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5));
  }

  _familyDock(A,r,compact){
    const eq=getEquippedForCar(this.state,this.car)||{};
    const g=A(this.add.graphics());g.fillStyle(0x03080b,.99);g.fillRoundedRect(r.x,r.y,r.w,r.h,9);g.lineStyle(1,0x243c46,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);
    const gap=5,cw=(r.w-gap*4)/5;

    FAMILIES.forEach((f,i)=>{
      const x=r.x+i*(cw+gap),item=eq[f]?GARAGE_ITEMS[eq[f]]:null,on=this.filter==='parts'&&this.selectedFamily===f;
      const q=A(this.add.rectangle(x+2,r.y+2,cw-4,r.h-4,on?0x123142:0x081116).setOrigin(0).setStrokeStyle(on?2:1,on?0x36d7ff:(item?.tone||0x2b424c),on?1:.7).setInteractive({useHandCursor:true}));
      A(this.add.text(x+cw/2,r.y+(compact?12:16),FAMILY_LABEL[f],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:on?'#8eeaff':'#fff'}).setOrigin(.5));
      A(this.add.text(x+cw/2,r.y+r.h-(compact?10:13),item?`EQUIPADA · T${item.tier}`:'SIN EQUIPAR',{fontFamily:'system-ui',fontSize:compact?'7px':'8px',fontStyle:'800',color:item?'#65dfff':'#637780'}).setOrigin(.5));
      q.on('pointerdown',()=>{if(this.busy)return;this.selectedFamily=f;this.filter='parts';this.render();});
    });
  }
}

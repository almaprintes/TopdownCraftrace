import { UpgradeShopScene as GuardedWorkshop } from './UpgradeWorkshopEvolutionGuardScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { qty, saveGarage, getEquippedForCar } from '../garage/garageStore.js';

const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];
const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};
const TIER_ROMAN={1:'I',2:'II',3:'III',4:'IV'};

export class UpgradeShopScene extends GuardedWorkshop {
  _header(A,w,compact){
    super._header(A,w,compact);
    const bw=compact?104:132,bh=compact?28:34;
    const bx=w-(compact?210:270),by=(compact?50:62)/2;
    const b=A(this.add.rectangle(bx,by,bw,bh,0x173b52,.98).setStrokeStyle(2,0x45dfff,.9).setInteractive({useHandCursor:true}));
    A(this.add.text(bx,by,'INVENTARIO',{fontFamily:UI,fontSize:compact?'8px':'11px',fontStyle:'800',color:'#ffffff'}).setOrigin(.5));
    b.on('pointerup',()=>{if(!this.busy)this._openFactoryInventoryModal('parts',0,0);});
  }

  _installFromInventory(id){
    const item=GARAGE_ITEMS[id];
    if(!item?.family||qty(this.state,id)<1)return false;
    if(!this.state.inventory||typeof this.state.inventory!=='object')this.state.inventory={};
    if(!this.state.equippedByCar||typeof this.state.equippedByCar!=='object')this.state.equippedByCar={};
    const current={...(getEquippedForCar(this.state,this.car)||{})};
    const oldId=current[item.family]||null;
    if(oldId===id)return true;
    this.state.inventory[id]=Math.max(0,qty(this.state,id)-1);
    if(oldId)this.state.inventory[oldId]=qty(this.state,oldId)+1;
    current[item.family]=id;
    this.state.equippedByCar[this.car]=current;
    saveGarage(this.state);
    return true;
  }

  _unequipFromInventory(id){
    const item=GARAGE_ITEMS[id];
    if(!item?.family)return false;
    if(!this.state.inventory||typeof this.state.inventory!=='object')this.state.inventory={};
    if(!this.state.equippedByCar||typeof this.state.equippedByCar!=='object')this.state.equippedByCar={};
    const current={...(getEquippedForCar(this.state,this.car)||{})};
    if(current[item.family]!==id)return false;
    this.state.inventory[id]=qty(this.state,id)+1;
    delete current[item.family];
    this.state.equippedByCar[this.car]=current;
    saveGarage(this.state);
    return true;
  }

  _openFactoryInventoryModal(tab='parts',page=0,tierFilter=0){
    try{this._factoryInventoryModal?.destroy?.(true);}catch{}
    const {width,height}=this.scale,compact=height<520,cx=width/2,cy=height/2;
    const panelW=Math.min(width-24,1120),panelH=Math.min(height-18,compact?456:560);
    const root=this.add.container(0,0).setDepth(35000);this._factoryInventoryModal=root;
    const A=o=>{root.add(o);return o;};
    const veil=A(this.add.rectangle(0,0,width,height,0x02070d,.92).setOrigin(0).setInteractive());
    A(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.998).setStrokeStyle(2,0x45dfff,.95));
    const titleY=cy-panelH/2+(compact?14:20);
    A(this.add.text(cx,titleY,'INVENTARIO',{fontFamily:UI,fontSize:compact?'24px':'31px',fontStyle:'800',color:'#fff'}).setOrigin(.5,0));
    const tabY=titleY+(compact?48:62),tabW=compact?150:190,tabH=compact?32:38,gap=10;
    const tabBtn=(x,label,key)=>{
      const active=tab===key;
      const b=A(this.add.rectangle(x,tabY,tabW,tabH,active?0x17405a:0x0d1a24,.99).setStrokeStyle(active?3:1,active?0x45dfff:0x355064,.95).setInteractive({useHandCursor:true}));
      A(this.add.text(x,tabY,label,{fontFamily:UI,fontSize:compact?'10px':'12px',fontStyle:'800',color:active?'#fff':'#9eb1c4'}).setOrigin(.5));
      b.on('pointerup',()=>this._openFactoryInventoryModal(key,0,0));
    };
    tabBtn(cx-tabW/2-gap/2,'MATERIALES','materials');tabBtn(cx+tabW/2+gap/2,'PIEZAS','parts');

    const equipped=getEquippedForCar(this.state,this.car)||{};
    if(tab==='parts'){
      const fw=compact?32:38,fh=compact?26:30,fg=6,total=fw*4+fg*3;
      const start=cx+panelW/2-total-(compact?38:48);
      [1,2,3,4].forEach((tier,i)=>{
        const active=Number(tierFilter)===tier,x=start+i*(fw+fg)+fw/2;
        const b=A(this.add.rectangle(x,tabY,fw,fh,active?TIER_COLOR[tier]:0x0d1a24,.99).setStrokeStyle(active?3:2,TIER_COLOR[tier],.95).setInteractive({useHandCursor:true}));
        A(this.add.text(x,tabY,TIER_ROMAN[tier],{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'800',color:active?'#07111f':'#fff'}).setOrigin(.5));
        b.on('pointerup',()=>this._openFactoryInventoryModal('parts',0,active?0:tier));
      });
    }

    const ids=(tab==='materials'?MATERIAL_IDS:PART_IDS
      .filter(id=>qty(this.state,id)>0||Object.values(equipped).includes(id))
      .filter(id=>!tierFilter||Number(GARAGE_ITEMS[id]?.tier||0)===Number(tierFilter))
      .sort((a,b)=>Number(GARAGE_ITEMS[a]?.tier||0)-Number(GARAGE_ITEMS[b]?.tier||0)||String(GARAGE_ITEMS[a]?.family||'').localeCompare(String(GARAGE_ITEMS[b]?.family||''),'es')||String(GARAGE_ITEMS[a]?.name||a).localeCompare(String(GARAGE_ITEMS[b]?.name||b),'es')));

    const cols=4,rows=2,perPage=8,pad=22,cg=compact?8:11;
    const gridW=panelW-pad*2,cardW=(gridW-cg*3)/4,gridY=tabY+tabH/2+(compact?16:22),bottom=compact?34:46;
    const availableH=cy+panelH/2-bottom-gridY,cardH=(availableH-cg)/2;
    const pages=Math.max(1,Math.ceil(ids.length/perPage));page=Math.max(0,Math.min(page,pages-1));
    const pageIds=ids.slice(page*perPage,page*perPage+perPage);

    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],q=qty(this.state,id),installed=Object.values(equipped).includes(id),tier=Number(item?.tier||0),accent=TIER_COLOR[tier]||0x355064;
      const col=i%4,row=Math.floor(i/4),x=cx-gridW/2+col*(cardW+cg),y=gridY+row*(cardH+cg);
      const card=A(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.99).setOrigin(0).setStrokeStyle(tab==='parts'?4:2,accent,1));
      if(tab==='parts'){
        A(this.add.rectangle(x+3,y+3,cardW-6,compact?7:9,accent,installed?.45:.95).setOrigin(0));
        A(this.add.rectangle(x+7,y+7,cardW-14,cardH-14,0x000000,0).setOrigin(0).setStrokeStyle(2,accent,installed?.28:.55));
      }
      const art={x:x+8,y:y+8,w:cardW-16,h:cardH*(tab==='parts'?.62:.60)};
      const before=root.length;
      const loaded=this._loadFullBleed(A,item,art,()=>this._openFactoryInventoryModal(tab,page,tierFilter));
      const added=root.list?.slice?.(before)||[];
      if(installed)for(const obj of added){if(obj?.setAlpha)obj.setAlpha(.42);if(obj?.setTint)obj.setTint(0x9ba6ad);}
      if(!loaded){const fallback=A(this.add.text(x+cardW/2,y+cardH*.38,item?.icon||'◆',{fontFamily:UI,fontSize:compact?'34px':'46px',color:'#fff'}).setOrigin(.5));if(installed)fallback.setAlpha(.42);}
      const nameY=y+cardH*.69;
      A(this.add.text(x+cardW/2,nameY,String(item?.name||id).toUpperCase(),{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:installed?'#87939d':'#d7e3ee',align:'center',wordWrap:{width:cardW-16}}).setOrigin(.5,0));
      if(tab==='materials'){
        A(this.add.text(x+cardW/2,y+cardH*.88,`×${q}`,{fontFamily:UI,fontSize:compact?'15px':'18px',fontStyle:'800',color:'#7ddcff'}).setOrigin(.5));
      }else{
        const action=installed?'DESINSTALAR':`INSTALAR · ×${q}`;
        A(this.add.text(x+cardW/2,y+cardH-(compact?8:11),action,{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:installed?'#87939d':'#7ddcff'}).setOrigin(.5,1));
        card.setInteractive({useHandCursor:true});
        if(installed){card.on('pointerup',()=>{if(this._unequipFromInventory(id)){this.render();this._openFactoryInventoryModal('parts',page,tierFilter);}});}
        else if(q>0){card.on('pointerup',()=>{if(this._installFromInventory(id)){this.render();this._openFactoryInventoryModal('parts',page,tierFilter);}});}
      }
    });

    if(tab==='parts'&&ids.length===0)A(this.add.text(cx,gridY+availableH/2,'NO HAY PIEZAS EN ESTA CATEGORÍA',{fontFamily:UI,fontSize:compact?'14px':'17px',fontStyle:'800',color:'#71879b'}).setOrigin(.5));
    const footerY=cy+panelH/2-(compact?17:23);
    if(pages>1){
      A(this.add.text(cx,footerY,`${page+1}/${pages}`,{fontFamily:UI,fontSize:compact?'10px':'12px',fontStyle:'800',color:'#a9bbca'}).setOrigin(.5));
      const prev=A(this.add.rectangle(cx-100,footerY,48,28,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.7).setInteractive({useHandCursor:true}));
      const next=A(this.add.rectangle(cx+100,footerY,48,28,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.7).setInteractive({useHandCursor:true}));
      A(this.add.text(cx-100,footerY,'‹',{fontFamily:UI,fontSize:'20px',fontStyle:'800',color:'#fff'}).setOrigin(.5));A(this.add.text(cx+100,footerY,'›',{fontFamily:UI,fontSize:'20px',fontStyle:'800',color:'#fff'}).setOrigin(.5));
      prev.on('pointerup',()=>this._openFactoryInventoryModal(tab,(page-1+pages)%pages,tierFilter));next.on('pointerup',()=>this._openFactoryInventoryModal(tab,(page+1)%pages,tierFilter));
    }
    const closeX=cx+panelW/2-(compact?22:28),closeY=cy-panelH/2+(compact?20:26);
    const close=A(this.add.circle(closeX,closeY,compact?17:21,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.8).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:UI,fontSize:compact?'19px':'23px',fontStyle:'800',color:'#fff'}).setOrigin(.5));
    close.on('pointerup',()=>{try{root.destroy(true);}catch{}if(this._factoryInventoryModal===root)this._factoryInventoryModal=null;this.render();});
    veil.on('pointerup',()=>{});
  }
}

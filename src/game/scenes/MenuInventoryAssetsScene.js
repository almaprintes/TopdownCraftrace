import { MenuScene as PreviousMenuScene } from './MenuAdminLogoRestoreScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage, getEquippedForCar } from '../garage/garageStore.js';
import { getLanguage, t } from '../i18n/index.js';

const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];
const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};
const TIER_SIGLA={1:'I',2:'II',3:'III',4:'IV'};
const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
const locale=()=>getLanguage()==='es'?'es-ES':'en-US';
const itemName=item=>t(`items.${item?.id}`)!==`items.${item?.id}`?t(`items.${item?.id}`):String(item?.name||item?.id||'');

export class MenuScene extends PreviousMenuScene {
  _installInventoryPart(garage,carId,id){
    const item=GARAGE_ITEMS[id];
    if(!item?.family||Number(garage.inventory?.[id]||0)<1)return false;
    if(!garage.inventory||typeof garage.inventory!=='object')garage.inventory={};
    if(!garage.equippedByCar||typeof garage.equippedByCar!=='object')garage.equippedByCar={};
    const current={...(getEquippedForCar(garage,carId)||{})};
    const oldId=current[item.family]||null;
    if(oldId===id)return true;
    garage.inventory[id]=Math.max(0,Number(garage.inventory[id]||0)-1);
    if(oldId)garage.inventory[oldId]=Number(garage.inventory[oldId]||0)+1;
    current[item.family]=id;
    garage.equippedByCar[carId]=current;
    saveGarage(garage);
    return true;
  }

  _unequipInventoryPart(garage,carId,id){
    const item=GARAGE_ITEMS[id];
    if(!item?.family)return false;
    if(!garage.inventory||typeof garage.inventory!=='object')garage.inventory={};
    if(!garage.equippedByCar||typeof garage.equippedByCar!=='object')garage.equippedByCar={};
    const current={...(getEquippedForCar(garage,carId)||{})};
    if(current[item.family]!==id)return false;
    garage.inventory[id]=Number(garage.inventory[id]||0)+1;
    delete current[item.family];
    garage.equippedByCar[carId]=current;
    saveGarage(garage);
    return true;
  }

  _openLobbyInventoryModal(tab='materials',page=0,tierFilter=0){
    try{this._lobbyInventoryModal?.destroy?.(true);}catch{}
    this._lobbyInventoryModal=null;

    const {width,height}=this.scale;
    const garage=loadGarage();
    const carId=(()=>{try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}})();
    const equipped=getEquippedForCar(garage,carId)||{};
    const compact=height<520;
    const panelW=Math.min(width-20,1120),panelH=Math.min(height-14,compact?468:560),cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(16000);
    this._ui?.add(root);
    this._lobbyInventoryModal=root;
    const A=o=>{root.add(o);return o;};

    const veil=A(this.add.rectangle(0,0,width,height,0x02070d,.90).setOrigin(0).setInteractive());
    A(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.998).setStrokeStyle(2,0x45dfff,.92));

    const titleY=cy-panelH/2+(compact?14:20);
    A(this.add.text(cx,titleY,t('inventory.title'),{fontFamily:UI,fontSize:compact?'25px':'31px',fontStyle:'bold',color:'#ffffff',resolution:2}).setOrigin(.5,0));

    const coinsY=titleY+(compact?34:42);
    const coinText=t('inventory.coins',{coins:Math.max(0,Math.floor(Number(garage.coins)||0)).toLocaleString(locale())});
    A(this.add.text(cx,coinsY,coinText,{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'bold',color:'#f0c65a',resolution:2}).setOrigin(.5,0));

    const tabY=coinsY+(compact?38:46),tabW=compact?170:205,tabH=compact?34:40,gap=12;
    const tabButton=(x,label,key)=>{
      const active=tab===key;
      const b=A(this.add.rectangle(x,tabY,tabW,tabH,active?0x17405a:0x0d1a24,.99).setStrokeStyle(active?3:1,active?0x45dfff:0x355064,active?1:.78).setInteractive({useHandCursor:true}));
      A(this.add.text(x,tabY,label,{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'bold',color:active?'#fff':'#a6b7c8',resolution:2}).setOrigin(.5));
      b.on('pointerup',()=>this._openLobbyInventoryModal(key,0,0));
    };
    tabButton(cx-tabW/2-gap/2,t('inventory.materials'),'materials');
    tabButton(cx+tabW/2+gap/2,t('inventory.parts'),'parts');

    if(tab==='parts'){
      const fw=compact?34:40,fh=compact?28:32,fg=6;
      const total=fw*4+fg*3;
      const startX=cx+panelW/2-total-(compact?42:52);
      [1,2,3,4].forEach((tier,i)=>{
        const active=Number(tierFilter)===tier;
        const x=startX+i*(fw+fg)+fw/2;
        const b=A(this.add.rectangle(x,tabY,fw,fh,active?TIER_COLOR[tier]:0x0d1a24,.99).setStrokeStyle(active?3:2,TIER_COLOR[tier],active?1:.85).setInteractive({useHandCursor:true}));
        A(this.add.text(x,tabY,TIER_SIGLA[tier],{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:active?'#07111f':'#ffffff',resolution:2}).setOrigin(.5));
        b.on('pointerup',()=>this._openLobbyInventoryModal('parts',0,active?0:tier));
      });
    }

    const ids=tab==='materials'
      ? MATERIAL_IDS
      : PART_IDS
          .filter(id=>Number(garage.inventory?.[id]||0)>0||Object.values(equipped).includes(id))
          .filter(id=>!tierFilter||Number(GARAGE_ITEMS[id]?.tier||0)===Number(tierFilter))
          .sort((a,b)=>{
            const A=GARAGE_ITEMS[a]||{},B=GARAGE_ITEMS[b]||{};
            const tierDiff=Number(A.tier||0)-Number(B.tier||0);
            if(tierDiff)return tierDiff;
            const familyDiff=String(A.family||'').localeCompare(String(B.family||''),getLanguage());
            if(familyDiff)return familyDiff;
            return itemName(A).localeCompare(itemName(B),getLanguage());
          });

    const cols=4,rows=2,perPage=cols*rows,cardGap=compact?9:12,pad=24;
    const gridW=panelW-pad*2,cardW=(gridW-cardGap*(cols-1))/cols;
    const gridY=tabY+tabH/2+(compact?15:20),bottomReserve=compact?40:52;
    const availableH=cy+panelH/2-bottomReserve-gridY,cardH=(availableH-cardGap)/rows;
    const pages=Math.max(1,Math.ceil(ids.length/perPage));
    page=Math.max(0,Math.min(page,pages-1));
    const pageIds=ids.slice(page*perPage,page*perPage+perPage);

    if(tab==='parts'&&ids.length===0){
      const msg=tierFilter?t('inventory.noTierParts',{tier:TIER_SIGLA[tierFilter]}):t('inventory.noParts');
      A(this.add.text(cx,gridY+availableH/2,msg,{fontFamily:UI,fontSize:compact?'15px':'18px',fontStyle:'bold',color:'#71879b',align:'center',lineSpacing:8,resolution:2}).setOrigin(.5));
    }

    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{};
      const q=Math.max(0,Number(garage.inventory?.[id])||0);
      const installed=Object.values(equipped).includes(id);
      const col=i%cols,row=Math.floor(i/cols),x=cx-gridW/2+col*(cardW+cardGap),y=gridY+row*(cardH+cardGap);
      const tier=Number(item.tier||0),accent=TIER_COLOR[tier]||0x355064;

      const card=A(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.99).setOrigin(0));
      card.setStrokeStyle(tab==='parts'?4:2,accent,1);
      if(tab==='parts'){
        A(this.add.rectangle(x+3,y+3,cardW-6,compact?7:9,accent,installed?.45:.95).setOrigin(0));
        A(this.add.rectangle(x+7,y+7,cardW-14,cardH-14,0x000000,0).setOrigin(0).setStrokeStyle(2,accent,installed?.28:.55));
      }

      const key=tab==='materials'?`event-material:${id}`:`inventory-part:${id}`;
      if(this.textures?.exists?.(key)){
        const imgY=y+cardH*.40;
        const img=A(this.add.image(x+cardW/2,imgY,key).setOrigin(.5));
        const maxW=cardW*(tab==='materials'?.90:.94),maxH=cardH*(tab==='materials'?.58:.61);
        const scale=Math.min(maxW/Math.max(1,img.width),maxH/Math.max(1,img.height));
        img.setScale(scale);
        if(installed)img.setAlpha(.42).setTint(0x9ba6ad);
      }

      if(tab==='materials'){
        const nameY=y+cardH*.72;
        A(this.add.text(x+cardW/2,nameY,itemName({...item,id}).toUpperCase(),{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#d7e3ee',align:'center',wordWrap:{width:cardW-18},resolution:2}).setOrigin(.5,0));
        const qtyY=y+cardH*.87;
        A(this.add.text(x+cardW/2,qtyY,`×${q}`,{fontFamily:UI,fontSize:compact?'16px':'19px',fontStyle:'bold',color:'#7ddcff',resolution:2}).setOrigin(.5,.5));
      }else{
        const nameY=y+cardH*.69;
        A(this.add.text(x+cardW/2,nameY,itemName({...item,id}).toUpperCase(),{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:installed?'#87939d':'#d4e0eb',align:'center',wordWrap:{width:cardW-16},resolution:2}).setOrigin(.5,0));
        const actionY=y+cardH-(compact?10:13);
        const actionText=installed?t('inventory.uninstall'):t('inventory.install',{qty:q});
        A(this.add.text(x+cardW/2,actionY,actionText,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:installed?'#87939d':'#7ddcff',resolution:2}).setOrigin(.5,1));
        if(installed){
          card.setInteractive({useHandCursor:true});
          card.on('pointerup',()=>{if(this._unequipInventoryPart(garage,carId,id))this._openLobbyInventoryModal('parts',page,tierFilter);});
        }else if(q>0){
          card.setInteractive({useHandCursor:true});
          card.on('pointerup',()=>{if(this._installInventoryPart(garage,carId,id))this._openLobbyInventoryModal('parts',page,tierFilter);});
        }
      }
    });

    const footerY=cy+panelH/2-(compact?20:26);
    if(pages>1){
      A(this.add.text(cx,footerY,`${page+1}/${pages}`,{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'bold',color:'#a9bbca',resolution:2}).setOrigin(.5));
      const prev=A(this.add.rectangle(cx-110,footerY,54,30,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.65).setInteractive({useHandCursor:true}));
      const next=A(this.add.rectangle(cx+110,footerY,54,30,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.65).setInteractive({useHandCursor:true}));
      A(this.add.text(cx-110,footerY,'‹',{fontFamily:UI,fontSize:'22px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
      A(this.add.text(cx+110,footerY,'›',{fontFamily:UI,fontSize:'22px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
      prev.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page-1+pages)%pages,tierFilter));
      next.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page+1)%pages,tierFilter));
    }

    const closeX=cx+panelW/2-(compact?24:30),closeY=cy-panelH/2+(compact?22:28);
    const closeBg=A(this.add.circle(closeX,closeY,compact?18:22,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.75).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:UI,fontSize:compact?'20px':'24px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
    const close=()=>{try{root.destroy(true);}catch{}if(this._lobbyInventoryModal===root)this._lobbyInventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',()=>{});
  }
}

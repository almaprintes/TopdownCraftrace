import { MenuScene as PreviousMenuScene } from './MenuAdminLogoRestoreScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, getEquippedForCar } from '../garage/garageStore.js';

const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];
const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};

export class MenuScene extends PreviousMenuScene {
  _openLobbyInventoryModal(tab='materials',page=0){
    try{this._lobbyInventoryModal?.destroy?.(true);}catch{}
    this._lobbyInventoryModal=null;

    const {width,height}=this.scale;
    const garage=loadGarage();
    const carId=(()=>{try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}})();
    const equipped=getEquippedForCar(garage,carId)||{};
    const compact=height<520;
    const panelW=Math.min(width-28,1000),panelH=Math.min(height-20,compact?440:520),cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(16000);
    this._ui?.add(root);
    this._lobbyInventoryModal=root;
    const A=o=>{root.add(o);return o;};

    const veil=A(this.add.rectangle(0,0,width,height,0x02070d,.88).setOrigin(0).setInteractive());
    A(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.998).setStrokeStyle(2,0x45dfff,.8));
    A(this.add.text(cx,cy-panelH/2+(compact?12:18),'INVENTARIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'23px':'28px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    A(this.add.text(cx,cy-panelH/2+(compact?42:55),`◈ ${Math.max(0,Math.floor(Number(garage.coins)||0))} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'11px':'14px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    const tabY=cy-panelH/2+(compact?67:88),tabW=compact?150:180,tabH=compact?30:35,gap=10;
    const tabButton=(x,label,key)=>{
      const active=tab===key;
      const b=A(this.add.rectangle(x,tabY,tabW,tabH,active?0x17405a:0x0d1a24,.98).setStrokeStyle(active?2:1,active?0x45dfff:0x355064,active?1:.75).setInteractive({useHandCursor:true}));
      A(this.add.text(x,tabY,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'9px':'11px',fontStyle:'bold',color:active?'#fff':'#91a6b8'}).setOrigin(.5));
      b.on('pointerup',()=>this._openLobbyInventoryModal(key,0));
    };
    tabButton(cx-tabW/2-gap/2,'MATERIALES','materials');
    tabButton(cx+tabW/2+gap/2,'PIEZAS','parts');

    const ids=tab==='materials'
      ? MATERIAL_IDS
      : PART_IDS.filter(id=>Number(garage.inventory?.[id]||0)>0||Object.values(equipped).includes(id));
    const cols=4,rows=2,perPage=cols*rows,cardGap=compact?8:10,pad=22;
    const gridW=panelW-pad*2,cardW=(gridW-cardGap*(cols-1))/cols;
    const gridY=tabY+tabH/2+(compact?13:18),bottomReserve=compact?58:72;
    const availableH=cy+panelH/2-bottomReserve-gridY,cardH=(availableH-cardGap)/rows;
    const pages=Math.max(1,Math.ceil(ids.length/perPage));
    page=Math.max(0,Math.min(page,pages-1));
    const pageIds=ids.slice(page*perPage,page*perPage+perPage);

    if(tab==='parts'&&ids.length===0){
      A(this.add.text(cx,gridY+availableH/2,'AÚN NO TIENES PIEZAS\n\nFabrícalas en FACTORY y aparecerán aquí.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'13px':'16px',fontStyle:'bold',color:'#71879b',align:'center',lineSpacing:6}).setOrigin(.5));
    }

    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{},q=Math.max(0,Number(garage.inventory?.[id])||0),installed=Object.values(equipped).includes(id);
      const col=i%cols,row=Math.floor(i/cols),x=cx-gridW/2+col*(cardW+cardGap),y=gridY+row*(cardH+cardGap);
      const accent=installed?0x62ffb2:(TIER_COLOR[item.tier]||0x355064);
      A(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(installed?2:1,accent,installed?1:.85));

      const key=tab==='materials'?`event-material:${id}`:`inventory-part:${id}`;
      if(this.textures?.exists?.(key)){
        const img=A(this.add.image(x+cardW/2,y+cardH*.40,key).setOrigin(.5));
        const maxW=cardW*(tab==='materials'?.70:.90),maxH=cardH*(tab==='materials'?.50:.64);
        const scale=Math.min(maxW/Math.max(1,img.width),maxH/Math.max(1,img.height));
        img.setScale(scale);
      }

      A(this.add.text(x+cardW/2,y+cardH*.71,String(item.name||id).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'7px':'9px',fontStyle:'bold',color:'#b8c8d7',align:'center',wordWrap:{width:cardW-12}}).setOrigin(.5,0));
      if(tab==='materials'){
        A(this.add.text(x+cardW/2,y+cardH-(compact?14:18),`×${q}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'15px':'19px',fontStyle:'bold',color:'#62ffb2'}).setOrigin(.5,1));
      }else{
        A(this.add.text(x+cardW/2,y+cardH-(compact?14:18),installed?'INSTALADA':`EN INVENTARIO ×${q}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'7px':'9px',fontStyle:'bold',color:installed?'#62ffb2':'#9fd2ff'}).setOrigin(.5,1));
      }
    });

    const footerY=cy+panelH/2-(compact?25:31);
    if(pages>1){
      A(this.add.text(cx,footerY,`${page+1}/${pages}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#8fa4b6'}).setOrigin(.5));
      const prev=A(this.add.rectangle(cx-105,footerY,50,28,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
      const next=A(this.add.rectangle(cx+105,footerY,50,28,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
      A(this.add.text(cx-105,footerY,'‹',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
      A(this.add.text(cx+105,footerY,'›',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
      prev.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page-1+pages)%pages));
      next.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page+1)%pages));
    }

    const closeX=cx+panelW/2-(compact?23:28),closeY=cy-panelH/2+(compact?22:27);
    const closeBg=A(this.add.circle(closeX,closeY,compact?17:20,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
    const close=()=>{try{root.destroy(true);}catch{}if(this._lobbyInventoryModal===root)this._lobbyInventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',()=>{});
  }
}

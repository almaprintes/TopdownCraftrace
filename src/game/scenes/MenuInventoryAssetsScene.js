import { MenuScene as PreviousMenuScene } from './MenuAdminLogoRestoreScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, getEquippedForCar } from '../garage/garageStore.js';

const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];
const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};
const TIER_LABEL={1:'STREET',2:'SPORT',3:'RACING',4:'PROTOTYPE'};
const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

export class MenuScene extends PreviousMenuScene {
  _openLobbyInventoryModal(tab='materials',page=0){
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
    A(this.add.text(cx,titleY,'INVENTARIO',{fontFamily:UI,fontSize:compact?'25px':'31px',fontStyle:'bold',color:'#ffffff',resolution:2}).setOrigin(.5,0));

    // Coins live on their own line: never overlap the tabs.
    const coinsY=titleY+(compact?34:42);
    A(this.add.text(cx,coinsY,`◈ ${Math.max(0,Math.floor(Number(garage.coins)||0)).toLocaleString('es-ES')} MONEDAS`,{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'bold',color:'#f0c65a',resolution:2}).setOrigin(.5,0));

    const tabY=coinsY+(compact?38:46),tabW=compact?170:205,tabH=compact?34:40,gap=12;
    const tabButton=(x,label,key)=>{
      const active=tab===key;
      const b=A(this.add.rectangle(x,tabY,tabW,tabH,active?0x17405a:0x0d1a24,.99).setStrokeStyle(active?3:1,active?0x45dfff:0x355064,active?1:.78).setInteractive({useHandCursor:true}));
      A(this.add.text(x,tabY,label,{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'bold',color:active?'#fff':'#a6b7c8',resolution:2}).setOrigin(.5));
      b.on('pointerup',()=>this._openLobbyInventoryModal(key,0));
    };
    tabButton(cx-tabW/2-gap/2,'MATERIALES','materials');
    tabButton(cx+tabW/2+gap/2,'PIEZAS','parts');

    const ids=tab==='materials'
      ? MATERIAL_IDS
      : PART_IDS.filter(id=>Number(garage.inventory?.[id]||0)>0||Object.values(equipped).includes(id));

    const cols=4,rows=2,perPage=cols*rows,cardGap=compact?9:12,pad=24;
    const gridW=panelW-pad*2,cardW=(gridW-cardGap*(cols-1))/cols;
    const gridY=tabY+tabH/2+(compact?15:20),bottomReserve=compact?40:52;
    const availableH=cy+panelH/2-bottomReserve-gridY,cardH=(availableH-cardGap)/rows;
    const pages=Math.max(1,Math.ceil(ids.length/perPage));
    page=Math.max(0,Math.min(page,pages-1));
    const pageIds=ids.slice(page*perPage,page*perPage+perPage);

    if(tab==='parts'&&ids.length===0){
      A(this.add.text(cx,gridY+availableH/2,'AÚN NO TIENES PIEZAS\n\nFabrícalas en FACTORY y aparecerán aquí.',{fontFamily:UI,fontSize:compact?'15px':'18px',fontStyle:'bold',color:'#71879b',align:'center',lineSpacing:8,resolution:2}).setOrigin(.5));
    }

    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{};
      const q=Math.max(0,Number(garage.inventory?.[id])||0);
      const installed=Object.values(equipped).includes(id);
      const col=i%cols,row=Math.floor(i/cols),x=cx-gridW/2+col*(cardW+cardGap),y=gridY+row*(cardH+cardGap);
      const tier=Number(item.tier||0),accent=TIER_COLOR[tier]||0x355064;

      // Strong category identity: double frame + colored header strip.
      const card=A(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.99).setOrigin(0));
      card.setStrokeStyle(tab==='parts'?(installed?5:4):2,installed?0x62ffb2:accent,1);
      if(tab==='parts'){
        A(this.add.rectangle(x+3,y+3,cardW-6,compact?7:9,accent,.95).setOrigin(0));
        A(this.add.rectangle(x+7,y+7,cardW-14,cardH-14,0x000000,0).setOrigin(0).setStrokeStyle(1,accent,.45));
        A(this.add.text(x+10,y+(compact?13:16),TIER_LABEL[tier]||'',{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'bold',color:'#ffffff',backgroundColor:'#07111f',padding:{x:5,y:2},resolution:2}).setOrigin(0,0));
      }

      const key=tab==='materials'?`event-material:${id}`:`inventory-part:${id}`;
      if(this.textures?.exists?.(key)){
        const imgY=tab==='parts'?y+cardH*.42:y+cardH*.43;
        const img=A(this.add.image(x+cardW/2,imgY,key).setOrigin(.5));
        // Use the space aggressively while keeping the asset whole.
        const maxW=cardW*(tab==='materials'?.90:.94),maxH=cardH*(tab==='materials'?.61:.66);
        const scale=Math.min(maxW/Math.max(1,img.width),maxH/Math.max(1,img.height));
        img.setScale(scale);
      }

      const nameY=y+cardH*(tab==='materials'?.73:.72);
      A(this.add.text(x+cardW/2,nameY,String(item.name||id).toUpperCase(),{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#d4e0eb',align:'center',wordWrap:{width:cardW-16},resolution:2}).setOrigin(.5,0));

      if(tab==='materials'){
        A(this.add.text(x+cardW/2,y+cardH-(compact?10:13),`×${q}`,{fontFamily:UI,fontSize:compact?'20px':'24px',fontStyle:'bold',color:'#62ffb2',resolution:2}).setOrigin(.5,1));
      }else{
        const status=installed?'INSTALADA':`EN INVENTARIO ×${q}`;
        A(this.add.text(x+cardW/2,y+cardH-(compact?9:12),status,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:installed?'#62ffb2':'#c9e6ff',resolution:2}).setOrigin(.5,1));
      }
    });

    const footerY=cy+panelH/2-(compact?20:26);
    if(pages>1){
      A(this.add.text(cx,footerY,`${page+1}/${pages}`,{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'bold',color:'#a9bbca',resolution:2}).setOrigin(.5));
      const prev=A(this.add.rectangle(cx-110,footerY,54,30,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.65).setInteractive({useHandCursor:true}));
      const next=A(this.add.rectangle(cx+110,footerY,54,30,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.65).setInteractive({useHandCursor:true}));
      A(this.add.text(cx-110,footerY,'‹',{fontFamily:UI,fontSize:'22px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
      A(this.add.text(cx+110,footerY,'›',{fontFamily:UI,fontSize:'22px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
      prev.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page-1+pages)%pages));
      next.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page+1)%pages));
    }

    const closeX=cx+panelW/2-(compact?24:30),closeY=cy-panelH/2+(compact?22:28);
    const closeBg=A(this.add.circle(closeX,closeY,compact?18:22,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.75).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:UI,fontSize:compact?'20px':'24px',fontStyle:'bold',color:'#fff',resolution:2}).setOrigin(.5));
    const close=()=>{try{root.destroy(true);}catch{}if(this._lobbyInventoryModal===root)this._lobbyInventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',()=>{});
  }
}
